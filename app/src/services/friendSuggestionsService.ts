import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FRIENDS_COLLECTION = "friendships";
const USERS_COLLECTION = "users";
const SUGGESTIONS_CACHE_KEY = "@friend_suggestions";
const SUGGESTIONS_CACHE_DURATION = 5 * 60 * 60 * 1000; // 5 hours

// 🎭 Demo suggestions for testing
const DEMO_SUGGESTIONS: FriendSuggestion[] = [
  {
    uid: "demo_1",
    displayName: "Leonardo DiCaprio",
    username: "leodicap",
    country: "🇺🇸",
    bio: "Actor and environmental activist",
    profilePhotoUrl: undefined,
    mutualFriendsCount: 5,
    mutualFriendNames: ["Sarah Johnson", "Michael Chen", "Emma Wilson"],
  },
  {
    uid: "demo_2",
    displayName: "Cristiano Ronaldo",
    username: "cristiano",
    country: "🇵🇹",
    bio: "Professional footballer",
    profilePhotoUrl: undefined,
    mutualFriendsCount: 8,
    mutualFriendNames: ["João Silva", "Maria Santos"],
  },
  {
    uid: "demo_3",
    displayName: "Taylor Swift",
    username: "taylorswift",
    country: "🇺🇸",
    bio: "Singer-songwriter",
    profilePhotoUrl: undefined,
    mutualFriendsCount: 3,
    mutualFriendNames: ["Jessica Martinez"],
  },
  {
    uid: "demo_4",
    displayName: "Lionel Messi",
    username: "leomessi",
    country: "🇦🇷",
    bio: "Football legend",
    profilePhotoUrl: undefined,
    mutualFriendsCount: 6,
    mutualFriendNames: ["Carlos Rodriguez", "Ana Garcia", "Diego Lopez"],
  },
  {
    uid: "demo_5",
    displayName: "Beyoncé",
    username: "beyonce",
    country: "🇺🇸",
    bio: "Artist, performer, icon",
    profilePhotoUrl: undefined,
    mutualFriendsCount: 4,
    mutualFriendNames: ["Michelle Obama", "Jay-Z"],
  },
  {
    uid: "demo_6",
    displayName: "Elon Musk",
    username: "elonmusk",
    country: "🇺🇸",
    bio: "Tech entrepreneur",
    profilePhotoUrl: undefined,
    mutualFriendsCount: 7,
    mutualFriendNames: ["Steve Jobs", "Bill Gates", "Jeff Bezos"],
  },
];

export interface FriendSuggestion {
  uid: string;
  displayName: string;
  username?: string;
  country?: string;
  bio?: string;
  profilePhotoUrl?: string;
  mutualFriendsCount: number;
  mutualFriendNames: string[]; // Up to 3 mutual friend names
}

interface SuggestionsCache {
  suggestions: FriendSuggestion[];
  cachedAt: number;
}

/**
 * Get friend suggestions based on friends-of-friends
 * Returns 4-6 random suggestions that refresh every 5 hours
 */
