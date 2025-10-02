import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import * as ImageManipulator from "expo-image-manipulator";
import { db, storage } from "../config/firebase";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  username?: string;
  age?: number;
  bio?: string;
  country?: string;
  ageVisible: boolean;
  profilePhotoUrl?: string;
  points: number;
  streak: number;
  hearts: number;
  createdAt: any;
  updatedAt: any;
  lastActive: any;
}

const USERS_COLLECTION = "users";

/**
 * Create a new user profile in Firestore
 */
export const createUserProfile = async (
  uid: string,
  data: {
    displayName: string;
    email: string;
    username?: string;
    age?: number;
    country?: string;
  }
): Promise<void> => {
  try {
    // Check if username is already taken
    if (data.username) {
      const usernameAvailable = await isUsernameAvailable(data.username);
      if (!usernameAvailable) {
        throw new Error(
          `Username "${data.username}" is already taken. Please choose another one.`
        );
      }
    }

    const userRef = doc(db, USERS_COLLECTION, uid);

    const userProfile: any = {
      displayName: data.displayName,
      email: data.email,
      bio: "",
      ageVisible: true,
      points: 0,
      streak: 0,
      hearts: 5, // Start with 5 hearts
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    };

    // Only add optional fields if they have values (not undefined)
    if (data.username) {
      userProfile.username = data.username.trim().toLowerCase();
    }
    if (data.age) {
      userProfile.age = data.age;
    }
    if (data.country) {
      userProfile.country = data.country;
    }

    await setDoc(userRef, userProfile);
    console.log("✅ User profile created:", uid);
  } catch (error) {
    console.error("❌ Error creating user profile:", error);
    throw error;
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (
  uid: string
): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { uid, ...userSnap.data() } as UserProfile;
    }

    console.warn("⚠️ User profile not found:", uid);
    return null;
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    throw error;
  }
};

/**
 * Check if a username already exists in Firestore
 * @returns true if username is available, false if taken
 */
export const isUsernameAvailable = async (
  username: string
): Promise<boolean> => {
  try {
    if (!username || username.trim().length === 0) {
      return false;
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Query for users with this username (case-insensitive)
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where("username", "==", normalizedUsername));
    const querySnapshot = await getDocs(q);

    // If no documents found, username is available
    return querySnapshot.empty;
  } catch (error) {
    console.error("❌ Error checking username availability:", error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  uid: string,
  updates: Partial<
    Omit<UserProfile, "uid" | "createdAt" | "points" | "streak" | "hearts">
  > & { profilePhotoUrl?: string | null }
): Promise<void> => {
  try {
    // Check if username is being updated and if it's available
    if (updates.username) {
      const currentProfile = await getUserProfile(uid);
      const newUsername = updates.username.trim().toLowerCase();

      // Only check if the username is different from current
      if (
        currentProfile &&
        currentProfile.username?.toLowerCase() !== newUsername
      ) {
        const usernameAvailable = await isUsernameAvailable(newUsername);
        if (!usernameAvailable) {
          throw new Error(
            `Username "${updates.username}" is already taken. Please choose another one.`
          );
        }
      }

      // Normalize username
      updates.username = newUsername;
    }

    const userRef = doc(db, USERS_COLLECTION, uid);

    // Remove undefined values and handle null
    const cleanedUpdates: any = { ...updates, updatedAt: serverTimestamp() };

    // Remove undefined values
    Object.keys(cleanedUpdates).forEach((key) => {
      if (cleanedUpdates[key] === undefined) {
        delete cleanedUpdates[key];
      }
    });

    await updateDoc(userRef, cleanedUpdates);

    console.log("✅ User profile updated:", uid);
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    throw error;
  }
};

/**
 * Update user's last active timestamp
 */
export const updateLastActive = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);

    await updateDoc(userRef, {
      lastActive: serverTimestamp(),
    });
  } catch (error) {
    console.error("❌ Error updating last active:", error);
    // Don't throw - this is not critical
  }
};

/**
 * Add points to user
 */
export const addPoints = async (uid: string, amount: number): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);

    await updateDoc(userRef, {
      points: increment(amount),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Added ${amount} points to user:`, uid);
  } catch (error) {
    console.error("❌ Error adding points:", error);
    throw error;
  }
};

/**
 * Remove points from user
 */
export const removePoints = async (
  uid: string,
  amount: number
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);

    await updateDoc(userRef, {
      points: increment(-amount),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Removed ${amount} points from user:`, uid);
  } catch (error) {
    console.error("❌ Error removing points:", error);
    throw error;
  }
};

/**
 * Update user streak
 */
