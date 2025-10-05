import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit,
  increment,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../config/firebase";
import * as poolService from "./poolService";

const PHOTOS_COLLECTION = "photoChallenge";
const PAIRS_COLLECTION = "pairs";

// ⚡ Cache for unviewed photos (reduces Firestore reads)
let unviewedPhotosCache: {
  photos: PhotoChallenge[];
  cachedAt: number;
  userId: string;
} | null = null;
const PHOTOS_CACHE_DURATION = 30 * 1000; // 30 seconds (photos update frequently)

export interface PhotoChallenge {
  id: string;
  senderId: string;
  receiverId: string;
  photoUrl: string;
  thumbnailUrl?: string;
  prompt: string; // The challenge prompt text
  timestamp: any;
  viewed: boolean;
  viewedAt?: any;
  matchId?: string; // Link to match/conversation
}

/**
 * Upload photo to Firebase Storage
 * Returns the download URL
 * NOTE: Photo will be deleted immediately after viewing, so this is temporary storage
 */
export const uploadPhoto = async (
  uri: string,
  userId: string,
  receiverId: string
): Promise<{ downloadURL: string; storagePath: string }> => {
  try {
    // Convert URI to blob for upload
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create unique filename
    const timestamp = Date.now();
    const filename = `photos/${userId}/${receiverId}_${timestamp}.jpg`;
    const storageRef = ref(storage, filename);

    console.log("📤 Uploading photo to Firebase Storage (temporary)...");
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log("✅ Photo uploaded successfully:", downloadURL);
    console.log("📁 Storage path:", filename);

    return { downloadURL, storagePath: filename };
  } catch (error) {
    console.error("❌ Error uploading photo:", error);
    throw new Error("Failed to upload photo");
  }
};

/**
 * Send a photo challenge to paired buddy
 * Validates photo window timing and max photos from pair
 * ✅ SCALE OPTIMIZED: Sets expireAt field for Firestore TTL auto-cleanup
 * @param bypassPhotoWindow - Skip photo window validation (for notifications sent by Cloud Functions)
 */
export const sendPhotoChallenge = async (
  senderId: string,
  receiverId: string,
  photoUrl: string,
  prompt: string,
  storagePath?: string,
  matchId?: string,
  bypassPhotoWindow?: boolean
): Promise<string> => {
  try {
    // Get current pair to validate
    const pair = await poolService.getMyCurrentPair(senderId);

    if (!pair) {
      throw new Error("You don't have an active pair. Join a pool first!");
    }

    // Validate it's the correct partner
    const partnerId = poolService.getPartnerIdFromPair(pair, senderId);
    if (partnerId !== receiverId) {
      throw new Error("You can only send photos to your paired buddy!");
    }

    // Validate photo window timing (skip if bypassPhotoWindow is true)
    if (!bypassPhotoWindow) {
      if (!poolService.isInPhotoWindow(pair)) {
        const timeUntil = poolService.getTimeUntilPhotoWindow(pair);
        if (timeUntil > 0) {
          throw new Error(
            `Photo window hasn't opened yet! Opens in ${poolService.formatTimeRemaining(
              timeUntil
            )}`
          );
        } else {
          throw new Error("Photo window has closed!");
        }
      }
    }

    // Check max photos limit
    const myPhotoCount = poolService.getMyPhotoCount(pair, senderId);
    if (myPhotoCount >= pair.maxPhotos) {
      throw new Error(
        `You've reached the maximum of ${pair.maxPhotos} photos for today!`
      );
    }

    const photoRef = doc(collection(db, PHOTOS_COLLECTION));

    // ✅ SCALE OPTIMIZED: Set expireAt for Firestore TTL auto-cleanup (24 hours)
    const expireDate = new Date();
    expireDate.setHours(expireDate.getHours() + 24);

    // Save photo challenge
    const photoData: any = {
      senderId,
      receiverId,
      photoUrl,
      prompt,
      timestamp: serverTimestamp(),
      expireAt: Timestamp.fromDate(expireDate), // ✅ TTL field for auto-cleanup
      viewed: false,
      pairId: pair.id,
      storagePath: storagePath || null, // IMPORTANT: Save storagePath for cleanup
    };

    if (matchId) {
      photoData.matchId = matchId;
    }

    await setDoc(photoRef, photoData);

    // Update pair photo count
    const pairRef = doc(db, PAIRS_COLLECTION, pair.id);
    const isUserA = pair.userA === senderId;

    await updateDoc(pairRef, {
      [isUserA ? "photosA" : "photosB"]: increment(1),
      // Enable reveal if this is first photo
      [isUserA ? "canRevealA" : "canRevealB"]: true,
    });

    console.log("✅ Photo challenge sent with TTL expireAt:", photoRef.id);

    return photoRef.id;
  } catch (error) {
    console.error("❌ Error sending photo challenge:", error);
    throw error;
  }
};

/**
 * Get unviewed photos for a user (received from buddies)
 * ⚡ OPTIMIZED: Caches results for 30 seconds and limits query to 50 photos
 */
