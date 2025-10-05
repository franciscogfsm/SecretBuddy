import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFriendsLeaderboard,
  getCountryLeaderboard,
  LeaderboardEntry,
  LeaderboardResponse,
} from "../services/leaderboardService";

interface CachedLeaderboardData {
  friends: LeaderboardEntry[];
  country: LeaderboardEntry[];
  timestamp: number;
}

const CACHE_KEY = "leaderboard_cache";
const CACHE_TTL_MS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

/**
 * Custom hook for cached leaderboard data
 * Caches leaderboard data in AsyncStorage with 5-hour TTL
 * Only fetches from server if cache is missing or expired
 */
export const useCachedLeaderboards = (userId: string | undefined) => {
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<
    LeaderboardEntry[]
  >([]);
  const [countryLeaderboard, setCountryLeaderboard] = useState<
    LeaderboardEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  /**
   * Load leaderboards from cache or fetch fresh data
   */
  const loadLeaderboards = useCallback(
    async (forceRefresh = false) => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Step 1: Try to load from cache
        if (!forceRefresh) {
          const cachedData = await AsyncStorage.getItem(CACHE_KEY);

          if (cachedData) {
            const parsed: CachedLeaderboardData = JSON.parse(cachedData);
            const age = Date.now() - parsed.timestamp;

            // Check if cache is still valid (less than 5 hours old)
            if (age < CACHE_TTL_MS) {
              setFriendsLeaderboard(parsed.friends || []);
              setCountryLeaderboard(parsed.country || []);
              setCacheAge(age);
              setLoading(false);
              return;
            } else {
              // Cache expired, fetching fresh data...
            }
          }
        } else {
          // Force refresh requested, fetching fresh data...
        }

        // Step 2: Cache miss or expired - fetch fresh data
        const [friendsData, countryData] = await Promise.all([
          getFriendsLeaderboard(userId).catch((err) => {
            console.error("Error loading friends leaderboard:", err);
            return {
              success: false,
              type: "friends" as const,
              leaderboard: [],
            };
          }),
          getCountryLeaderboard(userId, 10).catch((err) => {
            console.error("Error loading country leaderboard:", err);
            return {
              success: false,
              type: "country" as const,
              leaderboard: [],
            };
          }),
        ]);

        const newData: CachedLeaderboardData = {
          friends: friendsData.leaderboard || [],
          country: countryData.leaderboard || [],
          timestamp: Date.now(),
        };

        // Step 3: Save to cache
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newData));

        setFriendsLeaderboard(newData.friends);
        setCountryLeaderboard(newData.country);
        setCacheAge(0);
      } catch (error) {
        console.error("❌ Error loading leaderboards:", error);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  /**
   * Clear cache and force refresh
   */
  const refreshLeaderboards = useCallback(async () => {
    await AsyncStorage.removeItem(CACHE_KEY);
    await loadLeaderboards(true);
  }, [loadLeaderboards]);

  /**
   * Get cache info (for debugging/display)
   */
  const getCacheInfo = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (!cachedData) return null;

      const parsed: CachedLeaderboardData = JSON.parse(cachedData);
      const age = Date.now() - parsed.timestamp;
      const isExpired = age >= CACHE_TTL_MS;

      return {
        age,
        ageInMinutes: Math.round(age / 1000 / 60),
        ageInHours: Math.round(age / 1000 / 60 / 60),
        isExpired,
        expiresIn: CACHE_TTL_MS - age,
        expiresInMinutes: Math.round((CACHE_TTL_MS - age) / 1000 / 60),
      };
    } catch (error) {
      console.error("Error getting cache info:", error);
      return null;
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadLeaderboards();
  }, [loadLeaderboards]);

  return {
    friendsLeaderboard,
    countryLeaderboard,
    loading,
    cacheAge,
    refreshLeaderboards,
    getCacheInfo,
  };
};
