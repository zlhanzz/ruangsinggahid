// functions/src/index.ts

// --- IMPOR YANG DIBUTUHKAN ---
import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import { URL } from 'url'; // Perlu ini untuk normalisasi URL di Cloud Function
// --- AKHIR IMPOR ---

admin.initializeApp();
const gcs = new Storage();
const db = admin.firestore();

interface ImageUrlObject {
  original: string;
  webp?: string;
  thumbnail?: string;
}

// Helper untuk membersihkan URL Firebase Storage dari token dan alt=media
function normalizeFirebaseStorageUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.delete('alt'); // Hapus parameter alt
        urlObj.searchParams.delete('token'); // Hapus parameter token
        return urlObj.toString();
    } catch (e) {
        console.warn("CF_LOG: Gagal menormalisasi URL:", url, e);
        return url; // Jika gagal, kembalikan saja URL asli
    }
}

export const optimizeImageAndSaveUrl = functions.storage.onObjectFinalized(async (event) => {
  const object = event.data;

  if (!object) {
    console.error("CF_LOG: No object data found in event.");
    return;
  }

  const fileBucket = object.bucket;
  const filePath = object.name || '';
  const contentType = object.contentType || '';

  if (!contentType.startsWith('image/') || !filePath.includes('/original/')) {
    console.log('CF_LOG: Bukan upload original image, atau bukan gambar. Melewatkan.');
    return;
  }
  if (filePath.includes('/webp/') || filePath.includes('/thumbnail/')) {
    console.log('CF_LOG: File yang diupload adalah versi teroptimasi. Melewatkan.');
    return;
  }

  const bucket = gcs.bucket(fileBucket);
  const file = bucket.file(filePath);

  const pathParts = filePath.split('/');
  if (pathParts.length < 6) {
    console.error('CF_LOG: Format path gambar tidak cukup panjang. Melewatkan:', filePath);
    return;
  }

  const entityType = pathParts[0];
  const entityOwnerId = pathParts[1];
  const entityId = pathParts[2];
  const subFolder = pathParts[3];
  const versionFolder = pathParts[4];
  const originalFileNameWithExt = pathParts[5];

  if (!['properties', 'databases'].includes(entityType) ||
      (entityType === 'properties' && subFolder !== 'images') ||
      (entityType === 'databases' && subFolder !== 'cover') ||
      versionFolder !== 'original' ||
      !entityOwnerId || !entityId || !originalFileNameWithExt) {
    console.error('CF_LOG: Format path gambar tidak valid (tipe entitas, subfolder, atau versi). Melewatkan:', filePath);
    return;
  }

  const lastDotIndex = originalFileNameWithExt.lastIndexOf('.');
  const baseFileName = (lastDotIndex !== -1) ? originalFileNameWithExt.substring(0, lastDotIndex) : originalFileNameWithExt;

  const encodedBaseFileName = encodeURIComponent(baseFileName);

  const webpFilePath = `${entityType}/${entityOwnerId}/${entityId}/${subFolder}/webp/${encodedBaseFileName}.webp`;
  const thumbnailFilePath = `${entityType}/${entityOwnerId}/${entityId}/${subFolder}/thumbnail/${encodedBaseFileName}_thumb.webp`;

  const webpFile = bucket.file(webpFilePath);
  const thumbnailFile = bucket.file(thumbnailFilePath);

  console.log(`CF_LOG: Memproses gambar: ${filePath} untuk ${entityType}/${entityId}. Base: ${baseFileName}`);

  try { // Try utama
    const [downloadBuffer] = await file.download();

    const webpBuffer = await sharp(downloadBuffer)
      .resize({ width: 1200, withoutEnlargement: true, fit: sharp.fit.inside })
      .toFormat('webp', { quality: 80 })
      .toBuffer();

    const thumbnailBuffer = await sharp(downloadBuffer)
      .resize({ width: 200, height: 200, fit: 'cover' })
      .toFormat('webp', { quality: 70 })
      .toBuffer();

    await webpFile.save(webpBuffer, {
      contentType: 'image/webp',
      metadata: {
        cacheControl: 'public, max-age=31536000',
        originalFilePath: filePath,
        processed: 'true',
      },
    });
    await thumbnailFile.save(thumbnailBuffer, {
      contentType: 'image/webp',
      metadata: {
        cacheControl: 'public, max-age=31536000',
        originalFilePath: filePath,
        processed: 'true',
      },
    });

    const webpDownloadUrl = await getDownloadURLFromRef(webpFile);
    const thumbnailUrl = await getDownloadURLFromRef(thumbnailFile);
    const originalDownloadUrl = await getDownloadURLFromRef(file);
    
    const normalizedOriginalDownloadUrl = normalizeFirebaseStorageUrl(originalDownloadUrl);

    let docRef: FirebaseFirestore.DocumentReference;
    let collectionName: string;

    if (entityType === 'properties') {
        collectionName = 'properties';
    } else if (entityType === 'databases') {
        collectionName = 'availableDatabases';
    } else {
        console.error(`CF_LOG: Tipe entitas tidak didukung: ${entityType}. Melewatkan update Firestore.`);
        return;
    }
    docRef = db.collection(collectionName).doc(entityId);

    console.log(`CF_LOG: Memulai update Firestore untuk dokumen: ${collectionName}/${entityId}`);
    try { // Try untuk update Firestore
      // --- KOREKSI KRUSIAL: Menunggu dokumen ada atau retrying ---
      let docRetries = 0;
      const MAX_DOC_RETRIES = 5; // Coba hingga 5 kali (sekitar 5 detik)
      const DOC_RETRY_DELAY_MS = 1000; // Jeda 1 detik

      let docSnap: FirebaseFirestore.DocumentSnapshot | undefined; // <--- INISIALISASI DENGAN UNDEFINED
      while (docRetries < MAX_DOC_RETRIES) {
        docSnap = await docRef.get(); // Coba ambil dokumen
        if (docSnap.exists) {
          console.log(`CF_LOG: Dokumen ${collectionName}/${entityId} ditemukan setelah ${docRetries} percobaan.`);
          break; // Keluar dari loop jika ditemukan
        }
        console.warn(`CF_LOG: Peringatan: Dokumen ${collectionName}/${entityId} belum ada. Mencoba lagi (${docRetries + 1}/${MAX_DOC_RETRIES}).`);
        await new Promise(resolve => setTimeout(resolve, DOC_RETRY_DELAY_MS));
        docRetries++;
      }

      if (!docSnap || !docSnap.exists) { // <--- PERIKSA docSnap agar tidak undefined
        console.error(`CF_LOG: ERROR: Dokumen ${collectionName}/${entityId} tidak ditemukan setelah beberapa percobaan!`);
        throw new Error(`Dokumen ${collectionName}/${entityId} tidak ditemukan setelah beberapa percobaan!`);
      }
      // --- AKHIR KOREKSI ---

      const currentData = docSnap.data();
      let finalUpdatePayload: { imageUrls?: ImageUrlObject[], fileUrls?: any, updatedAt: FirebaseFirestore.FieldValue };

      if (entityType === 'properties') {
          const currentImageUrls: ImageUrlObject[] = currentData?.imageUrls || [];
          console.log("CF_LOG: currentData (properties):", JSON.stringify(currentData));
          console.log("CF_LOG: currentImageUrls (properties):", JSON.stringify(currentImageUrls));

          const updatedImageUrls = currentImageUrls.map((img: ImageUrlObject) => {
            if (normalizeFirebaseStorageUrl(img.original) === normalizedOriginalDownloadUrl) {
                console.log(`CF_LOG: Menemukan URL original properti yang cocok di Firestore, memperbarui dengan WebP/Thumbnail.`);
                return { original: originalDownloadUrl, webp: webpDownloadUrl, thumbnail: thumbnailUrl };
            }
            return img;
          });
          
          const originalUrlExistsInFirestore = currentImageUrls.some(
              (img: ImageUrlObject) => normalizeFirebaseStorageUrl(img.original) === normalizedOriginalDownloadUrl
          );

          if (!originalUrlExistsInFirestore) {
              console.warn(`CF_LOG: Peringatan: URL original properti yang baru diproses tidak ditemukan di Firestore, menambahkannya sebagai entri baru.`);
              updatedImageUrls.push({ original: originalDownloadUrl, webp: webpDownloadUrl, thumbnail: thumbnailUrl });
          }

          finalUpdatePayload = {
              imageUrls: updatedImageUrls,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

      } else if (entityType === 'databases') {
          const currentFileUrls = currentData?.fileUrls || {};
          console.log("CF_LOG: currentData (databases):", JSON.stringify(currentData));
          console.log("CF_LOG: currentFileUrls (databases):", JSON.stringify(currentFileUrls));
          console.log("CF_LOG: currentFileUrls.coverImage (databases):", JSON.stringify(currentFileUrls.coverImage));

          const updatedCoverImage: ImageUrlObject = {
              original: originalDownloadUrl,
              webp: webpDownloadUrl,
              thumbnail: thumbnailUrl,
          };
          
          finalUpdatePayload = {
              fileUrls: {
                  ...currentFileUrls,
                  coverImage: updatedCoverImage
              },
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          console.log(`CF_LOG: Memperbarui coverImage di fileUrls untuk database dengan WebP/Thumbnail.`);
      } else {
             throw new Error(`CF_LOG: Tipe entitas tidak didukung: ${entityType}. Tidak dapat membuat payload update.`);
      }

      console.log("CF_LOG: Final updatePayload Firestore sebelum commit:", JSON.stringify(finalUpdatePayload));
      await docRef.update(finalUpdatePayload); // Langsung update
      console.log(`CF_LOG: Update Firestore berhasil commit untuk dokumen: ${collectionName}/${entityId}`);

      await file.delete();
      console.log(`CF_LOG: File original ${filePath} telah dihapus.`);

      console.log(`CF_LOG: Gambar ${filePath} berhasil diproses. WebP: ${webpDownloadUrl}, Thumbnail: ${thumbnailUrl}`);

    } catch (firestoreError: any) { // Catch untuk update Firestore
      console.error(`CF_LOG: ERROR: Terjadi error pada update Firestore untuk dokumen ${collectionName}/${entityId}:`, firestoreError);
      throw firestoreError;
    }

  } catch (outerError) { // Catch utama untuk seluruh fungsi
    console.error(`CF_LOG: ERROR: Terjadi error di luar update Firestore untuk gambar ${filePath}:`, outerError);
  }
}); // Akhir fungsi utama

async function getDownloadURLFromRef(fileRef: any): Promise<string> {
    return `https://firebasestorage.googleapis.com/v0/b/${fileRef.bucket.name}/o/${encodeURIComponent(fileRef.name)}?alt=media`;
}

