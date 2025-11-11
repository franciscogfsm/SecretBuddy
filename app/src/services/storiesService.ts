import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * 🎬 DAILY STORIES SERVICE
 *
 * Architecture:
 * - Storage: Cloudflare R2 (free egress, direct uploads)
 * - Metadata: Firestore (story info, reactions, winner)
 * - Anonymity: No user identifiers exposed
 * - Gate: Must post to view others (post-to-see)
 *
 * Flow:
 * 1. User posts photo → Get R2 upload URL from Cloud Function
 * 2. App uploads directly to R2
 * 3. Save R2 URL + metadata to Firestore
 * 6. Auto-cleanup (midnight) → Cloud Function + R2 Lifecycle Rule
 */

const STORIES_COLLECTION = "dailyStories";
const STORY_REACTIONS_SUBCOLLECTION = "reactions";

export type Story = {
  id: string;
  userId: string; // Internal only, never exposed to UI
  imageUrl: string; // R2 URL
  createdAt: Timestamp;
  expiresAt: Timestamp; // Always midnight of the same day (not 24h from creation)
  fireCount: number; // Only emoji available (removed redundant totalReactions)
  viewCount?: number; // Total views
  hasViewedByCurrentUser?: boolean; // Client-side tracking
};

export type StoryReaction = "fire";

// Cache for stories (reset daily at midnight)
type StoriesCache = {
  stories: any[];
  ownStory: any | null;
  timestamp: number;
  userId: string;
};

let storiesCache: StoriesCache | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - user can pull-to-refresh for updates

const isCacheValid = (userId: string): boolean => {
  if (!storiesCache) {
    console.log("❌ Cache invalid: no cache exists");
    return false;
  }
  if (storiesCache.userId !== userId) {
    console.log("❌ Cache invalid: different user");
    return false;
  }

  const now = Date.now();
  const cacheAge = now - storiesCache.timestamp;

  // Check if cache is still within 5 minutes
  if (cacheAge > CACHE_DURATION) {
    console.log(`❌ Cache invalid: too old (${Math.round(cacheAge / 1000)}s)`);
    return false;
  }

  // Check if it's a new day (invalidate at midnight)
  const cacheDate = new Date(storiesCache.timestamp);
  const currentDate = new Date();
  if (cacheDate.getDate() !== currentDate.getDate()) {
    console.log("❌ Cache invalid: new day");
    return false;
  }

  console.log(`✅ Cache valid (age: ${Math.round(cacheAge / 1000)}s)`);
  return true;
};

/**
 * Check if user has posted a story today
 */
export const hasPostedToday = async (userId: string): Promise<boolean> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, STORIES_COLLECTION),
      where("userId", "==", userId),
      where("createdAt", ">=", Timestamp.fromDate(today)),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking if user posted today:", error);
    return false;
  }
};

// TODO: Replace with your Firebase Cloud Function URL after deployment
// Get this from: firebase functions:list
const GENERATE_UPLOAD_URL_FUNCTION =
  "https://us-central1-secretbuddy-5637d.cloudfunctions.net/generateStoryUploadUrl";
const GET_STORY_URL_FUNCTION =
  "https://us-central1-secretbuddy-5637d.cloudfunctions.net/getStoryUrl";

/**
 * Get R2 upload URL from Cloud Function
 * Returns a pre-signed URL for direct upload to R2
 */