export const getUnviewedPhotos = async (
  userId: string,
  bypassCache: boolean = false
): Promise<PhotoChallenge[]> => {
  try {
    // ⚡ Check cache first (if same user and less than 30 seconds old)
    if (
      !bypassCache &&
      unviewedPhotosCache &&
      unviewedPhotosCache.userId === userId
    ) {
      const cacheAge = Date.now() - unviewedPhotosCache.cachedAt;
      if (cacheAge < PHOTOS_CACHE_DURATION) {
        return unviewedPhotosCache.photos;
      }
    }

    const photosRef = collection(db, PHOTOS_COLLECTION);
    // ⚡ Limit to 50 photos to reduce read costs (users rarely have >50 unviewed)
    const q = query(
      photosRef,
      where("receiverId", "==", userId),
      where("viewed", "==", false),
      limit(50) // ⚡ Prevent unbounded queries
    );

    const snapshot = await getDocs(q);
    const photos: PhotoChallenge[] = [];

    snapshot.forEach((doc) => {
      photos.push({
        id: doc.id,
        ...doc.data(),
      } as PhotoChallenge);
    });

    // Sort by timestamp client-side instead
    photos.sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || 0;
      const bTime = b.timestamp?.toMillis?.() || 0;
      return bTime - aTime; // Descending order (newest first)
    });

    // Production: avoid noisy demo logs for unviewed photo checks

    // Update cache
    unviewedPhotosCache = { photos, cachedAt: Date.now(), userId };

    return photos;
  } catch (error) {
    console.error("❌ Error getting unviewed photos:", error);
    return [];
  }
};

/**
 * Get a specific photo by ID
 */
export const getPhotoById = async (
  photoId: string
): Promise<PhotoChallenge | null> => {
  try {
    const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
    const photoDoc = await getDoc(photoRef);

    if (!photoDoc.exists()) {
      console.warn("⚠️ Photo not found:", photoId);
      return null;
    }

    return { id: photoDoc.id, ...photoDoc.data() } as PhotoChallenge;
  } catch (error) {
    console.error("❌ Error getting photo by ID:", error);
    return null;
  }
};

/**
 * Get all photos for a user (both sent and received)
 */
export const getAllUserPhotos = async (
  userId: string
): Promise<{ sent: PhotoChallenge[]; received: PhotoChallenge[] }> => {
  try {
    const photosRef = collection(db, PHOTOS_COLLECTION);

    // Get sent photos
    const sentQuery = query(
      photosRef,
      where("senderId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    // Get received photos
    const receivedQuery = query(
      photosRef,
      where("receiverId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const [sentSnapshot, receivedSnapshot] = await Promise.all([
      getDocs(sentQuery),
      getDocs(receivedQuery),
    ]);

    const sent: PhotoChallenge[] = [];
    const received: PhotoChallenge[] = [];

    sentSnapshot.forEach((doc) => {
      sent.push({ id: doc.id, ...doc.data() } as PhotoChallenge);
    });

    receivedSnapshot.forEach((doc) => {
      received.push({ id: doc.id, ...doc.data() } as PhotoChallenge);
    });

    return { sent, received };
  } catch (error) {
    console.error("❌ Error getting user photos:", error);
    return { sent: [], received: [] };
  }
};

/**
 * Mark a photo as viewed
 * ⚡ Invalidates cache to force refresh on next load
 */
export const markPhotoAsViewed = async (photoId: string): Promise<void> => {
  try {
    const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
    await updateDoc(photoRef, {
      viewed: true,
      viewedAt: serverTimestamp(),
    });

    // ⚡ Invalidate cache so next getUnviewedPhotos() fetches fresh data
    unviewedPhotosCache = null;

    console.log("✅ Photo marked as viewed:", photoId);
  } catch (error) {
    console.error("❌ Error marking photo as viewed:", error);
    throw error;
  }
};

/**
 * Delete a photo challenge
 */
export const deletePhotoChallenge = async (photoId: string): Promise<void> => {
  try {
    // Get photo data to delete from storage
    const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
    const photoDoc = await getDoc(photoRef);

    if (photoDoc.exists()) {
      const photoData = photoDoc.data() as PhotoChallenge;

      // Delete from Storage if URL exists
      if (photoData.photoUrl) {
        try {
          // Extract path from Firebase Storage URL
          // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
          const url = photoData.photoUrl;
          const pathMatch = url.match(/\/o\/(.+?)\?/);

          if (pathMatch && pathMatch[1]) {
            // Decode the URL-encoded path
            const storagePath = decodeURIComponent(pathMatch[1]);
            console.log("🗑️ Deleting photo from Storage:", storagePath);

            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef);
            console.log("✅ Photo deleted from Storage");
          } else {
            console.warn("⚠️ Could not extract storage path from URL");
          }
        } catch (storageError) {
          console.warn("⚠️ Could not delete photo from storage:", storageError);
        }
      }
    }

    // Delete from Firestore (soft delete)
    await updateDoc(photoRef, { deleted: true } as any);
    console.log("✅ Photo challenge deleted from Firestore:", photoId);
  } catch (error) {
    console.error("❌ Error deleting photo challenge:", error);
    throw error;
  }
};

/**
 * Subscribe to unviewed photos in real-time
 */
export const subscribeToUnviewedPhotos = (
  userId: string,
  onUpdate: (photos: PhotoChallenge[]) => void
) => {
  try {
    const photosRef = collection(db, PHOTOS_COLLECTION);
    // Removed orderBy to avoid index requirement
    // Sorting is done in getUnviewedPhotos() function
    const q = query(
      photosRef,
      where("receiverId", "==", userId),
      where("viewed", "==", false)
    );

    // Note: This would use onSnapshot for real-time updates
    // For now, using polling approach
    const intervalId = setInterval(async () => {
      const photos = await getUnviewedPhotos(userId);
      onUpdate(photos);
    }, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  } catch (error) {
    console.error("❌ Error subscribing to photos:", error);
    return () => {};
  }
};
