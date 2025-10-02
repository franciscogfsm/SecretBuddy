import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  requirementType: "points" | "streak" | "prompts" | "friends" | "matches";
  gradient: string[];
  unlockedAt?: any;
}

export interface UserBadges {
  uid: string;
  unlockedBadges: string[]; // Array of badge IDs
  totalBadges: number;
  createdAt: any;
  updatedAt: any;
}

const BADGES_COLLECTION = "badges";
const USER_BADGES_COLLECTION = "userBadges";

// Define all available badges
export const ALL_BADGES: Badge[] = [
  {
    id: "night-owl",
    title: "Night Owl",
    description: "Reply after 9pm",
    icon: "moon-outline",
    requirement: 1,
    requirementType: "prompts",
    gradient: ["rgba(156, 107, 255, 0.8)", "rgba(75, 50, 130, 0.8)"],
  },
  {
    id: "spark-starter",
    title: "Spark Starter",
    description: "Send 10 prompts",
    icon: "flash-outline",
    requirement: 10,
    requirementType: "prompts",
    gradient: ["rgba(255, 79, 183, 0.8)", "rgba(156, 107, 255, 0.8)"],
  },
  {
    id: "vibe-keeper",
    title: "Vibe Keeper",
    description: "3-day streak",
    icon: "flame-outline",
    requirement: 3,
    requirementType: "streak",
    gradient: ["rgba(46, 230, 169, 0.8)", "rgba(25, 135, 195, 0.8)"],
  },
  {
    id: "social-butterfly",
    title: "Social Butterfly",
    description: "Connect with 5 friends",
    icon: "people-outline",
    requirement: 5,
    requirementType: "friends",
    gradient: ["rgba(255, 183, 77, 0.8)", "rgba(255, 138, 101, 0.8)"],
  },
  {
    id: "mystery-master",
    title: "Mystery Master",
    description: "Complete 10 matches",
    icon: "eye-outline",
    requirement: 10,
    requirementType: "matches",
    gradient: ["rgba(156, 107, 255, 0.8)", "rgba(255, 79, 183, 0.8)"],
  },
  {
    id: "point-collector",
    title: "Point Collector",
    description: "Earn 100 points",
    icon: "diamond-outline",
    requirement: 100,
    requirementType: "points",
    gradient: ["rgba(46, 230, 169, 0.8)", "rgba(156, 107, 255, 0.8)"],
  },
  {
    id: "streak-champion",
    title: "Streak Champion",
    description: "Maintain 7-day streak",
    icon: "trophy-outline",
    requirement: 7,
    requirementType: "streak",
    gradient: ["rgba(255, 215, 0, 0.8)", "rgba(255, 140, 0, 0.8)"],
  },
  {
    id: "conversation-pro",
    title: "Conversation Pro",
    description: "Send 50 prompts",
    icon: "chatbubbles-outline",
    requirement: 50,
    requirementType: "prompts",
    gradient: ["rgba(138, 43, 226, 0.8)", "rgba(255, 20, 147, 0.8)"],
  },
  {
    id: "legendary",
    title: "Legendary",
    description: "Earn 500 points",
    icon: "star-outline",
    requirement: 500,
    requirementType: "points",
    gradient: ["rgba(255, 215, 0, 0.9)", "rgba(255, 165, 0, 0.9)"],
  },
];

/**
 * Get user's badge progress
 */
export const getUserBadges = async (
  uid: string
): Promise<UserBadges | null> => {
  try {
    const userBadgesRef = doc(db, USER_BADGES_COLLECTION, uid);
    const docSnap = await getDoc(userBadgesRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserBadges;
    }

    return null;
  } catch (error) {
    console.error("❌ Error getting user badges:", error);
    throw error;
  }
};

/**
 * Initialize user badges
 */
export const initializeUserBadges = async (uid: string): Promise<void> => {
  try {
    const userBadgesRef = doc(db, USER_BADGES_COLLECTION, uid);

    await setDoc(userBadgesRef, {
      uid,
      unlockedBadges: [],
      totalBadges: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ User badges initialized:", uid);
  } catch (error) {
    console.error("❌ Error initializing user badges:", error);
    throw error;
  }
};

/**
 * Unlock a badge for a user
 */
export const unlockBadge = async (
  uid: string,
  badgeId: string
): Promise<void> => {
  try {
    const userBadgesRef = doc(db, USER_BADGES_COLLECTION, uid);
    const docSnap = await getDoc(userBadgesRef);

    if (!docSnap.exists()) {
      await initializeUserBadges(uid);
    }

    await updateDoc(userBadgesRef, {
      unlockedBadges: arrayUnion(badgeId),
      totalBadges: (docSnap.data()?.totalBadges || 0) + 1,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Badge unlocked: ${badgeId} for user ${uid}`);
  } catch (error) {
    console.error("❌ Error unlocking badge:", error);
    throw error;
  }
};

/**
 * Check and unlock badges based on user progress
 */
export const checkAndUnlockBadges = async (
  uid: string,
  stats: {
    points: number;
    streak: number;
    promptsSent?: number;
    friendsCount?: number;
    matchesCount?: number;
  }
): Promise<string[]> => {
  try {
    const userBadges = await getUserBadges(uid);
    const unlockedBadges = userBadges?.unlockedBadges || [];
    const newlyUnlocked: string[] = [];

    for (const badge of ALL_BADGES) {
      // Skip if already unlocked
      if (unlockedBadges.includes(badge.id)) {
        continue;
      }

      let shouldUnlock = false;

      switch (badge.requirementType) {
        case "points":
          shouldUnlock = stats.points >= badge.requirement;
          break;
        case "streak":
          shouldUnlock = stats.streak >= badge.requirement;
          break;
        case "prompts":
          shouldUnlock = (stats.promptsSent || 0) >= badge.requirement;
          break;
        case "friends":
          shouldUnlock = (stats.friendsCount || 0) >= badge.requirement;
          break;
        case "matches":
          shouldUnlock = (stats.matchesCount || 0) >= badge.requirement;
          break;
      }

      if (shouldUnlock) {
        await unlockBadge(uid, badge.id);
        newlyUnlocked.push(badge.id);
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error("❌ Error checking badges:", error);
    throw error;
  }
};

/**
 * Get badge details by ID
 */
export const getBadgeById = (badgeId: string): Badge | undefined => {
  return ALL_BADGES.find((badge) => badge.id === badgeId);
};

/**
 * Get all unlocked badge details for a user
 */
export const getUnlockedBadgeDetails = async (
  uid: string
): Promise<Badge[]> => {
  try {
    const userBadges = await getUserBadges(uid);
    if (!userBadges) {
      return [];
    }

    return userBadges.unlockedBadges
      .map((badgeId) => getBadgeById(badgeId))
      .filter((badge): badge is Badge => badge !== undefined);
  } catch (error) {
    console.error("❌ Error getting unlocked badge details:", error);
    throw error;
  }
};
