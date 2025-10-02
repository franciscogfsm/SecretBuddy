import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  UserProfile,
  toggleAgeVisibility,
  updateBio,
  updateLastActive,
  deleteUserProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
} from "../services/userService";
import { useAppState } from "../store/AppStateContext";

/**
 * Custom hook to sync user profile with Firestore
 * Automatically creates profile if it doesn't exist
 * Syncs with local AppState
 */
export const useUserProfile = () => {
  const { user } = useAuth();
  const { profile, setProfile } = useAppState();
  const [firestoreProfile, setFirestoreProfile] = useState<UserProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile from Firestore when user logs in
  useEffect(() => {
    if (!user) {
      setFirestoreProfile(null);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to get existing profile
        let userProfile = await getUserProfile(user.uid);

        // If profile doesn't exist, create it
        if (!userProfile) {
          console.log("📝 Creating new user profile...");
          console.log("📋 Profile data from AppState:", profile);

          // Use data from local profile state if available
          await createUserProfile(user.uid, {
            displayName: profile?.name || user.displayName || "Mystery User",
            email: user.email || "",
            username: profile?.username,
            age: profile?.age,
            country: profile?.country,
          });

          // Fetch the newly created profile
          userProfile = await getUserProfile(user.uid);
        }

        if (userProfile) {
          setFirestoreProfile(userProfile);

          // Sync with AppState
          setProfile({
            name: userProfile.displayName,
            username: userProfile.username || "",
            age: userProfile.age || 18,
            ageVisible: userProfile.ageVisible,
            country: userProfile.country || "Portugal",
            mode: "global",
            bio: userProfile.bio,
          });

          // Update last active
          await updateLastActive(user.uid);
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.uid, profile?.username, profile?.age, profile?.country]);

  // Function to update profile in Firestore and sync with AppState
  const updateProfile = async (
    updates: Partial<Omit<UserProfile, "uid" | "createdAt">>
  ) => {
    if (!user) {
      throw new Error("No user logged in");
    }

    try {
      setLoading(true);
      setError(null);

      await updateUserProfile(user.uid, updates);

      // Fetch updated profile
      const updatedProfile = await getUserProfile(user.uid);

      if (updatedProfile) {
        setFirestoreProfile(updatedProfile);

        // Sync with AppState
        setProfile({
          name: updatedProfile.displayName,
          username: updatedProfile.username || "",
          age: updatedProfile.age || 18,
          ageVisible: updatedProfile.ageVisible,
          country: updatedProfile.country || "Portugal",
          mode: "global",
          bio: updatedProfile.bio,
        });
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Function to toggle age visibility
  const toggleAge = async () => {
    if (!user || !firestoreProfile) {
      throw new Error("No user logged in");
    }

    try {
      const newVisibility = !firestoreProfile.ageVisible;
      await toggleAgeVisibility(user.uid, newVisibility);

      // Update local state
      setFirestoreProfile({
        ...firestoreProfile,
        ageVisible: newVisibility,
      });

      // Sync with AppState
      if (profile) {
        setProfile({
          ...profile,
          ageVisible: newVisibility,
        });
      }
    } catch (err) {
      console.error("Error toggling age visibility:", err);
      throw err;
    }
  };

  // Function to update bio
  const saveBio = async (newBio: string) => {
    if (!user) {
      throw new Error("No user logged in");
    }

    try {
      await updateBio(user.uid, newBio);

      // Update local state
      if (firestoreProfile) {
        setFirestoreProfile({
          ...firestoreProfile,
          bio: newBio,
        });
      }

      // Sync with AppState
      if (profile) {
        setProfile({
          ...profile,
          bio: newBio,
        });
      }
    } catch (err) {
      console.error("Error updating bio:", err);
      throw err;
    }
  };

  // Function to delete profile
  const deleteProfile = async () => {
    if (!user) {
      throw new Error("No user logged in");
    }

    try {
      setLoading(true);
      setError(null);

      // Delete from Firestore
      await deleteUserProfile(user.uid);

      // Clear local state
      setFirestoreProfile(null);
      setProfile(null);

      console.log("✅ Profile deleted successfully");
    } catch (err) {
      console.error("Error deleting profile:", err);
      setError(err instanceof Error ? err.message : "Failed to delete profile");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Function to upload profile photo
  const uploadPhoto = async (imageUri: string) => {
    if (!user) {
      throw new Error("No user logged in");
    }

    try {
      setLoading(true);
      setError(null);

      // Upload photo and get URL
      const photoUrl = await uploadProfilePhoto(user.uid, imageUri);

      // Update local state
      if (firestoreProfile) {
        setFirestoreProfile({
          ...firestoreProfile,
          profilePhotoUrl: photoUrl,
        });
      }

      console.log("✅ Profile photo uploaded successfully");
      return photoUrl;
    } catch (err) {
      console.error("Error uploading profile photo:", err);
      setError(
        err instanceof Error ? err.message : "Failed to upload profile photo"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Function to delete profile photo
  const removePhoto = async () => {
    if (!user) {
      throw new Error("No user logged in");
    }

    try {
      setLoading(true);
      setError(null);

      await deleteProfilePhoto(user.uid);

      // Update local state
      if (firestoreProfile) {
        setFirestoreProfile({
          ...firestoreProfile,
          profilePhotoUrl: undefined,
        });
      }

      console.log("✅ Profile photo removed successfully");
    } catch (err) {
      console.error("Error removing profile photo:", err);
      setError(
        err instanceof Error ? err.message : "Failed to remove profile photo"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    profile: firestoreProfile,
    loading,
    error,
    updateProfile,
    toggleAge,
    saveBio,
    deleteProfile,
    uploadPhoto,
    removePhoto,
    // Expose points, streak, hearts for easy access
    points: firestoreProfile?.points || 0,
    streak: firestoreProfile?.streak || 0,
    hearts: firestoreProfile?.hearts || 0,
  };
};
