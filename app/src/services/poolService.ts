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
  writeBatch,
  updateDoc,
  increment,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../config/firebase";
import { getUserProfile } from "./userService";

// ⚡ Cache configuration for server time offset
const SERVER_TIME_CACHE_KEY = "@server_time_offset";
const SERVER_TIME_CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface ServerTimeCache {
  offset: number; // Server time - Device time (in milliseconds)
  cachedAt: number; // When this was cached (timestamp)
}

/**
 * Get cached server time offset or fetch new one
 * ⚡ Optimized: Only fetches from Firestore once per hour
 * Reduces Firestore reads from ~100/day to ~24/day per user
 */
export const getServerTimeOffset = async (): Promise<number> => {
  try {
    // Try to get cached offset
    const cachedData = await AsyncStorage.getItem(SERVER_TIME_CACHE_KEY);

    if (cachedData) {
      const cache: ServerTimeCache = JSON.parse(cachedData);
      const now = Date.now();

      // Check if cache is still valid (less than 1 hour old)
      if (now - cache.cachedAt < SERVER_TIME_CACHE_DURATION) {
        return cache.offset;
      }
    }

    // Cache expired or doesn't exist, fetch new server time
    console.log("🔄 Fetching fresh server time offset...");
    const serverTime = await getServerTime();
    const deviceTime = Date.now();
    const offset = serverTime.getTime() - deviceTime;

    // Cache the offset
    const cacheData: ServerTimeCache = {
      offset,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(
      SERVER_TIME_CACHE_KEY,
      JSON.stringify(cacheData)
    );

    console.log("💾 Cached server time offset:", offset);
    return offset;
  } catch (error) {
    console.error("❌ Error getting server time offset:", error);
    return 0; // Fallback: no offset
  }
};

/**
 * Get current server time from Firestore (protects against device time manipulation)
 * Uses a dummy write to trigger serverTimestamp, then reads it back
 * Returns UTC time from server (not affected by device timezone or manual changes)
 * ⚠️ This function performs Firestore read/write - use getServerTimeOffset() instead for caching
 */
export const getServerTime = async (): Promise<Date> => {
  try {
    // Create a temporary document with server timestamp
    const tempDocRef = doc(db, "_serverTime", "current");
    await setDoc(tempDocRef, {
      timestamp: serverTimestamp(),
    });

    // Read it back to get the actual server time (UTC)
    const tempDoc = await getDoc(tempDocRef);
    if (tempDoc.exists()) {
      const serverTimestamp = tempDoc.data().timestamp as Timestamp;
      const serverTime = serverTimestamp.toDate();

      console.log(`🌍 Server time (UTC): ${serverTime.toISOString()}`);
      console.log(`📍 Local time: ${new Date().toISOString()}`);

      return serverTime; // Returns Date object with server's UTC time
    }

    // Fallback to local time if something fails
    console.warn("⚠️ Could not get server time, using local time");
    return new Date();
  } catch (error) {
    console.error("❌ Error getting server time:", error);
    return new Date();
  }
};

/**
 * Get server time converted to local timezone
 * Used for UI display purposes (show user their local time)
 */
export const getServerTimeLocal = async (): Promise<Date> => {
  const serverTime = await getServerTime(); // Get UTC time from server

  // Server time is already a Date object, JavaScript automatically handles timezone
  // When you display it, it will show in user's local timezone
  return serverTime;
};

export interface Pool {
  id: string;
  type: string; // "hourly-10h", "hourly-11h", etc.
  date: string;
  hour: number; // 10, 11, 12, 13, 14, 15, 16, 17
  joinWindowStart: Timestamp;
  joinWindowEnd: Timestamp;
  photoWindowStart: Timestamp;
  photoWindowEnd: Timestamp;
  maxPhotos: number;
  photoTimes: Timestamp[]; // Array of scheduled photo notification times
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
  poolType: string; // "hourly-10h", "hourly-11h", etc.
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
  poolType: string; // "hourly-10h", "hourly-11h", etc.
  gameMode: "friends" | "country" | "world";
  joinedAt: Timestamp;
  country?: string;
}

const POOLS_COLLECTION = "pools";
const PAIRS_COLLECTION = "pairs";
const POOL_USERS_COLLECTION = "poolUsers";

// ⚡ In-memory cache for current pool (reduces repeated Firestore reads)
let currentPoolCache: {
  pool: Pool | null;
  cachedAt: number;
  hour: number;
} | null = null;
const POOL_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (pool changes every hour, so safe to cache)

// ⚡ Cache for current pair data (reduces repeated pair queries)
let currentPairCache: {
  pair: Pair | null;
  cachedAt: number;
  userId: string;
} | null = null;
const PAIR_CACHE_DURATION = 30 * 1000; // 30 seconds (pair status changes frequently but not constantly)

/**
 * Invalidate pair cache for a specific user
 * Call this when pair data changes (joining pool, pairing, etc.)
 */
const invalidatePairCache = (userId?: string) => {
  if (!userId || !currentPairCache || currentPairCache.userId === userId) {
    currentPairCache = null;
  }
};

/**
 * Get current active pool (if any)
 * Uses Firestore server time to prevent device clock manipulation
 * ✅ TIMEZONE SAFE: Uses server UTC time, not device time
 * ⚡ OPTIMIZED: Caches pool for 5 minutes to reduce Firestore reads
 */
export const getCurrentPool = async (): Promise<Pool | null> => {
  try {
    // ✅ Get server time offset (cached - no Firestore read)
    const offset = await getServerTimeOffset();
    const serverTime = new Date(Date.now() + offset);
    const hour = serverTime.getUTCHours();

    // ⚡ Check cache first (if same hour and less than 5 minutes old)
    if (currentPoolCache) {
      const cacheAge = Date.now() - currentPoolCache.cachedAt;
      if (currentPoolCache.hour === hour && cacheAge < POOL_CACHE_DURATION) {
        return currentPoolCache.pool;
      }
    }

    // Cache miss or expired - fetch from Firestore
    const dateStr = serverTime.toISOString().split("T")[0]; // YYYY-MM-DD (always UTC date)

    console.log(`🕐 Server UTC: ${serverTime.toISOString()}`);
    console.log(`🎯 Checking pool: ${dateStr}-${hour}h (UTC)`);

    // ✅ Hourly pools from 09:00 to 16:00 UTC (10:00-17:00 Portugal)
    if (hour < 9 || hour >= 17) {
      console.log(`⏰ Outside pool hours (${hour}:00 UTC)`);
      currentPoolCache = { pool: null, cachedAt: Date.now(), hour };
      return null; // Outside pool hours
    }

    const poolId = `${dateStr}-${hour}h`;
    const poolDoc = await getDoc(doc(db, POOLS_COLLECTION, poolId));

    if (!poolDoc.exists()) {
      console.log(`❌ Pool ${poolId} not found`);
      currentPoolCache = { pool: null, cachedAt: Date.now(), hour };
      return null;
    }

    console.log(`✅ Found pool: ${poolId}`);
    const pool = {
      id: poolDoc.id,
      ...poolDoc.data(),
    } as Pool;

    // Update cache
    currentPoolCache = { pool, cachedAt: Date.now(), hour };
    return pool;
  } catch (error) {
    console.error("❌ Error getting current pool:", error);
    throw error;
  }
};

/**
 * Join a pool (uses sharded structure)
 * ✅ SCALE OPTIMIZED: Automatically assigns users to shards (max 10k per shard)
 */
export const joinPool = async (
  userId: string,
  poolId: string,
  gameMode: "friends" | "country" | "world"
): Promise<void> => {
  try {
    // Get user's country from profile
    const userProfile = await getUserProfile(userId);

    // Extract pool type from poolId (e.g., "2025-10-04-13h" -> "hourly-13h")
    const hourMatch = poolId.match(/(\d+)h$/);
    const poolType = hourMatch ? `hourly-${hourMatch[0]}` : poolId;

    // Get pool document to find available shard
    const poolDoc = await getDoc(doc(db, POOLS_COLLECTION, poolId));
    if (!poolDoc.exists()) {
      throw new Error(`Pool ${poolId} not found`);
    }

    const poolData = poolDoc.data();
    const currentShard = poolData.currentShard || 0;
    const shardUserCounts = poolData.shardUserCounts || { 0: 0 };

    // Find available shard (max 10k users per shard)
    const MAX_USERS_PER_SHARD = 10000;
    let targetShard = currentShard;

    // If current shard is full, use next shard
    if (shardUserCounts[currentShard] >= MAX_USERS_PER_SHARD) {
      targetShard = currentShard + 1;
      console.log(
        `📊 Shard ${currentShard} full (${shardUserCounts[currentShard]} users), moving to shard ${targetShard}`
      );
    }

    // Create pool user entry in shard
    const poolUserDoc = doc(
      db,
      POOLS_COLLECTION,
      poolId,
      "shards",
      `shard_${targetShard}`,
      "poolUsers",
      userId
    );

    await setDoc(poolUserDoc, {
      userId,
      poolId,
      poolType,
      gameMode,
      joinedAt: serverTimestamp(),
      country: userProfile?.country || undefined,
    });

    // ✅ FIX: Update pool metadata (shard counts)
    const poolRef = doc(db, POOLS_COLLECTION, poolId);
    await updateDoc(poolRef, {
      [`shardUserCounts.${targetShard}`]: increment(1),
      userCount: increment(1),
      // If we created a new shard, update currentShard
      ...(targetShard > currentShard && { currentShard: targetShard }),
    });

    console.log(
      `✅ User ${userId} joined pool ${poolId} (shard_${targetShard})`
    );

    // ⚡ Invalidate pair cache since user status changed
    invalidatePairCache(userId);
  } catch (error) {
    console.error("❌ Error joining pool:", error);
    throw error;
  }
};

/**
 * Leave a pool (before pairing happens)
 * ✅ SCALE OPTIMIZED: Searches all shards to find user
 */
export const leavePool = async (
  userId: string,
  poolId: string
): Promise<void> => {
  try {
    // Get pool document to find which shard the user is in
    const poolDoc = await getDoc(doc(db, POOLS_COLLECTION, poolId));
    if (!poolDoc.exists()) {
      throw new Error(`Pool ${poolId} not found`);
    }

    const poolData = poolDoc.data();
    const currentShard = poolData.currentShard || 0;

    // Check all shards (from 0 to currentShard)
    for (let shardId = 0; shardId <= currentShard; shardId++) {
      const poolUserDoc = doc(
        db,
        POOLS_COLLECTION,
        poolId,
        "shards",
        `shard_${shardId}`,
        "poolUsers",
        userId
      );

      const userDoc = await getDoc(poolUserDoc);
      if (userDoc.exists()) {
        await deleteDoc(poolUserDoc);

        // ✅ FIX: Decrement pool metadata
        const poolRef = doc(db, POOLS_COLLECTION, poolId);
        await updateDoc(poolRef, {
          [`shardUserCounts.${shardId}`]: increment(-1),
          userCount: increment(-1),
        });

        console.log(`✅ User ${userId} left pool ${poolId} (shard_${shardId})`);
        // ⚡ Invalidate pair cache since user status changed
        invalidatePairCache(userId);
        return;
      }
    }

    console.log(`⚠️ User ${userId} not found in pool ${poolId}`);
  } catch (error) {
    console.error("❌ Error leaving pool:", error);
    throw error;
  }
};

/**
 * Check if user is in a pool
 * ✅ SCALE OPTIMIZED: Searches all shards
 */
export const isUserInPool = async (
  userId: string,
  poolId: string
): Promise<boolean> => {
  try {
    // Get pool document to find which shard to check
    const poolDoc = await getDoc(doc(db, POOLS_COLLECTION, poolId));
    if (!poolDoc.exists()) {
      return false;
    }

    const poolData = poolDoc.data();
    const currentShard = poolData.currentShard || 0;

    // Check all shards (from 0 to currentShard)
    for (let shardId = 0; shardId <= currentShard; shardId++) {
      const poolUserDoc = doc(
        db,
        POOLS_COLLECTION,
        poolId,
        "shards",
        `shard_${shardId}`,
        "poolUsers",
        userId
      );

      const userDoc = await getDoc(poolUserDoc);
      if (userDoc.exists()) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("❌ Error checking pool membership:", error);
    return false;
  }
};

/**
 * Get user's current pair (if any)
 * ⚡ OPTIMIZED: Caches pair data for 30 seconds to reduce Firestore reads
 */
export const getMyCurrentPair = async (
  userId: string
): Promise<Pair | null> => {
  try {
    // ⚡ Check cache first (if same user and less than 30 seconds old)
    if (currentPairCache) {
      const cacheAge = Date.now() - currentPairCache.cachedAt;
      if (
        currentPairCache.userId === userId &&
        cacheAge < PAIR_CACHE_DURATION
      ) {
        return currentPairCache.pair;
      }
    }

    // Cache miss or expired - fetch from Firestore
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

    let pair: Pair | null = null;
    if (pairDoc) {
      pair = {
        id: pairDoc.id,
        ...pairDoc.data(),
      } as Pair;
    }

    // Update cache
    currentPairCache = { pair, cachedAt: Date.now(), userId };
    return pair;
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
 * ✅ Uses server time offset to prevent device time manipulation
 * @param pair - The pair to check
 * @param serverTimeOffset - Optional offset in ms (server time - device time)
 */
export const isInPhotoWindow = (
  pair: Pair,
  serverTimeOffset: number = 0
): boolean => {
  // Use server-adjusted time instead of device time
  const now = new Date(Date.now() + serverTimeOffset);
  const start = pair.photoWindowStart.toDate();
  const end = pair.photoWindowEnd.toDate();

  return now >= start && now <= end;
};

/**
 * Check if it's reveal time for my pair
 * ✅ Reveal window: From revealAt until midnight (00:00 next day)
 * ✅ Uses server time offset to prevent device time manipulation
 * @param pair - The pair to check
 * @param serverTimeOffset - Optional offset in ms (server time - device time)
 */
export const isRevealTime = (
  pair: Pair,
  serverTimeOffset: number = 0
): boolean => {
  // Use server-adjusted time instead of device time
  const now = new Date(Date.now() + serverTimeOffset);
  const revealTime = pair.revealAt.toDate();

  // Check if we've reached reveal time
  if (now < revealTime) {
    return false;
  }

  // Check if it's still the same day (before midnight)
  const revealDate = new Date(revealTime);
  const midnight = new Date(revealDate);
  midnight.setDate(midnight.getDate() + 1); // Next day
  midnight.setHours(0, 0, 0, 0); // Midnight

  // Reveal card shows from revealAt until midnight
  const isBeforeMidnight = now < midnight;

  return isBeforeMidnight;
};

/**
 * Check if reveal window is currently open (used for UI display)
 * Shows reveal window status in local time
 */
export const isRevealWindowOpen = (serverTimeOffset: number = 0): boolean => {
  const now = new Date(Date.now() + serverTimeOffset);
  const currentHour = now.getUTCHours();

  // Reveal window: 21:00-22:00 UTC (22:00-23:00 Portugal)
  return currentHour >= 21 && currentHour < 22;
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