export const generateR2UploadUrl = async (
  userId: string
): Promise<{ uploadUrl: string; fileKey: string; bucket: string }> => {
  try {
    const response = await fetch(GENERATE_UPLOAD_URL_FUNCTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get upload URL: ${errorText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to generate upload URL");
    }

    return {
      uploadUrl: data.uploadUrl,
      fileKey: data.fileKey,
      bucket: data.bucket,
    };
  } catch (error) {
    console.error("Error getting R2 upload URL:", error);
    throw error;
  }
};

/**
 * Upload image directly to R2 using pre-signed URL
 */
export const uploadToR2 = async (
  uploadUrl: string,
  imageUri: string
): Promise<void> => {
  try {
    // Convert image URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload directly to R2 using pre-signed URL
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": "image/jpeg",
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    console.log("✅ Successfully uploaded image to R2");
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw error;
  }
};

/**
 * Get public R2 URL for viewing a story
 */
export const getR2PublicUrl = async (fileKey: string): Promise<string> => {
  try {
    const response = await fetch(
      `${GET_STORY_URL_FUNCTION}?fileKey=${encodeURIComponent(fileKey)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get public URL: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to get public URL");
    }

    return data.url;
  } catch (error) {
    console.error("Error getting R2 public URL:", error);
    throw error;
  }
};

/**
 * Create story metadata in Firestore after successful R2 upload
 */
export const createStory = async (
  userId: string,
  fileKey: string,
  publicUrl: string
): Promise<string> => {
  try {
    const now = Timestamp.now();

    // Set expiresAt to midnight of the same day
    const midnight = new Date();
    midnight.setHours(23, 59, 59, 999); // End of today
    const expiresAt = Timestamp.fromDate(midnight);

    // Use fileKey as story ID for consistency
    const storyId = fileKey.replace(/[\/\.]/g, "_");

    const storyData: Omit<Story, "id"> & { r2FileKey: string } = {
      userId,
      imageUrl: publicUrl,
      r2FileKey: fileKey, // Store for cleanup
      createdAt: now,
      expiresAt,
      fireCount: 0, // Only emoji available
    };

    await setDoc(doc(db, STORIES_COLLECTION, storyId), storyData);

    // Don't invalidate cache - instead update it with the new story
    const newStory: Story = {
      id: storyId,
      ...storyData,
    };

    // Update existing cache if it exists
    if (storiesCache && storiesCache.userId === userId) {
      storiesCache.ownStory = newStory;
      console.log("✅ Added new story to cache");
    } else {
      // Create new cache entry if doesn't exist
      storiesCache = {
        stories: [],
        ownStory: newStory,
        timestamp: Date.now(),
        userId: userId,
      };
      console.log("✅ Created new cache entry with story");
    }

    console.log(`✅ Created story document: ${storyId}`);
    return storyId;
  } catch (error) {
    console.error("Error creating story:", error);
    throw error;
  }
};

/**
 * Force clear cache to get fresh data
 */
export const clearStoriesCache = () => {
  storiesCache = null;
  console.log("🗑️ Stories cache cleared");
};

/**
 * Get today's stories (excluding user's own story for anonymity)
 * Uses cache to reduce API calls (30 seconds)
 */
export const getTodayStories = async (
  currentUserId: string,
  forceRefresh: boolean = false
): Promise<Story[]> => {
  // Force refresh if requested
  if (forceRefresh) {
    console.log("🔄 Force refresh requested - bypassing cache");
    storiesCache = null;
  }

  // Return from cache if valid
  if (isCacheValid(currentUserId) && storiesCache) {
    const cacheAge = Math.round((Date.now() - storiesCache.timestamp) / 1000);
    console.log(`✅ Returning stories from cache (${cacheAge}s old)`);
    return storiesCache.stories as Story[];
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all today's stories first
    const q = query(
      collection(db, STORIES_COLLECTION),
      where("createdAt", ">=", Timestamp.fromDate(today)),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const allStories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Story[];

    console.log(`📊 Total stories fetched: ${allStories.length}`);
    console.log(`👤 Current user ID: ${currentUserId}`);

    // Check which stories current user has viewed (only for others' stories, not own)
    const othersStories = allStories.filter(
      (story) => story.userId !== currentUserId
    );

    const viewChecks = await Promise.all(
      othersStories.map(async (story) => ({
        storyId: story.id,
        hasViewed: await hasViewedStory(story.id, currentUserId),
      }))
    );

    const viewMap = new Map(viewChecks.map((v) => [v.storyId, v.hasViewed]));

    // Filter out own story on client side (more reliable)
    const otherStories = allStories
      .filter((story) => {
        const isOwn = story.userId === currentUserId;
        if (isOwn) {
          console.log(`🚫 Filtering out own story: ${story.id}`);
        }
        return !isOwn;
      })
      .map((story) => ({
        ...story,
        hasViewedByCurrentUser: viewMap.get(story.id) || false,
      }));

    // Update cache - get own story with view count
    let ownStory =
      allStories.find((story) => story.userId === currentUserId) || null;

    if (ownStory) {
      console.log(`✅ Found own story in cache: ${ownStory.id}`);
      // Get view count for own story
      const viewCount = await getStoryViewCount(ownStory.id);
      ownStory = { ...ownStory, viewCount };
    }

    storiesCache = {
      stories: otherStories,
      ownStory,
      timestamp: Date.now(),
      userId: currentUserId,
    };

    console.log(
      `✅ Loaded ${otherStories.length} stories (excluding own), cache updated`
    );
    return otherStories;
  } catch (error) {
    console.error("Error getting today's stories:", error);
    return [];
  }
};

/**
 * Get user's own story for today
 * Uses cache to reduce API calls
 */
export const getUserOwnStory = async (
  userId: string
): Promise<Story | null> => {
  // Return from cache if valid
  if (isCacheValid(userId) && storiesCache?.ownStory) {
    console.log("✅ Returning own story from cache");
    return storiesCache.ownStory as Story;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, STORIES_COLLECTION),
      where("userId", "==", userId),
      where("createdAt", ">=", Timestamp.fromDate(today)),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const storyData = doc.data();

      // Get view count for own story
      const viewCount = await getStoryViewCount(doc.id);

      const ownStory = {
        id: doc.id,
        ...storyData,
        viewCount,
      } as Story;

      // Update cache
      if (storiesCache && storiesCache.userId === userId) {
        storiesCache.ownStory = ownStory;
      }

      return ownStory;
    }
    return null;
  } catch (error) {
    console.error("Error getting own story:", error);
    return null;
  }
};

/**
 * Add reaction to a story
 */
export const reactToStory = async (
  storyId: string,
  userId: string,
  reaction: StoryReaction
): Promise<void> => {
  try {
    const storyRef = doc(db, STORIES_COLLECTION, storyId);
    const reactionRef = doc(storyRef, STORY_REACTIONS_SUBCOLLECTION, userId);

    // Check if user already reacted
    const existingReaction = await getDoc(reactionRef);

    if (existingReaction.exists()) {
      // User already reacted - toggle it off (remove reaction)
      await deleteDoc(reactionRef);
      await updateDoc(storyRef, {
        fireCount: increment(-1),
      });
    } else {
      // New reaction - add it
      await setDoc(reactionRef, {
        userId,
        reaction,
        createdAt: serverTimestamp(),
      });
      await updateDoc(storyRef, {
        fireCount: increment(1),
      });
    }
  } catch (error) {
    console.error("Error reacting to story:", error);
    throw error;
  }
};

/**
 * Get user's reaction for a story (if any)
 */
export const getUserReaction = async (
  storyId: string,
  userId: string
): Promise<StoryReaction | null> => {
  try {
    const reactionRef = doc(
      db,
      STORIES_COLLECTION,
      storyId,
      STORY_REACTIONS_SUBCOLLECTION,
      userId
    );
    const reactionDoc = await getDoc(reactionRef);

    if (reactionDoc.exists()) {
      return reactionDoc.data().reaction as StoryReaction;
    }
    return null;
  } catch (error) {
    console.error("Error getting user reaction:", error);
    return null;
  }
};

/**
 * Get story by ID
 */
export const getStory = async (storyId: string): Promise<Story | null> => {
  try {
    const storyDoc = await getDoc(doc(db, STORIES_COLLECTION, storyId));

    if (storyDoc.exists()) {
      return {
        id: storyDoc.id,
        ...storyDoc.data(),
      } as Story;
    }
    return null;
  } catch (error) {
    console.error("Error getting story:", error);
    return null;
  }
};

/**
 * Mark story as viewed by user
 */
export const markStoryAsViewed = async (
  storyId: string,
  userId: string
): Promise<void> => {
  try {
    // Store view in subcollection for analytics
    const viewRef = doc(db, STORIES_COLLECTION, storyId, "views", userId);
    await setDoc(viewRef, {
      viewedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking story as viewed:", error);
  }
};

/**
 * Check if user has viewed a story
 */
export const hasViewedStory = async (
  storyId: string,
  userId: string
): Promise<boolean> => {
  try {
    const viewRef = doc(db, STORIES_COLLECTION, storyId, "views", userId);
    const viewDoc = await getDoc(viewRef);
    return viewDoc.exists();
  } catch (error) {
    console.error("Error checking if story viewed:", error);
    return false;
  }
};

/**
 * Get view count for a story
 */
export const getStoryViewCount = async (storyId: string): Promise<number> => {
  try {
    const viewsCollection = collection(
      db,
      STORIES_COLLECTION,
      storyId,
      "views"
    );
    const snapshot = await getDocs(viewsCollection);
    return snapshot.size;
  } catch (error) {
    console.error("Error getting view count:", error);
    return 0;
  }
};

/**
 * Get today's winner (if announced)
 */
export const getTodayWinner = async (): Promise<Story | null> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, STORIES_COLLECTION),
      where("createdAt", ">=", Timestamp.fromDate(today)),
      where("isWinner", "==", true),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Story;
    }
    return null;
  } catch (error) {
    console.error("Error getting today's winner:", error);
    return null;
  }
};

/**
 * Opt-in to reveal profile as winner
 * (Only winner can call this)
 */
export const revealWinnerProfile = async (storyId: string): Promise<void> => {
  try {
    const storyRef = doc(db, STORIES_COLLECTION, storyId);
    await updateDoc(storyRef, {
      winnerRevealedProfile: true,
    });
  } catch (error) {
    console.error("Error revealing winner profile:", error);
    throw error;
  }
};
