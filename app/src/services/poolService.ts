import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getUserProfile } from "./userService";

export interface Pool {
  id: string;
  type: "morning" | "afternoon";
  date: string;
  joinWindowStart: Timestamp;
  joinWindowEnd: Timestamp;
  photoWindowStart: Timestamp;
  photoWindowEnd: Timestamp;
  maxPhotos: number;
  revealAt: Timestamp;
  status: "open" | "pairing" | "closed";
  userCount: number;
  pairsCount: number;
}

export interface Pair {
  id: string;
  userA: string;
  userB: string;
  poolId: string;
  poolType: "morning" | "afternoon";
  pairedAt: Timestamp;
  photoWindowStart: Timestamp;
  photoWindowEnd: Timestamp;
  maxPhotos: number;
  revealAt: Timestamp;
  photosA: number;
  photosB: number;
  canRevealA: boolean;
  canRevealB: boolean;
  revealedA: boolean;
  revealedB: boolean;
  conversationId?: string;
  chatEndedAt?: Timestamp;
  status: "active" | "revealed" | "expired";
}

export interface PoolUser {
  userId: string;
  poolId: string;
  poolType: "morning" | "afternoon";
  gameMode: "friends" | "country" | "world";
  joinedAt: Timestamp;
  country?: string;
}

const POOLS_COLLECTION = "pools";
const PAIRS_COLLECTION = "pairs";
const POOL_USERS_COLLECTION = "poolUsers";

/**
 * Get current active pool (if any)
 */
export const getCurrentPool = async (): Promise<Pool | null> => {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const hour = now.getUTCHours();

    // Determine which pool should be active
    let poolType: "morning" | "afternoon" | null = null;

    if (hour >= 8 && hour < 13) {
      poolType = "morning";
    } else if (hour >= 13 && hour < 17) {
      poolType = "afternoon";
    }

    if (!poolType) {
      return null; // Outside pool hours
    }

    const poolId = `${poolType}-${dateStr}`;
    const poolDoc = await getDoc(doc(db, POOLS_COLLECTION, poolId));

    if (!poolDoc.exists()) {
      return null;
    }

    return {
      id: poolDoc.id,
      ...poolDoc.data(),
    } as Pool;
  } catch (error) {
    console.error("❌ Error getting current pool:", error);
    throw error;
  }
};

/**
 * Join a pool
 */
export const joinPool = async (
  userId: string,
  poolId: string,
  gameMode: "friends" | "country" | "world"
): Promise<void> => {
  try {
    // Get user's country from profile
    const userProfile = await getUserProfile(userId);

    // Create pool user entry
    const poolUserDoc = doc(db, POOL_USERS_COLLECTION, `${poolId}-${userId}`);
    await setDoc(poolUserDoc, {
      userId,
      poolId,
      poolType: poolId.startsWith("morning") ? "morning" : "afternoon",
      gameMode,
      joinedAt: serverTimestamp(),
      country: userProfile?.country || undefined,
    });

    console.log(`✅ User ${userId} joined pool ${poolId}`);
  } catch (error) {
    console.error("❌ Error joining pool:", error);
    throw error;
  }
};

/**
 * Leave a pool (before pairing happens)
 */
export const leavePool = async (
  userId: string,
  poolId: string
): Promise<void> => {
  try {
    const poolUserDoc = doc(db, POOL_USERS_COLLECTION, `${poolId}-${userId}`);
    await deleteDoc(poolUserDoc);

    console.log(`✅ User ${userId} left pool ${poolId}`);
  } catch (error) {
    console.error("❌ Error leaving pool:", error);
    throw error;
  }
};

/**
 * Check if user is in a pool
 */
export const isUserInPool = async (
  userId: string,
  poolId: string
): Promise<boolean> => {
  try {
    const poolUserDoc = await getDoc(
      doc(db, POOL_USERS_COLLECTION, `${poolId}-${userId}`)
    );
    return poolUserDoc.exists();
  } catch (error) {
    console.error("❌ Error checking pool membership:", error);
    return false;
  }
};

/**
 * Get user's current pair (if any)
 */
export const getMyCurrentPair = async (
  userId: string
): Promise<Pair | null> => {
  try {
    const pairsRef = collection(db, PAIRS_COLLECTION);

    // Query for pairs where user is either userA or userB and status is active
    const qA = query(
      pairsRef,
      where("userA", "==", userId),
      where("status", "==", "active")
    );

    const qB = query(
      pairsRef,
      where("userB", "==", userId),
      where("status", "==", "active")
    );

    const [snapshotA, snapshotB] = await Promise.all([
      getDocs(qA),
      getDocs(qB),
    ]);

    let pairDoc = null;

    if (!snapshotA.empty) {
      pairDoc = snapshotA.docs[0];
    } else if (!snapshotB.empty) {
      pairDoc = snapshotB.docs[0];
    }

    if (!pairDoc) {
      return null;
    }

    return {
      id: pairDoc.id,
      ...pairDoc.data(),
    } as Pair;
  } catch (error) {
    console.error("❌ Error getting current pair:", error);
    throw error;
  }
};

/**
 * Get partner's user ID from pair
 */
export const getPartnerIdFromPair = (pair: Pair, myUserId: string): string => {
  return pair.userA === myUserId ? pair.userB : pair.userA;
};

/**
 * Check if it's photo window time for my pair
 */
export const isInPhotoWindow = (pair: Pair): boolean => {
  const now = new Date();
  const start = pair.photoWindowStart.toDate();
  const end = pair.photoWindowEnd.toDate();

  return now >= start && now <= end;
};

/**
 * Check if it's reveal time for my pair
 */
export const isRevealTime = (pair: Pair): boolean => {
  const now = new Date();
  const revealTime = pair.revealAt.toDate();

  return now >= revealTime;
};

/**
 * Can I reveal? (sent at least 1 photo)
 */
export const canIReveal = (pair: Pair, myUserId: string): boolean => {
  if (pair.userA === myUserId) {
    return pair.canRevealA;
  } else {
    return pair.canRevealB;
  }
};

/**
 * Get time remaining until photo window opens
 */
export const getTimeUntilPhotoWindow = (pair: Pair): number => {
  const now = new Date();
  const start = pair.photoWindowStart.toDate();
  return start.getTime() - now.getTime();
};

/**
 * Get time remaining until photo window closes
 */
export const getTimeUntilPhotoWindowClose = (pair: Pair): number => {
  const now = new Date();
  const end = pair.photoWindowEnd.toDate();
  return end.getTime() - now.getTime();
};

/**
 * Get time remaining until reveal
 */
export const getTimeUntilReveal = (pair: Pair): number => {
  const now = new Date();
  const revealTime = pair.revealAt.toDate();
  return revealTime.getTime() - now.getTime();
};

/**
 * Get my photo count from pair
 */
export const getMyPhotoCount = (pair: Pair, myUserId: string): number => {
  return pair.userA === myUserId ? pair.photosA : pair.photosB;
};

/**
 * Format time remaining as string
 */
export const formatTimeRemaining = (milliseconds: number): string => {
  if (milliseconds <= 0) return "Now!";

  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};
