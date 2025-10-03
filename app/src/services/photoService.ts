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
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../config/firebase";

const PHOTOS_COLLECTION = "photoChallenge";

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
): Promise<string> => {
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

    return downloadURL;
  } catch (error) {
    console.error("❌ Error uploading photo:", error);
    throw new Error("Failed to upload photo");
  }
};

/**
 * Send a photo challenge to another user
 */
export const sendPhotoChallenge = async (
  senderId: string,
  receiverId: string,
  photoUrl: string,
  prompt: string,
  matchId?: string
): Promise<string> => {
  try {
    const photoRef = doc(collection(db, PHOTOS_COLLECTION));

    // Build photo data, only include matchId if provided
    const photoData: any = {
      senderId,
      receiverId,
      photoUrl,
      prompt,
      timestamp: serverTimestamp(),
      viewed: false,
    };

    // Only add matchId if it exists
    if (matchId) {
      photoData.matchId = matchId;
    }

    await setDoc(photoRef, photoData);
    console.log("✅ Photo challenge sent:", photoRef.id);

    return photoRef.id;
  } catch (error) {
    console.error("❌ Error sending photo challenge:", error);
    throw new Error("Failed to send photo challenge");
  }
};

/**
 * Get unviewed photos for a user (received from buddies)
 */
export const getUnviewedPhotos = async (
  userId: string
): Promise<PhotoChallenge[]> => {
  try {
    const photosRef = collection(db, PHOTOS_COLLECTION);
    // Temporarily removed orderBy to avoid index requirement
    // TODO: Create Firebase index for better performance
    const q = query(
      photosRef,
      where("receiverId", "==", userId),
      where("viewed", "==", false)
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

    console.log(`📸 Found ${photos.length} unviewed photos for user ${userId}`);
    return photos;
  } catch (error) {
    console.error("❌ Error getting unviewed photos:", error);
    return [];
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
 */
export const markPhotoAsViewed = async (photoId: string): Promise<void> => {
  try {
    const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
    await updateDoc(photoRef, {
      viewed: true,
      viewedAt: serverTimestamp(),
    });
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
