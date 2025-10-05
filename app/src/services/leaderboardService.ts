import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  username?: string | null;
  points: number;
  streak: number;
  country?: string | null;
}

export interface LeaderboardResponse {
  success: boolean;
  type: "global" | "country" | "friends";
  leaderboard: LeaderboardEntry[];
  userRank?: LeaderboardEntry;
  timestamp?: any;
}

const USERS_COLLECTION = "users";

/**
 * Get global leaderboard (top users by points)
 * Uses Cloud Function for consistent server-side data
 */
export const getGlobalLeaderboard = async (
  userId?: string,
  limitCount: number = 10
): Promise<LeaderboardResponse> => {
  try {
    const functions = getFunctions();
    const getLeaderboard = httpsCallable<
      { type: string; userId?: string; limit: number },
      LeaderboardResponse
    >(functions, "getLeaderboard");

    const result = await getLeaderboard({
      type: "global",
      userId,
      limit: limitCount,
    });

    return result.data;
  } catch (error) {
    console.error("❌ Error fetching global leaderboard:", error);
    throw error;
  }
};

/**
 * Get country leaderboard (top users in same country)
 * Client-side implementation with fallback
 */
export const getCountryLeaderboard = async (
  userId: string,
  limitCount: number = 10
): Promise<LeaderboardResponse> => {
  try {
    // Get user's country first
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    const userData = userDoc.data();
    const userCountry = userData?.country;

    if (!userCountry) {
      // User has no country set, return empty leaderboard
      return {
        success: true,
        type: "country",
        leaderboard: [],
      };
    }

    // Query users from same country, ordered by points
    const countryQuery = query(
      collection(db, USERS_COLLECTION),
      where("country", "==", userCountry),
      orderBy("points", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(countryQuery);
    const leaderboard: LeaderboardEntry[] = [];

    let index = 0;
    snapshot.forEach((docSnap) => {
      leaderboard.push({
        rank: index + 1,
        userId: docSnap.id,
        displayName: docSnap.data().displayName || "Unknown",
        username: docSnap.data().username || null,
        points: docSnap.data().points || 0,
        streak: docSnap.data().streak || 0,
        country: docSnap.data().country || null,
      });
      index++;
    });

    // Find user's rank if not in top results
    const userInTop = leaderboard.find((entry) => entry.userId === userId);
    let userRank = userInTop;

    if (!userInTop) {
      const userPoints = userData?.points || 0;
      const higherQuery = query(
        collection(db, USERS_COLLECTION),
        where("country", "==", userCountry),
        where("points", ">", userPoints)
      );

      const higherSnapshot = await getDocs(higherQuery);
      userRank = {
        rank: higherSnapshot.size + 1,
        userId,
        displayName: userData?.displayName || "Unknown",
        points: userPoints,
        streak: userData?.streak || 0,
        country: userCountry,
      };
    }

    return {
      success: true,
      type: "country",
      leaderboard,
      userRank,
    };
  } catch (error) {
    console.error("❌ Error fetching country leaderboard:", error);
    // Return empty leaderboard on error instead of throwing
    return {
      success: false,
      type: "country",
      leaderboard: [],
    };
  }
};

/**
 * Get friends leaderboard (friends sorted by points)
 * Client-side implementation since it needs friends list
 */
export const getFriendsLeaderboard = async (
  userId: string
): Promise<LeaderboardResponse> => {
  try {
    // Get user's friends list
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    const userData = userDoc.data();
    const friends = userData?.friends || [];

    if (friends.length === 0) {
      return {
        success: true,
        type: "friends",
        leaderboard: [],
      };
    }

    // Fetch all friends data
    const friendsData: LeaderboardEntry[] = [];

    // Fetch in chunks of 10 (Firestore limit for 'in' queries)
    for (let i = 0; i < friends.length; i += 10) {
      const chunk = friends.slice(i, i + 10);
      const friendsQuery = query(
        collection(db, USERS_COLLECTION),
        where("__name__", "in", chunk)
      );

      const snapshot = await getDocs(friendsQuery);
      snapshot.forEach((doc) => {
        friendsData.push({
          rank: 0, // Will be set after sorting
          userId: doc.id,
          displayName: doc.data().displayName || "Unknown",
          username: doc.data().username || null,
          points: doc.data().points || 0,
          streak: doc.data().streak || 0,
          country: doc.data().country || null,
        });
      });
    }

    // Add current user
    if (userData) {
      friendsData.push({
        rank: 0,
        userId,
        displayName: userData.displayName || "Unknown",
        points: userData.points || 0,
        streak: userData.streak || 0,
        country: userData.country || null,
      });
    }

    // Sort by points (descending) and assign ranks
    friendsData.sort((a, b) => b.points - a.points);
    friendsData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Find user's rank
    const userRank = friendsData.find((entry) => entry.userId === userId);

    return {
      success: true,
      type: "friends",
      leaderboard: friendsData.slice(0, 10), // Top 10 friends
      userRank,
    };
  } catch (error) {
    console.error("❌ Error fetching friends leaderboard:", error);
    throw error;
  }
};

/**
 * Get user's rank in global leaderboard
 */
export const getUserGlobalRank = async (
  userId: string
): Promise<number | null> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (!userDoc.exists()) return null;

    const userPoints = userDoc.data().points || 0;

    // Count users with more points
    const higherQuery = query(
      collection(db, USERS_COLLECTION),
      where("points", ">", userPoints)
    );

    const snapshot = await getDocs(higherQuery);
    return snapshot.size + 1; // User's rank
  } catch (error) {
    console.error("❌ Error getting user rank:", error);
    return null;
  }
};
