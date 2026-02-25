import { collection, query, where, getDocs, doc, getDoc, getDocFromServer, updateDoc, deleteDoc, serverTimestamp, setDoc, orderBy } from "firebase/firestore";
import { getStorage, ref, deleteObject, uploadBytes, getDownloadURL } from "firebase/storage";
import { app, authModular as auth, dbModular } from './firebase';
import { Kost, DatabaseProduct, ImageUrlObject, VideoUrlObject } from './types';

// Use the pre-configured modular DB instance
const db = dbModular;
const storage = getStorage(app);

// Interface untuk data list admin
export interface BasicPropertyInfo extends Partial<Kost> {
    id: string;
    namaKost: string;
    status: 'draft' | 'published';
    address: string;
    imageUrls: string[];
    videoUrls?: string[];
    instagramUrl?: string;
    tiktokUrl?: string;
}



// Check if user is admin
export async function checkIfUserIsAdmin(uid: string): Promise<boolean> {
    if (!uid) return false;
    try {
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDocFromServer(userDocRef);
        if (userDocSnap.exists()) {
            return userDocSnap.data().isAdmin === true;
        }
        return false;
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// Helper: Delete file from Storage using URL parsing
async function deleteFileFromStorage(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    try {
        const urlObj = new URL(fileUrl);
        // Path di Storage adalah bagian setelah /o/ dan perlu di-decode
        const pathInStorage = decodeURIComponent(urlObj.pathname.split('/o/')[1]);

        const fileRef = ref(storage, pathInStorage);
        await deleteObject(fileRef);
        console.log(`Frontend: File Storage deleted: ${pathInStorage}`);
    } catch (error: any) {
        // Objek mungkin sudah tidak ada, ini adalah error umum dan tidak fatal jika delete sudah terjadi
        if (error.code === 'storage/object-not-found') {
            console.warn(`Frontend: File Storage already deleted or not found: ${fileUrl}`);
        } else if (error.code === 'storage/unauthorized') {
            console.warn(`Frontend: Permission denied deleting file ${fileUrl}. Skipping cleanup.`);
        } else {
            console.warn(`Frontend: Gagal menghapus file ${fileUrl} dari storage (non-fatal):`, error);
            // We do NOT throw here anymore to prevent blocking the main operation (DB update/delete)
        }
    }
}

// Helper untuk membersihkan URL Firebase Storage — hanya hapus token, pertahankan ?alt=media
// PENTING: ?alt=media wajib ada agar URL mengembalikan konten file (bukan JSON metadata)
function normalizeFirebaseStorageUrlFrontend(url: string): string {
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.delete('token'); // Hapus token saja, pertahankan alt=media
        // Pastikan ?alt=media ada (selalu dibutuhkan untuk akses file)
        if (!urlObj.searchParams.has('alt')) {
            urlObj.searchParams.set('alt', 'media');
        }
        return urlObj.toString();
    } catch (e) {
        console.warn("Frontend: Gagal menormalisasi URL:", url, e);
        return url;
    }
}

// Internal Helper: Upload file to specific structure
async function uploadFileAndGetOriginalURL(file: File, entityId: string, fileType: 'images' | 'videos', entityCategory: 'properties' | 'databases' = 'properties', ownerUid?: string): Promise<string> {
    const user = auth.currentUser;
    if (user) {
        await user.getIdToken(true); // Force refresh token to ensure up-to-date claims
    } else {
        console.error("FRONTEND DEBUG: Tidak ada user login saat upload.");
        throw new Error("Unauthorized");
    }

    // Use provided ownerUid or fallback to current user.uid
    const targetUid = ownerUid || user.uid;
    const pathPrefix = (entityCategory === 'properties') ? `properties/${targetUid}/${entityId}/${fileType}/original` : `databases/${targetUid}/${entityId}/${fileType}/original`;

    // Sanitasi nama file
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${Date.now()}_${sanitizedFileName}`;

    const storageRef = ref(storage, `${pathPrefix}/${fileName}`);

    // Fallback Content Type Logic
    let contentType = file.type;
    if (!contentType) {
        const ext = sanitizedFileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg'].includes(ext || '')) contentType = 'image/jpeg';
        else if (ext === 'png') contentType = 'image/png';
        else if (ext === 'webp') contentType = 'image/webp';
        else contentType = 'application/octet-stream';
    }

    const metadata = { contentType: contentType };

    console.log(`DEBUG FRONTEND: Mengupload ${fileType} ke path:`, `${pathPrefix}/${fileName}`);
    console.log(`DEBUG FRONTEND: Bucket yang digunakan: ${storageRef.bucket}`);
    console.log("FRONTEND DEBUG: Uploading with metadata:", metadata);

    try {
        console.log("FRONTEND DEBUG: Forcing token refresh before uploadBytes...");
        const freshToken = await user.getIdToken(true);
        console.log("FRONTEND DEBUG: Token refreshed. UID:", user.uid, "| Admin claim:", (await user.getIdTokenResult()).claims.admin);

        // Upload file ke Storage
        const snapshot = await uploadBytes(storageRef, file, metadata);
        console.log("FRONTEND DEBUG: uploadBytes sukses. Membuat URL dari ref...");

        // Construct URL langsung dari snapshot.ref — bypass getDownloadURL yang butuh read permission
        // URL ini bekerja dengan rules: allow read: if true;
        const bucket = snapshot.ref.bucket;
        const encodedPath = encodeURIComponent(snapshot.ref.fullPath);
        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
        console.log(`DEBUG FRONTEND: Upload sukses, URL original: ${downloadUrl}`);
        return normalizeFirebaseStorageUrlFrontend(downloadUrl);
    } catch (error: any) {
        console.error(`Frontend: Upload failed to ${pathPrefix}/${fileName}`, error);
        console.error(`Frontend: Error code: ${error.code}, message: ${error.message}`);
        if (error.code === 'storage/unauthorized') {
            throw new Error(`Izin ditolak saat mengupload ke ${pathPrefix}. Pastikan Anda memiliki akses. (bucket: ${storageRef.bucket})`);
        }
        throw error;
    }
}


// --- FUNGSI HELPER BARU UNTUK UPLOAD COVER DATABASE ---
// Mengupload file ke path databases/{uid}/{databaseId}/cover/original/
async function uploadCoverFileAndGetOriginalURL(file: File, databaseId: string, ownerUid?: string): Promise<string> {
    const user = auth.currentUser;
    if (user) {
        await user.getIdToken(true);
    } else {
        console.error("FRONTEND DEBUG: Tidak ada user login saat upload cover.");
        throw new Error("Unauthorized");
    }

    const targetUid = ownerUid || user.uid;
    const sanitizedFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const folderName = `databases/${targetUid}/${databaseId}/cover/original`;
    const storageRef = ref(storage, `${folderName}/${sanitizedFileName}`);

    // Fallback Content Type
    let contentType = file.type;
    if (!contentType) {
        const ext = sanitizedFileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg'].includes(ext || '')) contentType = 'image/jpeg';
        else if (ext === 'png') contentType = 'image/png';
        else if (ext === 'webp') contentType = 'image/webp';
        else contentType = 'application/octet-stream';
    }

    const metadata = {
        contentType: contentType
        // Removed customMetadata to avoid potential security rule conflicts
    };

    console.log("DEBUG FRONTEND: Mengupload cover database ke path:", `${folderName}/${sanitizedFileName}`);
    console.log("FRONTEND DEBUG: Cover metadata (simplified):", metadata);

    try {
        console.log("FRONTEND DEBUG: Forcing token refresh before uploadBytes (cover)...");
        await user.getIdToken(true);
        await uploadBytes(storageRef, file, metadata);
        return normalizeFirebaseStorageUrlFrontend(await getDownloadURL(storageRef));
    } catch (error: any) {
        console.error(`Frontend: Upload cover failed to ${folderName}`, error);
        throw error;
    }
}
// --- AKHIR FUNGSI HELPER BARU ---

// Helper: Upload Document (Excel/PDF)
async function uploadDocument(file: File, dbId: string, ownerUid?: string): Promise<string> {
    const user = auth.currentUser;
    if (user) {
        await user.getIdToken(true);
    } else {
        console.error("FRONTEND DEBUG: Tidak ada user login saat upload doc.");
        throw new Error("Unauthorized");
    }

    const targetUid = ownerUid || user.uid;
    const sanitizedFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const path = `databases/${targetUid}/${dbId}/${sanitizedFileName}`;
    const storageRef = ref(storage, path);

    let contentType = file.type;
    if (!contentType) {
        if (sanitizedFileName.endsWith('.pdf')) contentType = 'application/pdf';
        else if (sanitizedFileName.match(/\.xls(x)?$/)) contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else contentType = 'application/octet-stream';
    }

    const metadata = {
        contentType: contentType
    };

    try {
        console.log("FRONTEND DEBUG: Forcing token refresh before uploadBytes (doc)...");
        await user.getIdToken(true);
        await uploadBytes(storageRef, file, metadata);
        return await getDownloadURL(storageRef);
    } catch (error: any) {
        console.error(`Frontend: Upload doc failed to ${path}`, error);
        throw error;
    }
}

// Public Helper
export async function uploadFileAndGetURL(file: File, folderName: string): Promise<string> {
    const sanitizedFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `${folderName}/${sanitizedFileName}`);
    const metadata = { contentType: file.type || 'application/octet-stream' };
    const snapshot = await uploadBytes(storageRef, file, metadata);
    return await getDownloadURL(snapshot.ref);
}

// --- PROPERTY FUNCTIONS ---

export async function getAdminProperties(): Promise<BasicPropertyInfo[]> {
    const user = auth.currentUser;
    if (!user) throw new Error("Tidak ada admin yang login.");

    try {
        const isAdmin = await checkIfUserIsAdmin(user.uid);
        const propertiesRef = collection(db, "properties");

        let q;
        if (isAdmin) {
            q = query(propertiesRef);
        } else {
            q = query(propertiesRef, where("ownerUid", "==", user.uid));
        }

        const querySnapshot = await getDocs(q);
        const properties: BasicPropertyInfo[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data() as any;
            const rawImages = data.imageUrls || [];

            // PRIORITIZATION LOGIC: WebP > Original > Thumbnail (agar gambar tidak burik/blur)
            const images: string[] = rawImages.map((img: any) =>
                typeof img === 'string' ? img : (img.webp || img.original || img.thumbnail || '')
            ).filter((url: string) => url !== '');

            const rawVideos = data.videoUrls || [];
            const videos: string[] = rawVideos.map((vid: any) =>
                typeof vid === 'string' ? vid : (vid.original || '')
            ).filter((url: string) => url !== '');

            properties.push({
                id: doc.id,
                ...data,
                namaKost: data.title || data.namaKost,
                status: data.status,
                address: data.address,
                imageUrls: images,
                videoUrls: videos,
                instagramUrl: data.instagramUrl || '',
                tiktokUrl: data.tiktokUrl || '',
                price: data.price || 0,
                city: data.city || '',
                type: data.type || 'Campur'
            } as BasicPropertyInfo);
        });
        return properties;
    } catch (error) {
        console.error("Error mendapatkan properti admin:", error);
        throw error;
    }
}

export async function addPropertyWithMedia(kostData: Partial<Kost>, imageFiles: File[], videoFiles: File[]): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("Anda harus login.");

    const propertiesRef = collection(db, "properties");
    const newDocRef = doc(propertiesRef);
    const propertyId = newDocRef.id;

    const existingImages = (kostData.imageUrls || []).map((url: any) =>
        typeof url === 'string' ? { original: url } : url
    );
    const existingVideos = (kostData.videoUrls || []).map((url: any) =>
        typeof url === 'string' ? { original: url } : url
    );

    // LANGKAH 1: Buat doc Firestore DULU (kosong imageUrls)
    // Ini krusial agar Cloud Function bisa menemukan doc saat upload selesai
    await setDoc(newDocRef, {
        ...kostData,
        imageUrls: [...existingImages],
        videoUrls: [...existingVideos],
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: kostData.status || 'draft'
    });
    console.log(`Frontend DEBUG: Doc ${propertyId} dibuat di Firestore. Mulai upload gambar...`);

    // LANGKAH 2: Upload gambar (Cloud Function trigger saat upload selesai, doc sudah ada)
    const imageObjects: ImageUrlObject[] = [];
    if (imageFiles && imageFiles.length > 0) {
        const promises = imageFiles.map(file => uploadFileAndGetOriginalURL(file, propertyId, 'images', 'properties'));
        const urls = await Promise.all(promises);
        urls.forEach(url => imageObjects.push({ original: normalizeFirebaseStorageUrlFrontend(url) }));
    }

    const videoObjects: VideoUrlObject[] = [];
    if (videoFiles && videoFiles.length > 0) {
        const promises = videoFiles.map(file => uploadFileAndGetOriginalURL(file, propertyId, 'videos', 'properties'));
        const urls = await Promise.all(promises);
        urls.forEach(url => videoObjects.push({ original: url }));
    }

    // LANGKAH 3: Update doc dengan URL original gambar yang baru diupload
    if (imageObjects.length > 0 || videoObjects.length > 0) {
        await updateDoc(newDocRef, {
            imageUrls: [...existingImages, ...imageObjects],
            videoUrls: [...existingVideos, ...videoObjects],
            updatedAt: serverTimestamp()
        });
        console.log(`Frontend DEBUG: Doc ${propertyId} diupdate dengan URL original gambar.`);
    }

    // LANGKAH 4: Polling WebP — NON-BLOCKING (tidak throw timeout)
    // CF akan update Firestore secara async. Kita tunggu max 30 detik, lalu return apapun hasilnya
    if (imageObjects.length > 0) {
        let retries = 0;
        const MAX_RETRIES = 15; // 15 x 2s = 30 detik (cukup untuk CF cold start)
        const RETRY_DELAY_MS = 2000;

        while (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            try {
                const updatedSnap = await getDocFromServer(newDocRef);
                const updatedData = updatedSnap.data() as any;
                if (!updatedData) break;

                const currentImages = updatedData.imageUrls || [];
                const uploadedImages = currentImages.filter((img: any) => imageObjects.some(upImg => upImg.original === img.original));
                const allNewImagesHaveWebp = uploadedImages.every((img: any) => img.webp);

                console.log(`Frontend DEBUG: Di loop for ${propertyId}. Percobaan ${retries + 1}. allNewImagesHaveWebp:`, allNewImagesHaveWebp);

                if (allNewImagesHaveWebp) {
                    console.log(`Frontend DEBUG: WebP siap untuk properti ${propertyId}.`);
                    return propertyId;
                }
            } catch (e) {
                console.warn("Polling WebP failed, ignoring:", e);
            }
            retries++;
        }
        // Tidak throw error — WebP akan update di background oleh Cloud Function
        console.warn(`Frontend: WebP belum siap setelah ${MAX_RETRIES} percobaan untuk ${propertyId}. Listing tersimpan dengan URL original, WebP akan muncul otomatis dalam beberapa detik.`);
    }
    return propertyId;
}


export async function updatePropertyWithMedia(propertyId: string, kostData: Partial<Kost>, newImageFiles: File[], newVideoFiles: File[]): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("Anda harus login.");

    const propertyRef = doc(db, "properties", propertyId);
    const docSnap = await getDocFromServer(propertyRef);

    if (!docSnap.exists()) throw new Error("Properti tidak ditemukan.");

    const isOwner = docSnap.data()?.ownerUid === user.uid;
    const isAdmin = await checkIfUserIsAdmin(user.uid);

    if (!isOwner && !isAdmin) throw new Error("Tidak memiliki izin.");

    const currentData = docSnap.data();
    const currentImageObjects = currentData?.imageUrls || [];
    const currentVideoObjects = currentData?.videoUrls || [];

    // Determine deletions based on what is NOT in kostData.imageUrls (which are strings from UI)
    const keptImageStrings = kostData.imageUrls || [];
    const keptVideoStrings = kostData.videoUrls || [];

    const itemsToDelete = currentImageObjects.filter((imgObj: any) => {
        const isKept = keptImageStrings.some(keptUrl =>
            keptUrl === imgObj.original ||
            keptUrl === imgObj.webp ||
            keptUrl === imgObj.thumbnail ||
            keptUrl === imgObj // Legacy string support
        );
        return !isKept;
    });

    const videosToDelete = currentVideoObjects.filter((vidObj: any) => {
        const url = typeof vidObj === 'string' ? vidObj : vidObj.original;
        return !keptVideoStrings.includes(url);
    });

    // Execute Deletions Safely
    await Promise.all([
        ...itemsToDelete.map(async (item: any) => {
            if (typeof item === 'string') await deleteFileFromStorage(item);
            else {
                if (item.original) await deleteFileFromStorage(item.original);
                if (item.webp) await deleteFileFromStorage(item.webp);
                if (item.thumbnail) await deleteFileFromStorage(item.thumbnail);
            }
        }),
        ...videosToDelete.map(async (v: any) => {
            const url = typeof v === 'string' ? v : v.original;
            await deleteFileFromStorage(url);
        })
    ]);

    // Filter Kept Objects for Update
    const finalImageObjects = currentImageObjects.filter((imgObj: any) => {
        const isKept = keptImageStrings.some(keptUrl =>
            keptUrl === imgObj.original ||
            keptUrl === imgObj.webp ||
            keptUrl === imgObj.thumbnail ||
            keptUrl === imgObj
        );
        return isKept;
    });

    const finalVideoObjects = currentVideoObjects.filter((vidObj: any) => {
        const url = typeof vidObj === 'string' ? vidObj : vidObj.original;
        return keptVideoStrings.includes(url);
    });

    // Upload New — gunakan UID admin yang sedang login, bukan ownerUid properti.
    // Ini agar path storage selalu match rule: request.auth.uid == userId-in-path
    const newImageObjects: ImageUrlObject[] = [];
    if (newImageFiles && newImageFiles.length > 0) {
        const promises = newImageFiles.map(file => uploadFileAndGetOriginalURL(file, propertyId, 'images', 'properties'));
        const urls = await Promise.all(promises);
        urls.forEach(url => newImageObjects.push({ original: url }));
    }

    const newVideoObjects: VideoUrlObject[] = [];
    if (newVideoFiles && newVideoFiles.length > 0) {
        const promises = newVideoFiles.map(file => uploadFileAndGetOriginalURL(file, propertyId, 'videos', 'properties'));
        const urls = await Promise.all(promises);
        urls.forEach(url => newVideoObjects.push({ original: url }));
    }

    await updateDoc(propertyRef, {
        ...kostData,
        imageUrls: [...finalImageObjects, ...newImageObjects],
        videoUrls: [...finalVideoObjects, ...newVideoObjects],
        updatedAt: serverTimestamp()
    });

    // Polling for WebP Update if new images were uploaded — NON-BLOCKING
    if (newImageFiles.length > 0) {
        let retries = 0;
        const MAX_RETRIES = 15; // 15 x 2s = 30 detik, CF biasanya selesai dalam waktu ini
        const RETRY_DELAY_MS = 2000;

        while (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            try {
                const updatedSnap = await getDocFromServer(propertyRef);
                const updatedData = updatedSnap.data() as any;
                if (!updatedData) break;

                const currentImages = updatedData.imageUrls || [];
                const newlyUploaded = currentImages.filter((img: any) => newImageObjects.some(up => up.original === img.original));
                const allHaveWebp = newlyUploaded.every((img: any) => img.webp);

                console.log(`Frontend DEBUG: Di loop update for ${propertyId}. Percobaan ${retries + 1}. allHaveWebp:`, allHaveWebp);

                if (allHaveWebp) {
                    console.log(`Frontend DEBUG: Update properti ${propertyId} berhasil dengan URL WebP.`);
                    return;
                }
            } catch (e) {
                console.warn("WebP polling failed during update:", e);
            }
            retries++;
        }
        // Tidak throw error — CF akan update Firestore dengan WebP secara async
        console.warn(`Frontend: WebP belum siap setelah ${MAX_RETRIES} percobaan. Update tersimpan, WebP akan muncul otomatis.`);
    }
}


export async function updatePropertyStatus(propertyId: string, newStatus: 'draft' | 'published'): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("Tidak ada admin yang login.");

    const propertyDocRef = doc(db, "properties", propertyId);
    const docSnap = await getDocFromServer(propertyDocRef);

    if (!docSnap.exists()) throw new Error("Properti tidak ditemukan");

    const isOwner = docSnap.data()?.ownerUid === user.uid;
    const isAdmin = await checkIfUserIsAdmin(user.uid);

    if (!isOwner && !isAdmin) throw new Error("Anda tidak memiliki izin.");

    await updateDoc(propertyDocRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
    });
}

export async function deleteProperty(propertyId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("Tidak ada admin yang login.");

    const propertyDocRef = doc(db, "properties", propertyId);
    const docSnap = await getDocFromServer(propertyDocRef);

    if (!docSnap.exists()) throw new Error("Properti tidak ditemukan");

    const isOwner = docSnap.data()?.ownerUid === user.uid;
    const isAdmin = await checkIfUserIsAdmin(user.uid);

    if (!isOwner && !isAdmin) throw new Error("Anda tidak memiliki izin untuk menghapusnya.");

    try {
        const data = docSnap.data() as Kost;
        const deletePromises: Promise<void>[] = [];

        // Hapus semua versi gambar
        (data.imageUrls || []).forEach((img: any) => {
            if (typeof img === 'string') {
                deletePromises.push(deleteFileFromStorage(img));
            } else {
                if (img.original) deletePromises.push(deleteFileFromStorage(img.original));
                if (img.webp) deletePromises.push(deleteFileFromStorage(img.webp));
                if (img.thumbnail) deletePromises.push(deleteFileFromStorage(img.thumbnail));
            }
        });

        // Hapus semua versi video
        (data.videoUrls || []).forEach((vid: any) => {
            if (typeof vid === 'string') {
                deletePromises.push(deleteFileFromStorage(vid));
            } else {
                if (vid.original) deletePromises.push(deleteFileFromStorage(vid.original));
            }
        });

        await Promise.all(deletePromises); // Tunggu semua file media dihapus dari Storage

        await deleteDoc(propertyDocRef); // Hapus dokumen dari Firestore
        console.log("Properti berhasil dihapus:", propertyId);
    } catch (error) {
        console.error("Error menghapus properti:", error);
        throw error;
    }
}

// Function to get details including raw object structure
export async function getPropertyDetails(propertyId: string): Promise<any | null> {
    const user = auth.currentUser;
    if (!user) throw new Error("Tidak ada pengguna yang login.");

    const propertyDocRef = doc(db, "properties", propertyId);
    const docSnap = await getDoc(propertyDocRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        // Transform to ensure fallbacks are ready
        if (data) {
            data.imageUrls = (data.imageUrls || []).map((img: any) => ({
                original: typeof img === 'string' ? img : img.original,
                webp: typeof img === 'string' ? img : (img.webp || img.original),
                thumbnail: typeof img === 'string' ? img : (img.thumbnail || img.webp || img.original)
            }));
        }
        return data;
    } else {
        return null;
    }
}

// --- DATABASE PRODUCT FUNCTIONS ---

export async function getAllDatabases(): Promise<DatabaseProduct[]> {
    const user = auth.currentUser;
    if (!user) throw new Error("Unauthorized");

    // Only Admin
    const isAdmin = await checkIfUserIsAdmin(user.uid);
    if (!isAdmin) throw new Error("Access Denied");

    const dbRef = collection(db, "availableDatabases");
    const q = query(dbRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        let fileUrls = data.fileUrls || {};

        // Migration for legacy data
        if (!data.fileUrls) {
            let coverImage: ImageUrlObject | undefined = undefined;
            if (data.coverImageUrl) {
                if (typeof data.coverImageUrl === 'string') {
                    coverImage = { original: data.coverImageUrl };
                } else {
                    coverImage = data.coverImageUrl;
                }
            }

            fileUrls = { ...fileUrls, coverImage };

            if (data.fileUrl) {
                if (data.fileType === 'link') {
                    fileUrls.googleDrive = data.fileUrl;
                } else {
                    // Default to excel for legacy uploads
                    fileUrls.excel = data.fileUrl;
                }
            }
        }

        return {
            id: doc.id,
            ...data,
            fileUrls,
            fileType: data.fileType || 'link',
            status: data.status || 'available'
        } as DatabaseProduct;
    });
}

// Alias for addDatabaseProduct to match user request
export { addDatabaseProduct as addDatabaseWithMedia };

export async function addDatabaseProduct(
    data: Partial<DatabaseProduct>,
    coverFile: File | null,
    documentFile: File | null
): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("Unauthorized");

    const dbRef = collection(db, "availableDatabases");
    const newDocRef = doc(dbRef);
    const id = newDocRef.id;

    let fileUrls = data.fileUrls || {};

    if (coverFile) {
        const url = await uploadCoverFileAndGetOriginalURL(coverFile, id);
        fileUrls = { ...fileUrls, coverImage: { original: normalizeFirebaseStorageUrlFrontend(url) } };
    }

    let fileName = data.fileName || '';
    if (data.fileType === 'upload' && documentFile) {
        const docUrl = await uploadDocument(documentFile, id);
        fileName = documentFile.name;
        if (fileName.toLowerCase().endsWith('.pdf')) {
            fileUrls = { ...fileUrls, pdf: docUrl };
        } else {
            fileUrls = { ...fileUrls, excel: docUrl };
        }
    }

    await setDoc(newDocRef, {
        ...data,
        fileUrls: fileUrls,
        fileName: fileName,
        status: data.status || 'available',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    // Polling for Cover Image WebP
    if (coverFile) {
        let retries = 0;
        const MAX_RETRIES = 60;
        const RETRY_DELAY_MS = 2000;
        while (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

            try {
                const snap = await getDocFromServer(newDocRef);
                const updatedData = snap.data() as any;

                // Periksa apakah coverImage di Firestore sudah memiliki URL webp
                const webpUpdated = updatedData?.fileUrls?.coverImage?.webp;
                console.log(`Frontend DEBUG: Di loop for ${id}. Percobaan ${retries + 1}. webpUpdated:`, webpUpdated);

                if (webpUpdated) {
                    console.log(`Frontend DEBUG: Firestore untuk database ${id} berhasil diperbarui dengan URL WebP cover.`);
                    return id;
                }
            } catch (e) {
                console.warn("Polling db WebP failed:", e);
            }
            retries++;
        }
        throw new Error("Timeout: Gagal mendapatkan URL WebP cover dari Firestore dalam waktu yang ditentukan.");
    }
    return id;
}

export async function updateDatabaseProduct(
    id: string,
    data: Partial<DatabaseProduct>,
    newCoverFile: File | null,
    newDocumentFile: File | null
): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("Unauthorized");
    const docRef = doc(db, "availableDatabases", id);

    const docSnap = await getDocFromServer(docRef);
    if (!docSnap.exists()) throw new Error("Database not found");
    const currentData = docSnap.data();

    const ownerUid = currentData?.ownerUid;
    let updates: any = { ...data, updatedAt: serverTimestamp() };
    let fileUrls = { ...(currentData.fileUrls || {}), ...(data.fileUrls || {}) };

    if (newCoverFile) {
        // Delete old
        const oldFileUrls = currentData.fileUrls;
        if (oldFileUrls?.coverImage) {
            const old = oldFileUrls.coverImage;
            if (old.original) await deleteFileFromStorage(old.original);
            if (old.webp) await deleteFileFromStorage(old.webp);
            if (old.thumbnail) await deleteFileFromStorage(old.thumbnail);
        } else if (currentData.coverImageUrl) { // Legacy cleanup
            const old = currentData.coverImageUrl;
            if (typeof old === 'string') await deleteFileFromStorage(old);
            else {
                if (old.original) await deleteFileFromStorage(old.original);
                if (old.webp) await deleteFileFromStorage(old.webp);
            }
        }

        const url = await uploadCoverFileAndGetOriginalURL(newCoverFile, id, ownerUid);
        fileUrls.coverImage = { original: normalizeFirebaseStorageUrlFrontend(url) };
    }

    if (data.fileType === 'upload' && newDocumentFile) {
        // Clean up old doc if exists
        const oldFileUrls = currentData.fileUrls;
        if (oldFileUrls?.excel) await deleteFileFromStorage(oldFileUrls.excel);
        if (oldFileUrls?.pdf) await deleteFileFromStorage(oldFileUrls.pdf);
        if (currentData.fileUrl) await deleteFileFromStorage(currentData.fileUrl); // Legacy

        const docUrl = await uploadDocument(newDocumentFile, id, ownerUid);
        updates.fileName = newDocumentFile.name;
        if (newDocumentFile.name.toLowerCase().endsWith('.pdf')) {
            fileUrls.pdf = docUrl;
            delete fileUrls.excel; // Remove excel if switching to pdf
        } else {
            fileUrls.excel = docUrl;
            delete fileUrls.pdf;
        }
    }

    updates.fileUrls = fileUrls;
    // Remove legacy fields if they exist in updates (to clean up)
    delete updates.coverImageUrl;
    delete updates.fileUrl;

    await updateDoc(docRef, updates);

    // Polling for Cover Image WebP (Only if new file uploaded)
    if (newCoverFile) {
        let retries = 0;
        const MAX_RETRIES = 60;
        const RETRY_DELAY_MS = 2000;
        while (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            try {
                const snap = await getDocFromServer(docRef);
                const updatedData = snap.data() as any;

                const webpUpdated = updatedData?.fileUrls?.coverImage?.webp;
                console.log(`Frontend DEBUG: Di loop update for ${id}. Percobaan ${retries + 1}. webpUpdated:`, webpUpdated);

                if (webpUpdated) {
                    console.log(`Frontend DEBUG: Firestore untuk database ${id} berhasil diperbarui dengan URL WebP cover.`);
                    return;
                }
            } catch (e) { console.warn("Polling db update WebP failed:", e); }
            retries++;
        }
        throw new Error("Timeout: Gagal mendapatkan URL WebP cover dari Firestore dalam waktu yang ditentukan.");
    }
}

export async function deleteDatabase(id: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("Unauthorized");

    // Check ownership or admin status (assuming admin check is sufficient as per original code)
    const isAdmin = await checkIfUserIsAdmin(user.uid);
    if (!isAdmin) throw new Error("Access Denied");

    const docRef = doc(db, "availableDatabases", id);
    const docSnap = await getDocFromServer(docRef);

    if (!docSnap.exists()) {
        throw new Error("Database tidak ditemukan.");
    }

    try {
        const data = docSnap.data() as DatabaseProduct;
        const deletePromises: Promise<void>[] = [];

        // Hapus cover image jika ada
        if (data.fileUrls?.coverImage) {
            const img = data.fileUrls.coverImage;
            if (img.original) deletePromises.push(deleteFileFromStorage(img.original));
            if (img.webp) deletePromises.push(deleteFileFromStorage(img.webp));
            if (img.thumbnail) deletePromises.push(deleteFileFromStorage(img.thumbnail));
        }

        // Hapus file dokumen jika ada
        if (data.fileUrls?.excel) deletePromises.push(deleteFileFromStorage(data.fileUrls.excel));
        if (data.fileUrls?.pdf) deletePromises.push(deleteFileFromStorage(data.fileUrls.pdf));

        // Legacy cleanup (if needed, keeping it safe)
        if (data.fileType === 'upload' && (data as any).fileUrl) { // Legacy field
            deletePromises.push(deleteFileFromStorage((data as any).fileUrl));
        }

        await Promise.all(deletePromises); // Tunggu semua file media dihapus dari Storage

        await deleteDoc(docRef); // Hapus dokumen dari Firestore
        console.log("Database berhasil dihapus:", id);
    } catch (error) {
        console.error("Error menghapus database:", error);
        throw error;
    }
}

export async function getDatabaseDetails(databaseId: string): Promise<DatabaseProduct | null> {
    const docRef = doc(db, "availableDatabases", databaseId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data() as any;
        let fileUrls = data.fileUrls || {};

        // Migration for legacy data (same as getAllDatabases)
        if (!data.fileUrls) {
            let coverImage: ImageUrlObject | undefined = undefined;
            if (data.coverImageUrl) {
                if (typeof data.coverImageUrl === 'string') {
                    coverImage = { original: data.coverImageUrl };
                } else {
                    coverImage = data.coverImageUrl;
                }
            }

            fileUrls = { ...fileUrls, coverImage };

            if (data.fileUrl) {
                if (data.fileType === 'link') {
                    fileUrls.googleDrive = data.fileUrl;
                } else {
                    fileUrls.excel = data.fileUrl;
                }
            }
        }

        return {
            id: docSnap.id,
            ...data,
            fileUrls,
            fileType: data.fileType || 'link',
            status: data.status || 'available'
        } as DatabaseProduct;
    }
    return null;
}