export const getFriendSuggestions = async (
  userId: string
): Promise<FriendSuggestion[]> => {
  try {
    // 🎭 DEMO MODE: Return all demo suggestions immediately
    console.log("🎭 Returning demo suggestions");
    return DEMO_SUGGESTIONS;

    /* ===== REAL IMPLEMENTATION (currently commented for demo) =====
    
    // Step 1: Get all user's friends
    const userFriends = await getUserFriendIds(userId);
    if (userFriends.length === 0) {
      console.log("ℹ️ User has no friends yet");
      return [];
    }

    // Step 2: Get friends of friends
    const friendsOfFriends = new Map<
      string,
      { mutualFriends: Set<string>; mutualFriendNames: string[] }
    >();

    for (const friendId of userFriends) {
      const friendsFriends = await getUserFriendIds(friendId);

      for (const potentialSuggestion of friendsFriends) {
        // Skip if it's the user themselves or already a friend
        if (
          potentialSuggestion === userId ||
          userFriends.includes(potentialSuggestion)
        ) {
          continue;
        }

        if (!friendsOfFriends.has(potentialSuggestion)) {
          friendsOfFriends.set(potentialSuggestion, {
            mutualFriends: new Set(),
            mutualFriendNames: [],
          });
        }

        friendsOfFriends.get(potentialSuggestion)!.mutualFriends.add(friendId);
      }
    }

    // Step 3: Filter and sort by mutual friends count
    const suggestionsWithDetails: FriendSuggestion[] = [];

    for (const [suggestedUserId, data] of friendsOfFriends.entries()) {
      // Only include if they have at least 1 mutual friend
      if (data.mutualFriends.size === 0) continue;

      // Get user profile
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, suggestedUserId));
      if (!userDoc.exists()) continue;

      const userData = userDoc.data();

      // Get up to 3 mutual friend names
      const mutualFriendIds = Array.from(data.mutualFriends).slice(0, 3);
      const mutualFriendNames: string[] = [];

      for (const friendId of mutualFriendIds) {
        const friendDoc = await getDoc(doc(db, USERS_COLLECTION, friendId));
        if (friendDoc.exists()) {
          mutualFriendNames.push(
            friendDoc.data().displayName ||
              friendDoc.data().username ||
              "Someone"
          );
        }
      }

      suggestionsWithDetails.push({
        uid: suggestedUserId,
        displayName: userData.displayName || "User",
        username: userData.username,
        country: userData.country,
        bio: userData.bio,
        profilePhotoUrl: userData.profilePhotoUrl,
        mutualFriendsCount: data.mutualFriends.size,
        mutualFriendNames,
      });
    }

    // Step 4: Sort by mutual friends count and pick 4-6 random suggestions
    suggestionsWithDetails.sort(
      (a, b) => b.mutualFriendsCount - a.mutualFriendsCount
    );

    // Take top 20 suggestions and randomly pick 4-6 from them
    const topSuggestions = suggestionsWithDetails.slice(0, 20);
    const randomCount2 = Math.floor(Math.random() * 3) + 4; // 4-6 random
    const randomSuggestions = shuffleArray(topSuggestions).slice(
      0,
      randomCount2
    );

    // Cache the results
    const cacheData: SuggestionsCache = {
      suggestions: randomSuggestions,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(
      SUGGESTIONS_CACHE_KEY,
      JSON.stringify(cacheData)
    );

    console.log(`✅ Found ${randomSuggestions.length} friend suggestions`);
    return randomSuggestions;
    
    ===== END REAL IMPLEMENTATION ===== */
  } catch (error) {
    console.error("❌ Error getting friend suggestions:", error);
    return [];
  }
};

/**
 * Get all friend IDs for a user (accepted friendships only)
 */
const getUserFriendIds = async (userId: string): Promise<string[]> => {
  try {
    const friendIds: string[] = [];

    // Query where user is userId1
    const q1 = query(
      collection(db, FRIENDS_COLLECTION),
      where("userId1", "==", userId),
      where("status", "==", "accepted")
    );

    // Query where user is userId2
    const q2 = query(
      collection(db, FRIENDS_COLLECTION),
      where("userId2", "==", userId),
      where("status", "==", "accepted")
    );

    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2),
    ]);

    snapshot1.forEach((doc) => {
      const data = doc.data();
      friendIds.push(data.userId2);
    });

    snapshot2.forEach((doc) => {
      const data = doc.data();
      friendIds.push(data.userId1);
    });

    return friendIds;
  } catch (error) {
    console.error("❌ Error getting user friends:", error);
    return [];
  }
};

/**
 * Invalidate suggestions cache (call after sending friend request)
 */
export const invalidateSuggestionsCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SUGGESTIONS_CACHE_KEY);
    console.log("🗑️ Friend suggestions cache invalidated");
  } catch (error) {
    console.error("❌ Error invalidating suggestions cache:", error);
  }
};

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
