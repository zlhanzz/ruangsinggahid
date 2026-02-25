import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import app, { dbModular } from './firebase'; // Import compat app and dbModular
import { Kost, DatabaseProduct } from './types';

// Use the pre-configured modular DB instance
const db = dbModular;

// Helper to safely convert Firestore timestamps to ISO strings
const convertTimestamp = (ts: any): string => {
    if (ts && typeof ts.toDate === 'function') {
        return ts.toDate().toISOString();
    }
    if (typeof ts === 'string') {
        return ts;
    }
    return new Date().toISOString(); // Fallback
};

// Helper to extract display URL from image object or string
// Prioritize WebP > Original > Thumbnail (untuk menghindari gambar blur/burik di card)
const getDisplayImageUrl = (img: any): string => {
    if (!img) return '';
    if (typeof img === 'string') return img;
    return img.webp || img.original || img.thumbnail || '';
};

// Helper to extract video URL
const getDisplayVideoUrl = (vid: any): string => {
    if (!vid) return '';
    if (typeof vid === 'string') return vid;
    return vid.original || '';
};

export async function getPublishedProperties(): Promise<Kost[]> {
    try {
        const propertiesRef = collection(db, "properties");

        let q;
        try {
            q = query(
                propertiesRef,
                where("status", "==", "published"),
                orderBy("updatedAt", "desc")
            );
        } catch (e) {
            q = query(propertiesRef, where("status", "==", "published"));
        }

        const querySnapshot = await getDocs(q);
        const properties: Kost[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data() as any;

            const rawImages = data.imageUrls || [];
            const images = rawImages.map(getDisplayImageUrl).filter((u: string) => u !== '');

            const rawVideos = data.videoUrls || [];
            const videos = rawVideos.map(getDisplayVideoUrl).filter((u: string) => u !== '');

            properties.push({
                id: doc.id,
                ...data,
                title: data.title || data.namaKost || 'Tanpa Nama',
                price: data.price || (data.roomTypes && data.roomTypes.length > 0 ? data.roomTypes[0].price : 0),
                imageUrls: images,
                videoUrls: videos,
                instagramUrl: data.instagramUrl || '',
                tiktokUrl: data.tiktokUrl || '',
                roomTypes: data.roomTypes || [],
                facilities: data.facilities || [],
                location: data.location || { lat: 0, lng: 0 },
                isVerified: data.isVerified ?? false,
                reviews: data.reviews || [],
                rules: data.rules || [],
                description: data.description || '',
                address: data.address || '',
                city: data.city || '',
                campus: data.campus || '',
                type: data.type || 'Campur',
                ownerUid: data.ownerUid || '',
                status: data.status || 'published',
                distanceToCampus: data.distanceToCampus || '',
                createdAt: convertTimestamp(data.createdAt),
                updatedAt: convertTimestamp(data.updatedAt)
            } as Kost);
        });

        return properties;
    } catch (error: any) {
        if (error.code === 'failed-precondition') {
            console.warn("Firestore Index missing. Fetching unsorted.");
            try {
                const propertiesRef = collection(db, "properties");
                const q = query(propertiesRef, where("status", "==", "published"));
                const querySnapshot = await getDocs(q);
                const properties: Kost[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data() as any;
                    const rawImages = data.imageUrls || [];
                    const images = rawImages.map(getDisplayImageUrl).filter((u: string) => u !== '');
                    const rawVideos = data.videoUrls || [];
                    const videos = rawVideos.map(getDisplayVideoUrl).filter((u: string) => u !== '');

                    properties.push({
                        id: doc.id,
                        ...data,
                        title: data.title || data.namaKost || 'Tanpa Nama',
                        imageUrls: images,
                        videoUrls: videos,
                        instagramUrl: data.instagramUrl || '',
                        tiktokUrl: data.tiktokUrl || '',
                        createdAt: convertTimestamp(data.createdAt),
                        updatedAt: convertTimestamp(data.updatedAt)
                    } as Kost);
                });
                return properties;
            } catch (retryError) {
                console.error("Retry failed:", retryError);
                return [];
            }
        }
        console.error("Error fetching published properties:", error);
        return [];
    }
}

export async function getPublishedPropertyDetails(propertyId: string): Promise<Kost | null> {
    try {
        const propertyDocRef = doc(db, "properties", propertyId);
        const docSnap = await getDoc(propertyDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as any;
            if (data.status === 'published') {
                const rawImages = data.imageUrls || [];
                const images = rawImages.map(getDisplayImageUrl).filter((u: string) => u !== '');

                const rawVideos = data.videoUrls || [];
                const videos = rawVideos.map(getDisplayVideoUrl).filter((u: string) => u !== '');

                return {
                    id: docSnap.id,
                    ...data,
                    title: data.title || data.namaKost || 'Tanpa Nama',
                    imageUrls: images,
                    videoUrls: videos,
                    instagramUrl: data.instagramUrl || '',
                    tiktokUrl: data.tiktokUrl || '',
                    createdAt: convertTimestamp(data.createdAt),
                    updatedAt: convertTimestamp(data.updatedAt)
                } as Kost;
            }
        }
        return null;
    } catch (error) {
        console.error("Error getting property details:", error);
        throw error;
    }
}

export async function getPublicDatabaseProducts(): Promise<DatabaseProduct[]> {
    try {
        const dbRef = collection(db, "availableDatabases");
        const q = query(dbRef, where("status", "==", "available")); // Only show available
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            let fileUrls = data.fileUrls || {};

            // Migration for legacy data
            if (!data.fileUrls) {
                let coverImage: any = undefined;
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
                id: doc.id,
                ...data,
                fileUrls,
                fileType: data.fileType || 'link',
                status: data.status || 'available'
            } as DatabaseProduct;
        });
    } catch (error) {
        console.error("Error fetching databases:", error);
        return [];
    }
}