export const updateStreak = async (
  uid: string,
  newStreak: number
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);

    await updateDoc(userRef, {
      streak: newStreak,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Updated streak to ${newStreak} for user:`, uid);
  } catch (error) {
    console.error("❌ Error updating streak:", error);
    throw error;
  }
};

/**
 * Increment user streak by 1
 */
export const incrementStreak = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);

    await updateDoc(userRef, {
      streak: increment(1),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Incremented streak for user:`, uid);
  } catch (error) {
    console.error("❌ Error incrementing streak:", error);
    throw error;
  }
};

/**
 * Reset user streak to 0
 */
export const resetStreak = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);

    await updateDoc(userRef, {
      streak: 0,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Reset streak for user:`, uid);
  } catch (error) {
    console.error("❌ Error resetting streak:", error);
    throw error;
  }
};

/**
 * Add hearts to user
 */
export const addHearts = async (uid: string, amount: number): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);

    await updateDoc(userRef, {
      hearts: increment(amount),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Added ${amount} hearts to user:`, uid);
  } catch (error) {
    console.error("❌ Error adding hearts:", error);
    throw error;
  }
};

/**
 * Remove hearts from user
 */
export const removeHearts = async (
  uid: string,
  amount: number
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);

    await updateDoc(userRef, {
      hearts: increment(-amount),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Removed ${amount} hearts from user:`, uid);
  } catch (error) {
    console.error("❌ Error removing hearts:", error);
    throw error;
  }
};

/**
 * Toggle age visibility
 */
export const toggleAgeVisibility = async (
  uid: string,
  isVisible: boolean
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);

    await updateDoc(userRef, {
      ageVisible: isVisible,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Age visibility set to ${isVisible} for user:`, uid);
  } catch (error) {
    console.error("❌ Error toggling age visibility:", error);
    throw error;
  }
};

/**
 * Update user bio
 */
export const updateBio = async (uid: string, bio: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);

    await updateDoc(userRef, {
      bio: bio.trim(),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Bio updated for user:`, uid);
  } catch (error) {
    console.error("❌ Error updating bio:", error);
    throw error;
  }
};

/**
 * Upload profile photo to Firebase Storage
 * Optimized for minimum storage with high quality
 * Automatically deletes old photo before uploading new one
 * @returns The download URL of the uploaded photo
 */
export const uploadProfilePhoto = async (
  uid: string,
  imageUri: string
): Promise<string> => {
  try {
    // Check if user already has a profile photo and delete it first
    try {
      const userProfile = await getUserProfile(uid);
      if (userProfile?.profilePhotoUrl) {
        console.log("🗑️ Deleting old profile photo before upload...");
        await deleteProfilePhoto(uid);
      }
    } catch (deleteError) {
      console.warn(
        "⚠️ Could not delete old photo, continuing with upload:",
        deleteError
      );
      // Continue with upload even if delete fails
    }

    // Optimize image for minimum storage while maintaining quality
    // - Resize to 400x400 (sufficient for profile photos, 75% less data than 800x800)
    // - Use JPEG format with 0.8 quality for best quality/size ratio
    // - This typically results in 50-150KB per photo vs 200-400KB
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 400, height: 400 } }],
      {
        compress: 0.8, // Higher quality for better appearance
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log("📦 Image optimized for storage:", {
      original: imageUri,
      optimized: manipulatedImage.uri,
      size: "400x400",
      quality: "0.8",
    });

    // Convert optimized image URI to blob
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();

    console.log(`💾 Optimized file size: ${(blob.size / 1024).toFixed(2)} KB`);

    // Create a reference to the storage location
    const storageRef = ref(storage, `profile-photos/${uid}.jpg`);

    // Upload the optimized file
    await uploadBytes(storageRef, blob);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Update user profile with the photo URL
    await updateUserProfile(uid, { profilePhotoUrl: downloadURL });

    console.log("✅ Profile photo uploaded:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("❌ Error uploading profile photo:", error);
    throw error;
  }
};

/**
 * Delete profile photo from Firebase Storage
 */
export const deleteProfilePhoto = async (uid: string): Promise<void> => {
  try {
    const storageRef = ref(storage, `profile-photos/${uid}.jpg`);

    // Delete the file
    await deleteObject(storageRef);

    // Update user profile to remove photo URL (use undefined to remove field)
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      profilePhotoUrl: null,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Profile photo deleted");
  } catch (error) {
    console.error("❌ Error deleting profile photo:", error);
    // Don't throw if file doesn't exist
    if (error instanceof Error && !error.message.includes("object-not-found")) {
      throw error;
    }
  }
};

/**
 * Delete user profile from Firestore
 * WARNING: This permanently deletes the user's profile data
 */
export const deleteUserProfile = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);

    // Delete profile photo if it exists
    try {
      await deleteProfilePhoto(uid);
    } catch (error) {
      console.warn("⚠️ Could not delete profile photo:", error);
    }

    await deleteDoc(userRef);
    console.log("✅ User profile deleted:", uid);
  } catch (error) {
    console.error("❌ Error deleting user profile:", error);
    throw error;
  }
};
