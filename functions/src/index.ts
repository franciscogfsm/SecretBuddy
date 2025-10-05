import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { CloudTasksClient } from "@google-cloud/tasks";

// Don't initialize at module load - causes timeout
let initialized = false;
function initAdmin() {
  if (!initialized) {
    admin.initializeApp();
    initialized = true;
  }
}

// Cloud Tasks setup - lazy initialize to avoid deployment timeouts
let tasksClient: CloudTasksClient | null = null;

function getTasksClient(): CloudTasksClient {
  if (!tasksClient) {
    tasksClient = new CloudTasksClient();
  }
  return tasksClient;
}

// Get configuration from Firebase functions config
const config = functions.config();
const PROJECT = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
const LOCATION = config?.tasks?.location || "us-central1";
const QUEUE = config?.tasks?.queue || "reveal-queue-now";
const REVEAL_HANDLER_URL =
  config?.tasks?.handler_url ||
  `https://${LOCATION}-${PROJECT}.cloudfunctions.net/sendRevealForPair`;
const PHOTO_HANDLER_URL =
  config?.tasks?.photo_handler_url ||
  `https://${LOCATION}-${PROJECT}.cloudfunctions.net/sendPhotoForPool`;

// ==================== PHOTO CLEANUP ====================

/**
 * PHOTO CLEANUP OPTIMIZATION
 * - Storage: Handled by GCS Lifecycle Rules (auto-delete after 24h)
 * - Firestore: Uses TTL Index on photoChallenge.expireAt field (auto-delete)
 * - This function only handles soft-delete for unviewed 4h+ photos
 *
 * GCS Lifecycle Rule (set via console or gcloud):
 * {
 *   "lifecycle": {
 *     "rule": [{
 *       "action": {"type": "Delete"},
 *       "condition": {"age": 1, "matchesPrefix": ["photoChallenge/"]}
 *     }]
 *   }
 * }
 *
 * Firestore TTL Index (set via console):
 * Collection: photoChallenge
 * Field: expireAt
 * Query Scope: Collection
 */

// Shared cleanup logic (simplified - only soft deletes)
async function performCleanup() {
  initAdmin();
  const db = admin.firestore();

  const now = Date.now();
  const FOUR_HOURS = 4 * 60 * 60 * 1000;

  const photosRef = db.collection("photoChallenge");
  const snapshot = await photosRef
    .where("viewed", "==", false)
    .where(
      "timestamp",
      "<",
      admin.firestore.Timestamp.fromMillis(now - FOUR_HOURS)
    )
    .get();

  let softDeleted = 0;
  const batch = db.batch();

  snapshot.forEach((doc) => {
    // Soft delete unviewed 4h+ photos
    batch.update(doc.ref, {
      deleted: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    softDeleted++;
  });

  if (softDeleted > 0) {
    await batch.commit();
  }

  // Also clean up per-user photoChallenges subcollections (created under users/{uid}/photoChallenges)
  // Use collectionGroup to find expired challenges by expiresAt
  let softDeletedSub = 0;
  try {
    const expiredSnapshot = await db
      .collectionGroup("photoChallenges")
      .where("expiresAt", "<", admin.firestore.Timestamp.now())
      .get();

    if (!expiredSnapshot.empty) {
      const docs = expiredSnapshot.docs;

      // Commit in batches to avoid exceeding 500 writes
      for (let i = 0; i < docs.length; i += 450) {
        const chunk = docs.slice(i, i + 450);
        const subBatch = db.batch();
        chunk.forEach((d) => {
          subBatch.update(d.ref, {
            deleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "expired",
          });
          softDeletedSub++;
        });
        await subBatch.commit();
      }
    }
  } catch (e) {
    console.warn("⚠️ Error cleaning user photoChallenges collectionGroup:", e);
  }

  console.log("✅ Cleanup complete", {
    softDeleted,
    softDeletedSub,
    totalProcessed: snapshot.size,
  });

  return { softDeleted, softDeletedSub };
}

// Scheduled function - runs every 4 hours automatically
export const cleanupOldPhotos = functions
  .runWith({ timeoutSeconds: 540, memory: "256MB" })
  .pubsub.schedule("every 4 hours")
  .timeZone("UTC")
  .onRun(async () => {
    return await performCleanup();
  });

// HTTP function for manual testing/invocation
export const manualCleanupPhotos = functions
  .runWith({ timeoutSeconds: 540, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    try {
      const result = await performCleanup();
      res.status(200).json({
        success: true,
        message: "Cleanup completed successfully",
        ...result,
      });
    } catch (error: any) {
      console.error("Manual cleanup error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

// ==================== DAILY CLEANUP ====================

/**
 * Daily cleanup at 00:01 UTC (1 minute after new pools are created)
 * Deletes:
 * 1. poolUsers from previous day
 * 2. pools from previous day (only if today's pools exist)
 * 3. messages older than 2 days
 * 4. photo challenges older than 1 day
 * 5. photos from storage older than 1 day
 */
export const dailyCleanup = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("1 0 * * *") // Every day at 00:01 UTC
  .timeZone("UTC")
  .onRun(async () => {
    initAdmin();
    const db = admin.firestore();

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    console.log(`🧹 Starting daily cleanup for ${yesterdayStr}`);

    let poolUsersDeleted = 0;
    let poolsDeleted = 0;
    let messagesDeleted = 0;
    let photoChallengesDeleted = 0;
    let photosDeletedFromStorage = 0;

    // 1. Delete poolUsers from previous day
    console.log("🗑️ Deleting poolUsers from previous day...");
    const poolUsersSnapshot = await db
      .collection("poolUsers")
      .where("poolId", ">=", yesterdayStr)
      .where("poolId", "<", `${yesterdayStr}~`) // ~ is after all numbers/letters
      .get();

    const poolUsersBatch = db.batch();
    poolUsersSnapshot.forEach((doc) => {
      poolUsersBatch.delete(doc.ref);
      poolUsersDeleted++;
    });

    // end of dailyCleanup's inline code block
    await poolUsersBatch.commit();

    // 2. Delete pools from previous day (only if today's pools exist)
    console.log("🗑️ Checking if today's pools exist...");
    const todayStr = now.toISOString().split("T")[0];
    const todayPoolsSnapshot = await db
      .collection("pools")
      .where("date", "==", todayStr)
      .get();

    if (!todayPoolsSnapshot.empty) {
      console.log("✅ Today's pools exist, deleting previous day's pools...");
      const yesterdayPoolsSnapshot = await db
        .collection("pools")
        .where("date", "==", yesterdayStr)
        .get();

      const poolsBatch = db.batch();
      yesterdayPoolsSnapshot.forEach((doc) => {
        poolsBatch.delete(doc.ref);
        poolsDeleted++;
      });
      await poolsBatch.commit();
    } else {
      console.log("⚠️ Today's pools don't exist yet, keeping previous pools");
    }

    // 3. Delete messages older than 2 days (using date-partitioned collections)
    console.log("🗑️ Deleting messages older than 2 days...");
    const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

    // Delete entire message collection for 2 days ago
    const messageCollectionName = `messages_${twoDaysAgoStr.replace(
      /-/g,
      "_"
    )}`;
    const messagesCollectionRef = db.collection(messageCollectionName);

    try {
      // Use bulk delete for efficiency
      const messagesSnapshot = await messagesCollectionRef.limit(500).get();
      if (!messagesSnapshot.empty) {
        const bulkWriter = db.bulkWriter();
        messagesSnapshot.docs.forEach((doc) => {
          bulkWriter.delete(doc.ref);
          messagesDeleted++;
        });
        await bulkWriter.close();
        console.log(
          `✅ Deleted ${messagesDeleted} messages from ${messageCollectionName}`
        );
      } else {
        console.log(`⚠️ No messages found in ${messageCollectionName}`);
      }
    } catch (e) {
      console.warn(`⚠️ Error deleting ${messageCollectionName}:`, e);
    }

    // 4. Photo challenges auto-deleted by Firestore TTL (expireAt field)
    // Note: GCS storage also auto-deleted by lifecycle rules (24h)
    // Run additional cleanup to ensure expired top-level photoChallenge docs
    // and per-user photoChallenges are soft-deleted and storage files removed.
    console.log(
      "ℹ️ Running additional photoChallenge cleanup (top-level + per-user)"
    );

    // Call shared cleanup first (handles unviewed 4h+ and per-user collectionGroup)
    try {
      const shared = await performCleanup();
      photoChallengesDeleted =
        (shared.softDeleted || 0) + (shared.softDeletedSub || 0);
    } catch (e) {
      console.warn("⚠️ performCleanup() failed:", e);
      photoChallengesDeleted = 0;
    }

    // Now clean top-level `photoChallenge` collection for expired documents
    try {
      const expiredSnap = await db
        .collection("photoChallenge")
        .where("expireAt", "<", admin.firestore.Timestamp.now())
        .get();

      let topDeleted = 0;
      let storageDeleted = 0;

      if (!expiredSnap.empty) {
        const docs = expiredSnap.docs;

        // Process in chunks to avoid large batches
        for (let i = 0; i < docs.length; i += 450) {
          const chunk = docs.slice(i, i + 450);
          const batch = db.batch();

          // Delete storage files in parallel for this chunk (if storagePath available)
          const deletePromises: Promise<any>[] = [];
          for (const d of chunk) {
            const data: any = d.data();
            if (data?.storagePath) {
              try {
                const file = admin.storage().bucket().file(data.storagePath);
                deletePromises.push(
                  file
                    .delete()
                    .then(() => {
                      storageDeleted++;
                    })
                    .catch((err: any) => {
                      console.warn(
                        "⚠️ Failed to delete storage file:",
                        data.storagePath,
                        err
                      );
                    })
                );
              } catch (err) {
                console.warn(
                  "⚠️ Storage deletion error for",
                  data.storagePath,
                  err
                );
              }
            }
          }

          // Await deletions for this chunk
          await Promise.all(deletePromises);

          // Soft-delete the Firestore documents in this chunk
          for (const d of chunk) {
            batch.update(d.ref, {
              deleted: true,
              deletedAt: admin.firestore.FieldValue.serverTimestamp(),
              status: "expired",
            });
            topDeleted++;
          }

          await batch.commit();
        }
      }

      photoChallengesDeleted = photoChallengesDeleted + topDeleted;
      photosDeletedFromStorage = storageDeleted; // Note: best-effort
    } catch (e) {
      console.warn("⚠️ Error cleaning top-level photoChallenge collection:", e);
    }

    console.log("✅ Daily cleanup complete", {
      poolUsersDeleted,
      poolsDeleted,
      messagesDeleted,
      photoChallengesDeleted,
      photosDeletedFromStorage,
      date: yesterdayStr,
    });

    return {
      success: true,
      poolUsersDeleted,
      poolsDeleted,
      messagesDeleted,
      photoChallengesDeleted,
      photosDeletedFromStorage,
    };
  });
// Scheduled cleanup: At 01:00 UTC delete/expire yesterday's pairs
export const cleanupYesterdayPairs = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 1 * * *") // 01:00 UTC every day
  .timeZone("UTC")
  .onRun(async () => {
    initAdmin();
    const db = admin.firestore();

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`🧹 Cleaning pairs from ${dateStr}`);

    // Query pairs that reference yesterday's pools
    // Pool IDs are in format `${dateStr}-${hour}h`
    const pairsRef = db.collection("pairs");
    const query = pairsRef
      .where("poolId", ">=", `${dateStr}-0`)
      .where("poolId", "<", `${dateStr}~`);

    const snapshot = await query.get();
    if (snapshot.empty) {
      console.log("⚠️ No pairs found for yesterday");
      return { success: true, processed: 0 };
    }

    let processed = 0;
    // Process in chunks to avoid large batches
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const chunk = docs.slice(i, i + 450);
      const batch = db.batch();
      chunk.forEach((d) => {
        // Soft-delete/expire the pair
        batch.update(d.ref, {
          status: "expired",
          deleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        processed++;
      });
      await batch.commit();
    }

    console.log(`✅ Expired ${processed} pairs from ${dateStr}`);
    return { success: true, processed };
  });

// ==================== POOL SYSTEM ====================

/**
 * POOL SHARDING SYSTEM
 * Each pool is sharded to handle high-scale (100k+ users):
 * - Structure: /pools/{poolId}/shards/{shardId}/poolUsers/{userId}
 * - Each shard holds max 10k users
 * - Shards are created dynamically as users join
 * - Queries and rollovers are contained per shard
 */

const MAX_USERS_PER_SHARD = 10000;

/**
 * Get or create a shard for a user joining a pool
 * Returns the shard ID with available capacity
 */
async function getAvailableShard(
  poolId: string,
  db: admin.firestore.Firestore
): Promise<string> {
  // Get pool metadata to track shard counts
  const poolRef = db.collection("pools").doc(poolId);
  const poolDoc = await poolRef.get();

  if (!poolDoc.exists) {
    throw new Error(`Pool ${poolId} not found`);
  }

  const poolData = poolDoc.data();
  const currentShard = poolData?.currentShard || 0;
  const shardUserCount = poolData?.shardUserCounts || {};

  // Check if current shard has capacity
  const currentShardCount = shardUserCount[currentShard] || 0;

  if (currentShardCount < MAX_USERS_PER_SHARD) {
    return `shard_${currentShard}`;
  }

  // Current shard is full, move to next shard
  const nextShard = currentShard + 1;
  await poolRef.update({
    currentShard: nextShard,
    [`shardUserCounts.${nextShard}`]: 0,
  });

  return `shard_${nextShard}`;
}

/**
 * Add user to a pool shard
 */
async function addUserToPoolShard(
  poolId: string,
  userId: string,
  userData: any,
  db: admin.firestore.Firestore
): Promise<string> {
  const shardId = await getAvailableShard(poolId, db);

  const userRef = db
    .collection("pools")
    .doc(poolId)
    .collection("shards")
    .doc(shardId)
    .collection("poolUsers")
    .doc(userId);

  await userRef.set({
    userId,
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...userData,
  });

  // Ensure the shard document exists (so .collection('shards').get() will return this shard)
  const shardRef = db
    .collection("pools")
    .doc(poolId)
    .collection("shards")
    .doc(shardId);
  await shardRef.set(
    {
      shardId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Increment shard user count
  await db
    .collection("pools")
    .doc(poolId)
    .update({
      [`shardUserCounts.${shardId.replace("shard_", "")}`]:
        admin.firestore.FieldValue.increment(1),
      userCount: admin.firestore.FieldValue.increment(1),
    });

  return shardId;
}

/**
 * Create daily hourly pools at midnight (00:00 UTC)
 * ✅ UPDATED: Creates 8 hourly pools: 09:00-16:00 UTC (10:00-17:00 Portugal)
 * Each pool:
 * - Opens at the hour (e.g., 09:00 UTC = 10:00 Portugal)
 * - Closes and pairs at the next hour (e.g., 10:00 UTC = 11:00 Portugal)
 * - Users get 2 photo notifications between join time and 21:00 UTC (22:00 Portugal)
 * - Reveal is always between 21:00-21:59 UTC (22:00-22:59 Portugal)
 * - Uses sharding system to handle 100k+ users per pool
 */
export const createDailyPools = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .pubsub.schedule("0 0 * * *") // Every day at midnight UTC
  .timeZone("UTC")
  .onRun(async () => {
    initAdmin();
    const db = admin.firestore();

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`📅 Creating hourly pools for ${dateStr}`);

    // ✅ Create 8 hourly pools: 9h-16h UTC (10h-17h Portugal)
    const poolHours = [9, 10, 11, 12, 13, 14, 15, 16];
    const batch = db.batch();

    // Random reveal time between 21:00-22:00 (same for all pools)
    // ✅ FIX: Reveal only 21:00-21:59 (not 22:xx)
    const revealHour = 21;
    const revealMin = Math.floor(Math.random() * 60); // 0-59 minutes
    const revealAt = new Date(now);
    revealAt.setHours(revealHour, revealMin, 0, 0);

    for (const hour of poolHours) {
      const poolId = `${dateStr}-${hour}h`;

      // Join window: From hour:00 to (hour+1):00
      const joinWindowStart = new Date(now);
      joinWindowStart.setHours(hour, 0, 0, 0);

      const joinWindowEnd = new Date(now);
      joinWindowEnd.setHours(hour + 1, 0, 0, 0);

      // Photo notification window: From hour:00 to 21:00 (2 photos)
      const photoWindowStart = new Date(now);
      photoWindowStart.setHours(hour, 0, 0, 0);

      const photoWindowEnd = new Date(now);
      photoWindowEnd.setHours(21, 0, 0, 0);

      // Calculate 2 photo times evenly spaced between hour and 21:00
      // Only if there's time (hour < 21)
      // ✅ FIX: Last photo must be max 20:45 (not later)
      const photoTimes: Date[] = [];
      if (hour < 21) {
        const hoursAvailable = 21 - hour;

        if (hoursAvailable >= 2) {
          // Space 2 photos evenly
          const spacing = hoursAvailable / 2;

          // First photo: hour + spacing/2
          const photo1Hour = hour + Math.floor(spacing / 2);
          const photo1Min = Math.floor(Math.random() * 60);
          const photo1 = new Date(now);
          photo1.setHours(photo1Hour, photo1Min, 0, 0);
          photoTimes.push(photo1);

          // Second photo: hour + spacing + spacing/2 (but max 20:45)
          let photo2Hour = hour + Math.floor(spacing * 1.5);
          let photo2Min = Math.floor(Math.random() * 60);

          // ✅ Enforce max 20:45
          if (photo2Hour > 20 || (photo2Hour === 20 && photo2Min > 45)) {
            photo2Hour = 20;
            photo2Min = Math.min(45, Math.floor(Math.random() * 46)); // 0-45
          }

          const photo2 = new Date(now);
          photo2.setHours(photo2Hour, photo2Min, 0, 0);
          photoTimes.push(photo2);
        } else if (hoursAvailable === 1) {
          // Only 1 hour left, send 1 photo at random time (but max 20:45)
          let photoHour = hour;
          let photoMin = Math.floor(Math.random() * 60);

          // ✅ Enforce max 20:45 if hour is 20
          if (photoHour === 20) {
            photoMin = Math.min(45, Math.floor(Math.random() * 46)); // 0-45
          }

          const photo = new Date(now);
          photo.setHours(photoHour, photoMin, 0, 0);
          photoTimes.push(photo);
        }
        // If hour >= 20, no photos (too close to reveal)
      }

      // Schedule Cloud Tasks for each photo time instead of storing in Firestore
      for (const photoTime of photoTimes) {
        await schedulePhotoTask(poolId, photoTime);
      }

      const poolRef = db.collection("pools").doc(poolId);
      batch.set(poolRef, {
        type: `hourly-${hour}h`,
        date: dateStr,
        hour,
        joinWindowStart: admin.firestore.Timestamp.fromDate(joinWindowStart),
        joinWindowEnd: admin.firestore.Timestamp.fromDate(joinWindowEnd),
        photoWindowStart: admin.firestore.Timestamp.fromDate(photoWindowStart),
        photoWindowEnd: admin.firestore.Timestamp.fromDate(photoWindowEnd),
        maxPhotos: photoTimes.length,
        // Removed photoTimes array - now using Cloud Tasks for scheduling
        revealAt: admin.firestore.Timestamp.fromDate(revealAt),
        status: "open",
        userCount: 0,
        pairsCount: 0,
        // Sharding metadata
        currentShard: 0,
        shardUserCounts: { 0: 0 },
      });

      // Also create initial shard document (shard_0) so shards collection exists
      const shardRef = db
        .collection("pools")
        .doc(poolId)
        .collection("shards")
        .doc("shard_0");
      batch.set(shardRef, {
        shardId: "shard_0",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userCount: 0,
      });

      console.log(
        `✅ Pool ${poolId} created: Join ${hour}:00-${hour + 1}:00, Photos: ${
          photoTimes.length
        }, Reveal ${revealHour}:${revealMin.toString().padStart(2, "0")}`
      );
    }

    await batch.commit();
    console.log(`✅ Created ${poolHours.length} hourly pools for ${dateStr}`);

    return { success: true, date: dateStr, pools: poolHours.length };
  });

/**
 * Close and pair hourly pools
 * ✅ UPDATED: Functions run at the END of each pool's window
 * Pool 9h UTC (10h PT): Opens 09:00, closes 10:00 → Function runs at 10:00
 * Pool 10h UTC (11h PT): Opens 10:00, closes 11:00 → Function runs at 11:00
 * etc.
 */

// 10:00 UTC - Pair users from 9h pool (09:00-10:00 UTC = 10:00-11:00 Portugal)
export const closePool9h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 10 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(9);
  });

// 11:00 UTC - Pair users from 10h pool (10:00-11:00 UTC = 11:00-12:00 Portugal)
export const closePool10h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 11 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(10);
  });

// 12:00 UTC - Pair users from 11h pool (11:00-12:00 UTC = 12:00-13:00 Portugal)
export const closePool11h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 12 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(11);
  });

// 13:00 UTC - Pair users from 12h pool (12:00-13:00 UTC = 13:00-14:00 Portugal)
export const closePool12h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 13 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(12);
  });

// 14:00 UTC - Pair users from 13h pool (13:00-14:00 UTC = 14:00-15:00 Portugal)
export const closePool13h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 14 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(13);
  });

// 15:00 UTC - Pair users from 14h pool (14:00-15:00 UTC = 15:00-16:00 Portugal)
export const closePool14h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 15 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(14);
  });

// 16:00 UTC - Pair users from 15h pool (15:00-16:00 UTC = 16:00-17:00 Portugal)
export const closePool15h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 16 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(15);
  });

// 17:00 UTC - Pair users from 16h pool (16:00-17:00 UTC = 17:00-18:00 Portugal)
export const closePool16h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 17 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(16);
  });

/**
 * Shared logic to close and pair an hourly pool
 * Now handles sharded pool structure
 */
async function closeHourlyPool(hour: number): Promise<any> {
  initAdmin();
  const db = admin.firestore();

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const poolId = `${dateStr}-${hour}h`;

  console.log(`🔒 Closing pool: ${poolId}`);

  const poolDoc = await db.collection("pools").doc(poolId).get();

  if (!poolDoc.exists) {
    console.log(`⚠️ Pool ${poolId} not found`);
    return { success: false, error: "Pool not found" };
  }

  await db.collection("pools").doc(poolId).update({
    status: "pairing",
  });

  // Get all shards for this pool
  const shardsSnapshot = await db
    .collection("pools")
    .doc(poolId)
    .collection("shards")
    .get();

  if (shardsSnapshot.empty) {
    console.log("⚠️ No shards found (no users joined)");
    await db.collection("pools").doc(poolId).update({ status: "closed" });
    return { success: true, pairs: 0, rolledOver: 0 };
  }

  console.log(`� Found ${shardsSnapshot.size} shard(s) in pool ${poolId}`);

  let totalPairs = 0;
  const allUnpairedUserIds: string[] = [];

  // Process each shard
  for (const shardDoc of shardsSnapshot.docs) {
    const shardId = shardDoc.id;
    console.log(`🔄 Processing shard: ${shardId}`);

    // Get all users in this shard
    const poolUsersSnapshot = await db
      .collection("pools")
      .doc(poolId)
      .collection("shards")
      .doc(shardId)
      .collection("poolUsers")
      .get();

    if (poolUsersSnapshot.empty) {
      console.log(`⚠️ Shard ${shardId} is empty`);
      continue;
    }

    console.log(`👥 Found ${poolUsersSnapshot.size} users in shard ${shardId}`);

    // Match users within this shard
    const { pairsCreated, unpairedUserIds } = await matchUsers(
      poolId,
      poolUsersSnapshot.docs,
      db
    );

    totalPairs += pairsCreated;
    allUnpairedUserIds.push(...unpairedUserIds);
  }

  await db.collection("pools").doc(poolId).update({
    status: "closed",
    pairsCount: totalPairs,
  });

  console.log(`✅ Pool ${poolId} closed. Created ${totalPairs} pairs`);

  // ROLLOVER: Move unpaired users to next pool (if exists and open)
  if (allUnpairedUserIds.length > 0) {
    const nextHour = hour + 1;

    // Only rollover if next hour is within valid pool range (9-16)
    if (nextHour <= 16) {
      const nextPoolId = `${dateStr}-${nextHour}h`;
      const nextPoolDoc = await db.collection("pools").doc(nextPoolId).get();

      if (nextPoolDoc.exists && nextPoolDoc.data()?.status === "open") {
        console.log(
          `🔄 Rolling over ${allUnpairedUserIds.length} unpaired users to next pool: ${nextPoolId}`
        );

        // Add unpaired users to next pool's shards
        for (const userId of allUnpairedUserIds) {
          // Find user data from any shard in current pool
          let userData = null;
          for (const shardDoc of shardsSnapshot.docs) {
            const userDoc = await db
              .collection("pools")
              .doc(poolId)
              .collection("shards")
              .doc(shardDoc.id)
              .collection("poolUsers")
              .doc(userId)
              .get();

            if (userDoc.exists) {
              userData = userDoc.data();
              break;
            }
          }

          if (userData) {
            // Add to next pool using sharding system
            await addUserToPoolShard(
              nextPoolId,
              userId,
              {
                priority: userData.priority || "world",
                country: userData.country,
                rolledOver: true,
                originalPoolId: poolId,
              },
              db
            );
          }
        }

        console.log(
          `✅ Rolled over ${allUnpairedUserIds.length} users to ${nextPoolId}`
        );
      } else {
        console.log(
          `⚠️ Cannot rollover: Next pool ${nextPoolId} doesn't exist or is not open`
        );
      }
    } else {
      console.log(
        `⚠️ Cannot rollover: No more pools today (hour ${nextHour} > 16)`
      );
    }
  }

  return {
    success: true,
    pairs: totalPairs,
    rolledOver: allUnpairedUserIds.length,
  };
}

/**
 * Match users in a pool
 * Priority: Friends > Same Country > Random
 * Returns: { pairsCreated, unpairedUserIds }
 * OPTIMIZED: Uses friends array in user docs instead of querying friendships collection
 * OPTIMIZED: Batches all pair creations and sends notifications once
 */
async function matchUsers(
  poolId: string,
  userDocs: admin.firestore.QueryDocumentSnapshot[],
  db: admin.firestore.Firestore
): Promise<{ pairsCreated: number; unpairedUserIds: string[] }> {
  const poolDoc = await db.collection("pools").doc(poolId).get();
  const poolData = poolDoc.data();

  if (!poolData) {
    throw new Error(`Pool ${poolId} not found`);
  }

  // FIX: Use userId field from document data, not doc.id (which includes poolId prefix)
  const users = userDocs.map((doc) => {
    const data = doc.data();
    return {
      id: data.userId || doc.id, // Use userId field, fallback to doc.id
      ...data,
    };
  }) as any[];

  const matched = new Set<string>();
  let pairsCreated = 0;
  const pairIds: string[] = []; // Collect pair IDs for batch notification

  // OPTIMIZATION: Load friends lists for all users in batch
  const userIds = users.map((u) => u.id);
  const userRefsChunks: admin.firestore.DocumentReference[][] = [];

  // Split into chunks of 10 (Firestore getAll limit)
  for (let i = 0; i < userIds.length; i += 10) {
    const chunk = userIds.slice(i, i + 10);
    userRefsChunks.push(chunk.map((id) => db.collection("users").doc(id)));
  }

  // Fetch all user docs to get friends arrays
  const friendsMap = new Map<string, Set<string>>();
  for (const refs of userRefsChunks) {
    const userDocs = await db.getAll(...refs);
    userDocs.forEach((doc) => {
      const data = doc.data();
      if (data?.friends && Array.isArray(data.friends)) {
        friendsMap.set(doc.id, new Set(data.friends));
      } else {
        friendsMap.set(doc.id, new Set());
      }
    });
  }

  // Helper: Check if two users are friends (O(1) lookup instead of query)
  const areFriends = (userId1: string, userId2: string): boolean => {
    const user1Friends = friendsMap.get(userId1);
    return user1Friends ? user1Friends.has(userId2) : false;
  };

  // Step 1: Match friends first
  console.log("🤝 Step 1: Matching friends...");
  for (const user of users) {
    if (matched.has(user.id)) continue;

    for (const otherUser of users) {
      if (matched.has(otherUser.id) || user.id === otherUser.id) continue;

      if (areFriends(user.id, otherUser.id)) {
        const pairId = await createPair(
          user.id,
          otherUser.id,
          poolId,
          poolData,
          db
        );
        pairIds.push(pairId);
        matched.add(user.id);
        matched.add(otherUser.id);
        pairsCreated++;
        console.log(`✅ Paired friends: ${user.id} <-> ${otherUser.id}`);
        break;
      }
    }
  }

  // Step 2: Match by same country
  console.log("🌍 Step 2: Matching by country...");
  for (const user of users) {
    if (matched.has(user.id) || !user.country) continue;

    for (const otherUser of users) {
      if (matched.has(otherUser.id) || user.id === otherUser.id) continue;
      if (otherUser.country === user.country) {
        const pairId = await createPair(
          user.id,
          otherUser.id,
          poolId,
          poolData,
          db
        );
        pairIds.push(pairId);
        matched.add(user.id);
        matched.add(otherUser.id);
        pairsCreated++;
        console.log(
          `✅ Paired by country (${user.country}): ${user.id} <-> ${otherUser.id}`
        );
        break;
      }
    }
  }

  // Step 3: Random pairing for remaining users
  console.log("🎲 Step 3: Random pairing...");
  const unmatched = users.filter((u) => !matched.has(u.id));

  for (let i = 0; i < unmatched.length - 1; i += 2) {
    const pairId = await createPair(
      unmatched[i].id,
      unmatched[i + 1].id,
      poolId,
      poolData,
      db
    );
    pairIds.push(pairId);
    pairsCreated++;
    console.log(
      `✅ Paired randomly: ${unmatched[i].id} <-> ${unmatched[i + 1].id}`
    );
  }

  // Send all pairing notifications in ONE batch call
  if (pairIds.length > 0) {
    try {
      await sendBatchPairingNotifications(pairIds, db);
    } catch (e) {
      console.warn(`⚠️ Failed to send batch pairing notifications:`, e);
    }
  }

  // Collect unpaired user IDs (odd number case)
  const unpairedUserIds: string[] = [];
  if (unmatched.length % 2 === 1) {
    const unpairedUserId = unmatched[unmatched.length - 1].id;
    unpairedUserIds.push(unpairedUserId);
    console.log(
      `⚠️ User ${unpairedUserId} left unpaired (odd count) - will rollover to next pool`
    );
  }

  return { pairsCreated, unpairedUserIds };
}

/**
 * Create a pair in Firestore
 * OPTIMIZED: Returns pairId for batch notification later
 */
async function createPair(
  userA: string,
  userB: string,
  poolId: string,
  poolData: any,
  db: admin.firestore.Firestore
): Promise<string> {
  const pairId = `${poolId}-${userA}-${userB}`;

  await db.collection("pairs").doc(pairId).set({
    userA,
    userB,
    poolId,
    poolType: poolData.type,
    pairedAt: admin.firestore.FieldValue.serverTimestamp(),

    // Photo window from pool
    photoWindowStart: poolData.photoWindowStart,
    photoWindowEnd: poolData.photoWindowEnd,
    maxPhotos: poolData.maxPhotos,

    // Reveal time from pool
    revealAt: poolData.revealAt,

    // Photo tracking
    photosA: 0,
    photosB: 0,

    // Reveal status
    canRevealA: false,
    canRevealB: false,
    revealedA: false,
    revealedB: false,

    status: "active",
  });

  // Schedule reveal notification task
  const revealAtDate = poolData.revealAt.toDate();
  await scheduleRevealTask(pairId, revealAtDate);

  return pairId; // Return for batch notification
}

/**
 * Send pairing notifications to all pairs in a batch
 * OPTIMIZED: Single function call for N pairs instead of N calls
 * - Fetches all unique user IDs in one batch (max 10 per getAll, chunked)
 * - Sends all push notifications in batches of 100 to Expo
 * - Updates all pairs with pairedNotified flag in batched writes
 */
async function sendBatchPairingNotifications(
  pairIds: string[],
  db: admin.firestore.Firestore
) {
  if (pairIds.length === 0) return 0;

  console.log(
    `📤 Sending pairing notifications for ${pairIds.length} pairs...`
  );

  try {
    // Step 1: Fetch all pair docs in chunks (Firestore getAll limit: 10 docs)
    const pairRefs = pairIds.map((id) => db.collection("pairs").doc(id));
    const pairChunks: admin.firestore.DocumentReference[][] = [];
    for (let i = 0; i < pairRefs.length; i += 10) {
      pairChunks.push(pairRefs.slice(i, i + 10));
    }

    const pairDocs: admin.firestore.DocumentSnapshot[] = [];
    for (const chunk of pairChunks) {
      const docs = await db.getAll(...chunk);
      pairDocs.push(...docs);
    }

    // Step 2: Extract unique user IDs from all pairs
    const userIdSet = new Set<string>();
    const pairDataMap = new Map<string, any>();

    for (const pairDoc of pairDocs) {
      if (!pairDoc.exists) continue;
      const data = pairDoc.data();
      if (!data || data.pairedNotified) continue; // Skip already notified

      pairDataMap.set(pairDoc.id, data);
      userIdSet.add(data.userA);
      userIdSet.add(data.userB);
    }

    if (userIdSet.size === 0) {
      console.log("⚠️ No pairs to notify (all already notified or missing)");
      return 0;
    }

    // Step 3: Fetch all user docs in batches
    const userIds = Array.from(userIdSet);
    const userRefs = userIds.map((id) => db.collection("users").doc(id));
    const userChunks: admin.firestore.DocumentReference[][] = [];
    for (let i = 0; i < userRefs.length; i += 10) {
      userChunks.push(userRefs.slice(i, i + 10));
    }

    const userDocsMap = new Map<string, any>();
    for (const chunk of userChunks) {
      const docs = await db.getAll(...chunk);
      docs.forEach((doc) => {
        if (doc.exists) {
          userDocsMap.set(doc.id, doc.data());
        }
      });
    }

    // Step 4: Build push messages for all users
    const title = "🎉 You have a match!";
    const body =
      "You've been paired with a mystery buddy. Say hi and send your first photo!";
    const messages: any[] = [];

    for (const [pairId, pairData] of pairDataMap.entries()) {
      const userA = userDocsMap.get(pairData.userA);
      const userB = userDocsMap.get(pairData.userB);

      if (userA?.expoPushToken) {
        messages.push({
          to: userA.expoPushToken,
          sound: "default",
          title,
          body,
          data: { type: "paired", pairId },
        });
      }
      if (userB?.expoPushToken) {
        messages.push({
          to: userB.expoPushToken,
          sound: "default",
          title,
          body,
          data: { type: "paired", pairId },
        });
      }
    }

    // Step 5: Send push notifications in batches of 100 (Expo limit)
    let totalSent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
      if (resp.ok) {
        totalSent += batch.length;
      } else {
        console.error("❌ Expo push batch failed:", await resp.text());
      }
    }

    // Step 6: Mark all pairs as notified in batched writes (500 limit)
    const pairsToUpdate = Array.from(pairDataMap.keys());
    for (let i = 0; i < pairsToUpdate.length; i += 450) {
      const chunk = pairsToUpdate.slice(i, i + 450);
      const batch = db.batch();
      chunk.forEach((pairId) => {
        batch.update(db.collection("pairs").doc(pairId), {
          pairedNotified: true,
        });
      });
      await batch.commit();
    }

    console.log(
      `✅ Sent ${totalSent} pairing notifications for ${pairIds.length} pairs`
    );
    return totalSent;
  } catch (error) {
    console.error("❌ Error sending batch pairing notifications:", error);
    return 0;
  }
}

/**
 * Manual HTTP function to create pairs (for testing)
 * Can work in two modes:
 * 1. With poolId: Pairs only users who joined that pool
 * 2. With allUsers=true: Creates fake pool entries for ALL users and pairs them
 * UPDATED: Works with sharded pool structure
 */
export const manualCreatePairs = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();

      const { poolId, allUsers } = req.body;

      if (!poolId) {
        res.status(400).json({ error: "poolId required" });
        return;
      }

      // Check if pool exists
      const poolDoc = await db.collection("pools").doc(poolId).get();
      if (!poolDoc.exists) {
        res.status(404).json({ error: `Pool ${poolId} not found` });
        return;
      }

      // MODE 1: Pair ALL users (for testing)
      if (allUsers === true) {
        console.log("🧪 TEST MODE: Creating pairs with ALL users");

        // Get all users from Firestore
        const allUsersSnapshot = await db.collection("users").get();

        if (allUsersSnapshot.empty) {
          res.status(404).json({ error: "No users found in database" });
          return;
        }

        console.log(`📊 Found ${allUsersSnapshot.size} total users`);

        // Add all users to pool shards (with country data for matching)
        const shardIds = new Set<string>(); // Track created shards
        for (const userDoc of allUsersSnapshot.docs) {
          const userData = userDoc.data();

          const shardId = await addUserToPoolShard(
            poolId,
            userDoc.id,
            {
              priority: "world",
              country: userData.country || undefined, // Include country for matching
            },
            db
          );
          shardIds.add(shardId); // Collect shard IDs
        }

        console.log(`✅ Added ${allUsersSnapshot.size} users to pool shards`);
        console.log(`📊 Shards created: ${Array.from(shardIds).join(", ")}`);

        // ✅ FIX: Longer delay to ensure Firestore writes are visible
        // Firestore has eventual consistency, so we need to wait
        console.log("⏳ Waiting 3 seconds for Firestore consistency...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // Get all shards and process them (retry a few times to handle eventual consistency)
      let shardsSnapshot: admin.firestore.QuerySnapshot = await db
        .collection("pools")
        .doc(poolId)
        .collection("shards")
        .get();

      if (shardsSnapshot.empty) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          console.log(
            `⏳ Shards empty (initial). Waiting 1s and retrying (attempt ${attempt}/2)...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          shardsSnapshot = await db
            .collection("pools")
            .doc(poolId)
            .collection("shards")
            .get();
          if (!shardsSnapshot.empty) break;
        }
      }

      if (shardsSnapshot.empty) {
        console.error("❌ No shards found after adding users!");

        // Debug: Check pool metadata
        const poolDoc = await db.collection("pools").doc(poolId).get();
        const poolData = poolDoc.data();
        console.log("🔍 Pool metadata:", {
          currentShard: poolData?.currentShard,
          shardUserCounts: poolData?.shardUserCounts,
          userCount: poolData?.userCount,
        });

        res.status(404).json({
          error:
            "No users in pool. Use allUsers=true to pair all users. If allUsers=true was used, this is a Firestore consistency issue - try again in a few seconds.",
          debug: {
            poolMetadata: {
              currentShard: poolData?.currentShard,
              shardUserCounts: poolData?.shardUserCounts,
              userCount: poolData?.userCount,
            },
          },
        });
        return;
      }

      console.log(`📊 Found ${shardsSnapshot.size} shards to process`);

      let totalPairs = 0;
      let totalUnpaired = 0;

      for (const shardDoc of shardsSnapshot.docs) {
        const poolUsersSnapshot = await db
          .collection("pools")
          .doc(poolId)
          .collection("shards")
          .doc(shardDoc.id)
          .collection("poolUsers")
          .get();

        console.log(
          `📊 Shard ${shardDoc.id} has ${poolUsersSnapshot.size} users`
        );

        if (poolUsersSnapshot.empty) {
          console.warn(`⚠️ Shard ${shardDoc.id} is empty, skipping`);
          continue;
        }

        const result = await matchUsers(poolId, poolUsersSnapshot.docs, db);
        totalPairs += result.pairsCreated;
        totalUnpaired += result.unpairedUserIds.length;
      }

      res.status(200).json({
        success: true,
        message: `Created ${totalPairs} pairs`,
        pairs: totalPairs,
        unpaired: totalUnpaired,
        mode: allUsers ? "all-users" : "pool-only",
      });
    } catch (error: any) {
      console.error("Error creating pairs:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * Migration function: Populate friends array in user docs
 * Run once to migrate from friendships collection to friends array
 * GET https://us-central1-secretbuddy-5637d.cloudfunctions.net/migrateFriendships
 */
export const migrateFriendships = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();

      console.log("🔄 Starting friendships migration...");

      // Get all accepted friendships
      const friendshipsSnapshot = await db
        .collection("friendships")
        .where("status", "==", "accepted")
        .get();

      if (friendshipsSnapshot.empty) {
        res.status(200).json({
          success: true,
          message: "No friendships to migrate",
        });
        return;
      }

      console.log(`📊 Found ${friendshipsSnapshot.size} accepted friendships`);

      // Build friends map
      const friendsMap = new Map<string, Set<string>>();

      friendshipsSnapshot.forEach((doc) => {
        const data = doc.data();
        const userId1 = data.userId1;
        const userId2 = data.userId2;

        if (!friendsMap.has(userId1)) {
          friendsMap.set(userId1, new Set());
        }
        if (!friendsMap.has(userId2)) {
          friendsMap.set(userId2, new Set());
        }

        friendsMap.get(userId1)!.add(userId2);
        friendsMap.get(userId2)!.add(userId1);
      });

      console.log(`👥 Updating ${friendsMap.size} user documents...`);

      // Update user documents with friends arrays
      const batch = db.batch();
      let updates = 0;

      for (const [userId, friendsSet] of friendsMap.entries()) {
        const userRef = db.collection("users").doc(userId);
        batch.update(userRef, {
          friends: Array.from(friendsSet),
        });
        updates++;

        // Commit in batches of 500 (Firestore limit)
        if (updates % 500 === 0) {
          await batch.commit();
          console.log(`✅ Committed ${updates} updates...`);
        }
      }

      // Commit remaining
      if (updates % 500 !== 0) {
        await batch.commit();
      }

      console.log(`✅ Migration complete: Updated ${updates} users`);

      res.status(200).json({
        success: true,
        message: `Migrated friendships for ${updates} users`,
        updates,
      });
    } catch (error: any) {
      console.error("Migration error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

// ==================== PHOTO NOTIFICATIONS ====================

/**
 * Send photo notification to all users in a pool
 * OPTIMIZED: Batch user fetching + Expo batch API (max 100 per request)
 * AUTOMATIC: Creates photo challenge data for all paired users
 */
async function sendPhotoNotificationToPool(
  poolId: string,
  db: admin.firestore.Firestore
): Promise<number> {
  try {
    // OPTIMIZATION: Single indexed query for active pairs
    const pairsSnapshot = await db
      .collection("pairs")
      .where("poolId", "==", poolId)
      .where("status", "==", "active")
      .get();

    if (pairsSnapshot.empty) {
      return 0; // Silent - no log to save costs
    }

    // Collect unique user IDs
    const userIds = new Set<string>();
    pairsSnapshot.forEach((doc) => {
      const pair = doc.data();
      userIds.add(pair.userA);
      userIds.add(pair.userB);
    });

    if (userIds.size === 0) return 0;

    // Sending photo prompts to users in pool (no debug log to avoid noise)

    // Random photo prompts (matches app prompts)
    const prompts = [
      "Share the view from your window",
      "Show what you're currently looking at",
      "Show your current surroundings",
      "Take a photo of what you're drinking",
      "Snap your workspace or study area",
      "Photograph your favorite nearby object",
      "Share what you're having for your meal",
      "Show your pet or a plant in your space",
    ];
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    const timestamp = Date.now();

    // OPTIMIZATION: Batch fetch users (Firestore allows 10 docs per getAll)
    const userIdArray = Array.from(userIds);
    const messages: any[] = [];
    const firestoreBatch = db.batch(); // Renamed to avoid conflict with messages batch

    // Process in chunks of 10 (Firestore getAll limit)
    for (let i = 0; i < userIdArray.length; i += 10) {
      const chunk = userIdArray.slice(i, i + 10);
      const userRefs = chunk.map((id) => db.collection("users").doc(id));
      const userDocs = await db.getAll(...userRefs);

      userDocs.forEach((doc) => {
        const userData = doc.data();
        if (userData?.expoPushToken) {
          // Push notification
          messages.push({
            to: userData.expoPushToken,
            sound: "default",
            title: "É hora da tua foto do dia 📸",
            body: "Toca para enviar a tua foto ao teu mystery buddy!",
            data: {
              type: "photo_challenge",
              poolId,
              userId: doc.id,
              prompt: randomPrompt,
              timestamp: timestamp, // IMPORTANT: Send timestamp in notification
            },
          });

          // AUTOMATIC: Create photo challenge data in Firestore
          // This data will be read by the app to restore the card state
          const challengeRef = db
            .collection("users")
            .doc(doc.id)
            .collection("photoChallenges")
            .doc(`${poolId}-${timestamp}`);

          firestoreBatch.set(challengeRef, {
            prompt: randomPrompt,
            poolId,
            timestamp: admin.firestore.Timestamp.fromMillis(timestamp),
            expiresAt: admin.firestore.Timestamp.fromMillis(
              timestamp + 5 * 60 * 1000
            ), // 5 minutes
            status: "pending",
          });
        }
      });
    }

    // Commit batch write for photo challenges
    await firestoreBatch.commit();
    console.log(
      `✅ Created ${userIdArray.length} photo challenges in Firestore`
    );

    if (messages.length === 0) {
      console.log("⚠️ No push tokens");
      return 0;
    }

    // OPTIMIZATION: Send in batches (Expo allows 100 per request)
    let totalSent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (response.ok) {
        totalSent += batch.length;
      } else {
        console.error(`❌ Batch ${i / 100 + 1} failed:`, response.status);
      }
    }

    console.log(`✅ Sent ${totalSent}/${messages.length} notifications`);
    return totalSent;
  } catch (error) {
    console.error("❌ Error sending notifications:", error);
    return 0;
  }
}

/**
 * Send reveal notifications for pairs whose revealAt has arrived
 * - Queries pairs where status=='active', revealAt <= now, and revealNotified != true
 * - Sends Expo push notifications to both users (if expoPushToken exists)
 * - Marks pair.revealNotified = true to avoid duplicate notifications
 * OPTIMIZED: Batches user fetches instead of individual getAll per pair
 */
async function sendRevealNotifications(db: admin.firestore.Firestore) {
  try {
    const nowTs = admin.firestore.Timestamp.now();
    const pairsRef = db.collection("pairs");

    // Query active pairs
    const snapshot = await pairsRef.where("status", "==", "active").get();
    if (snapshot.empty) return 0;

    // Filter pairs that need notification
    const eligiblePairs: Array<{
      doc: admin.firestore.DocumentSnapshot;
      data: any;
    }> = [];
    const userIdSet = new Set<string>();

    for (const doc of snapshot.docs) {
      const data: any = doc.data();
      if (!data.revealAt || data.revealNotified) continue;

      const revealAt: admin.firestore.Timestamp = data.revealAt;
      if (revealAt.toMillis() > nowTs.toMillis()) continue;

      eligiblePairs.push({ doc, data });
      userIdSet.add(data.userA);
      userIdSet.add(data.userB);
    }

    if (eligiblePairs.length === 0) return 0;

    console.log(
      `📤 Sending reveal notifications for ${eligiblePairs.length} pairs...`
    );

    // Batch fetch all unique users (chunks of 10)
    const userIds = Array.from(userIdSet);
    const userRefs = userIds.map((id) => db.collection("users").doc(id));
    const userChunks: admin.firestore.DocumentReference[][] = [];
    for (let i = 0; i < userRefs.length; i += 10) {
      userChunks.push(userRefs.slice(i, i + 10));
    }

    const userDocsMap = new Map<string, any>();
    for (const chunk of userChunks) {
      const docs = await db.getAll(...chunk);
      docs.forEach((doc) => {
        if (doc.exists) {
          userDocsMap.set(doc.id, doc.data());
        }
      });
    }

    // Build messages for all eligible pairs
    const messages: any[] = [];
    const pairsToUpdate: admin.firestore.DocumentReference[] = [];

    const title = "🎉 Reveal Time!";
    const body = "It's reveal time — see who your mystery buddy is now!";

    for (const { doc, data } of eligiblePairs) {
      const userA = userDocsMap.get(data.userA);
      const userB = userDocsMap.get(data.userB);

      if (userA?.expoPushToken) {
        messages.push({
          to: userA.expoPushToken,
          sound: "default",
          title,
          body,
          data: { type: "reveal", pairId: doc.id },
        });
      }

      if (userB?.expoPushToken) {
        messages.push({
          to: userB.expoPushToken,
          sound: "default",
          title,
          body,
          data: { type: "reveal", pairId: doc.id },
        });
      }

      pairsToUpdate.push(doc.ref);
    }

    // Send in batches (Expo allows 100 per request)
    let totalSent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
      if (resp.ok) totalSent += batch.length;
      else console.error("❌ Expo push batch failed:", await resp.text());
    }

    // Mark pairs as notified in batches (500 write limit)
    for (let i = 0; i < pairsToUpdate.length; i += 450) {
      const chunk = pairsToUpdate.slice(i, i + 450);
      const updateBatch = db.batch();
      chunk.forEach((ref) => updateBatch.update(ref, { revealNotified: true }));
      await updateBatch.commit();
    }

    console.log(
      `✅ Sent ${totalSent} reveal notifications for ${eligiblePairs.length} pairs`
    );
    return totalSent;
  } catch (error) {
    console.error("❌ Error sending reveal notifications:", error);
    return 0;
  }
}

/**
 * Schedule a Cloud Task to send reveal notification at revealAt time
 */
async function scheduleRevealTask(pairId: string, revealAt: Date) {
  if (!PROJECT) {
    throw new Error("PROJECT environment variable not set");
  }

  try {
    const tasksClient = getTasksClient();
    const parent = tasksClient.queuePath(PROJECT, LOCATION, QUEUE);
    const payload = { pairId };
    const scheduleTime = { seconds: Math.floor(revealAt.getTime() / 1000) };

    const task = {
      httpRequest: {
        httpMethod: "POST" as const,
        url: REVEAL_HANDLER_URL,
        headers: { "Content-Type": "application/json" },
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        oidcToken: {
          serviceAccountEmail: `${PROJECT}@appspot.gserviceaccount.com`,
        },
      },
      scheduleTime,
    };

    const response = await tasksClient.createTask({ parent, task });
    console.log(
      `✅ Scheduled reveal task for pair ${pairId} at ${revealAt.toISOString()}`
    );
    return response[0].name;
  } catch (error) {
    console.error("❌ Error scheduling reveal task:", error);
    return null;
  }
}

/**
 * Schedule a Cloud Task to send photo notification at photo time
 */
async function schedulePhotoTask(poolId: string, photoAt: Date) {
  if (!PROJECT) {
    throw new Error("PROJECT environment variable not set");
  }

  try {
    const tasksClient = getTasksClient();
    const parent = tasksClient.queuePath(PROJECT, LOCATION, QUEUE);
    const payload = { poolId };
    const scheduleTime = { seconds: Math.floor(photoAt.getTime() / 1000) };

    const task = {
      httpRequest: {
        httpMethod: "POST" as const,
        url: PHOTO_HANDLER_URL,
        headers: { "Content-Type": "application/json" },
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        oidcToken: {
          serviceAccountEmail: `${PROJECT}@appspot.gserviceaccount.com`,
        },
      },
      scheduleTime,
    };

    const response = await tasksClient.createTask({ parent, task });
    console.log(
      `✅ Scheduled photo task for pool ${poolId} at ${photoAt.toISOString()}`
    );
    return response[0].name;
  } catch (error) {
    console.error("❌ Error scheduling photo task:", error);
    return null;
  }
}

// Scheduled function to check reveal notifications every minute
// COMMENTED OUT: Now using Cloud Tasks for precise scheduling instead of polling
// export const checkRevealNotifications = functions
//   .runWith({ timeoutSeconds: 60, memory: "128MB" })
//   .pubsub.schedule("every 1 minutes")
//   .timeZone("UTC")
//   .onRun(async () => {
//     initAdmin();
//     const db = admin.firestore();
//     const sent = await sendRevealNotifications(db);
//     return { success: true, sent };
//   });

// Manual test endpoint to trigger reveal notification for a specific pair (for testing)
export const manualTestRevealNotification = functions
  .runWith({ timeoutSeconds: 60, memory: "128MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();
      const { pairId } = req.body;
      if (!pairId) {
        res.status(400).json({ error: "pairId required" });
        return;
      }

      const pairDocRef = db.collection("pairs").doc(pairId);
      const pairDoc = await pairDocRef.get();
      if (!pairDoc.exists) {
        res.status(404).json({ error: "pair not found" });
        return;
      }

      // Temporarily set revealAt to now and clear revealNotified so sendRevealNotifications will pick it up
      await pairDocRef.update({
        revealAt: admin.firestore.Timestamp.now(),
        revealNotified: false,
      });

      const sent = await sendRevealNotifications(db);
      res.status(200).json({ success: true, sent });
      return;
    } catch (error: any) {
      console.error("Error manual reveal test:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

/**
 * HTTP handler called by Cloud Tasks to send reveal notification for a pair
 */
export const sendRevealForPair = functions
  .runWith({ timeoutSeconds: 60, memory: "128MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();
      const { pairId } = req.body;
      if (!pairId) {
        res.status(400).json({ error: "pairId required" });
        return;
      }

      const pairDocRef = db.collection("pairs").doc(pairId);
      const pairDoc = await pairDocRef.get();
      if (!pairDoc.exists) {
        res.status(404).json({ error: "pair not found" });
        return;
      }

      const pair = pairDoc.data();
      if (!pair || pair.revealNotified) {
        res.status(200).json({ success: true, reason: "already notified" });
        return;
      }

      // Send notifications (reuse existing logic)
      const sent = await sendRevealNotificationsForPair(pairId, db);
      res.status(200).json({ success: true, sent });
    } catch (error: any) {
      console.error("Error in sendRevealForPair:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

/**
 * HTTP handler called by Cloud Tasks to send photo notification for a pool
 */
export const sendPhotoForPool = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();
      const { poolId } = req.body;
      if (!poolId) {
        res.status(400).json({ error: "poolId required" });
        return;
      }

      // Send photo notifications to all users in the pool
      const sent = await sendPhotoNotificationToPool(poolId, db);
      res.status(200).json({ success: true, sent });
    } catch (error: any) {
      console.error("Error in sendPhotoForPool:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

/**
 * Send reveal notifications for a specific pair
 */
async function sendRevealNotificationsForPair(
  pairId: string,
  db: admin.firestore.Firestore
) {
  try {
    const pairDoc = await db.collection("pairs").doc(pairId).get();
    if (!pairDoc.exists) return 0;

    const data = pairDoc.data();
    if (!data || data.revealNotified) return 0;

    // Load user docs
    const userARef = db.collection("users").doc(data.userA);
    const userBRef = db.collection("users").doc(data.userB);
    const [userADoc, userBDoc] = await db.getAll(userARef, userBRef);

    const userA = userADoc.exists ? userADoc.data() : null;
    const userB = userBDoc.exists ? userBDoc.data() : null;

    const title = "🎉 Reveal Time!";
    const body = "It's reveal time — see who your mystery buddy is now!";
    const messages: any[] = [];

    if (userA?.expoPushToken) {
      messages.push({
        to: userA.expoPushToken,
        sound: "default",
        title,
        body,
        data: { type: "reveal", pairId },
      });
    }

    if (userB?.expoPushToken) {
      messages.push({
        to: userB.expoPushToken,
        sound: "default",
        title,
        body,
        data: { type: "reveal", pairId },
      });
    }

    // Send messages
    let totalSent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
      if (resp.ok) totalSent += batch.length;
      else console.error("❌ Expo push batch failed:", await resp.text());
    }

    // Mark as notified
    await pairDoc.ref.update({ revealNotified: true });
    console.log(`✅ Sent ${totalSent} reveal notifications for pair ${pairId}`);
    return totalSent;
  } catch (error) {
    console.error("❌ Error sending reveal notifications for pair:", error);
    return 0;
  }
}

// Scheduled function to check photo notifications every minute
// COMMENTED OUT: Now using Cloud Tasks for precise scheduling instead of polling
// export const checkPhotoNotifications = functions
//   .runWith({ timeoutSeconds: 60, memory: "256MB" })
//   .pubsub.schedule("every 1 minutes")
//   .timeZone("UTC")
//   .onRun(async () => {
//     initAdmin();
//     const db = admin.firestore();

//     const now = new Date();
//     const dateStr = now.toISOString().split("T")[0];
//     const currentHour = now.getHours();
//     const currentMin = now.getMinutes();

//     // Early exit: Photo times only happen between 09:00-21:00 UTC (10:00-22:00 Portugal)
//     if (currentHour < 9 || currentHour >= 21) {
//       // Silent exit - no logs to save costs
//       return { success: true, skipped: "outside_photo_hours" };
//     }

//     console.log(
//       `⏰ Checking photo notifications at ${currentHour}:${currentMin}`
//     );

//     // ✅ Get all 8 hourly pools for today (9h-16h UTC = 10h-17h Portugal)
//     const poolHours = [9, 10, 11, 12, 13, 14, 15, 16];
//     const poolRefs = poolHours.map((hour) =>
//       db.collection("pools").doc(`${dateStr}-${hour}h`)
//     );

//     // OPTIMIZATION: Batch get all pools in one call (max 10 docs)
//     const poolDocs = await db.getAll(...poolRefs);

//     let notificationsSent = 0;

//     for (const doc of poolDocs) {
//       if (!doc.exists) continue;

//       const poolData = doc.data();
//       const photoTimes = poolData?.photoTimes || [];

//       // OPTIMIZATION: Check all photo times in memory (no extra queries)
//       for (const photoTime of photoTimes) {
//         const photoDate = photoTime.toDate();
//         const photoHour = photoDate.getHours();
//         const photoMin = photoDate.getMinutes();

//         // Match current time (within 1-minute window)
//         if (photoHour === currentHour && photoMin === currentMin) {
//           // Matched a scheduled photo time for pool - send notifications
//           const sent = await sendPhotoNotificationToPool(doc.id, db);
//           notificationsSent += sent;
//         }
//       }
//     }

//     // Only log if notifications were sent
//     if (notificationsSent > 0) {
//       console.log(`✅ Sent ${notificationsSent} total notifications`);
//     }

//     return { success: true, sent: notificationsSent };
//   });

/**
 * Manual test function to send photo notification
 * Test without waiting for scheduled time
 */
export const manualTestPhotoNotification = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();

      const { poolId, userId } = req.body;

      if (!poolId) {
        res.status(400).json({ error: "poolId required" });
        return;
      }

      // If userId provided, send to specific user only
      if (userId) {
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data();

        if (!userData?.expoPushToken) {
          res.status(404).json({ error: "User has no push token" });
          return;
        }

        // Random prompt
        const prompts = [
          "Share the view from your window",
          "Show what you're currently looking at",
          "Show your current surroundings",
          "Take a photo of what you're drinking",
          "Snap your workspace or study area",
          "Photograph your favorite nearby object",
          "Share what you're having for your meal",
          "Show your pet or a plant in your space",
        ];
        const randomPrompt =
          prompts[Math.floor(Math.random() * prompts.length)];

        const message = {
          to: userData.expoPushToken,
          sound: "default",
          title: "É hora da tua foto do dia 📸",
          body: "Toca para enviar a tua foto ao teu mystery buddy!",
          data: {
            type: "photo_challenge",
            poolId,
            userId,
            prompt: randomPrompt,
          },
        };

        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });

        const result = await response.json();

        res.status(200).json({
          success: true,
          message: "Test notification sent to user",
          result,
        });
        return;
      }

      // Send to all users in pool
      const sent = await sendPhotoNotificationToPool(poolId, db);

      res.status(200).json({
        success: true,
        message: `Sent notifications to ${sent} users`,
        sent,
      });
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

// 🔍 DEBUG FUNCTIONS

/**
 * List all users with their UIDs and push tokens
 * GET https://us-central1-secretbuddy-5637d.cloudfunctions.net/listUsers
 */
export const listUsers = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();

      const usersSnapshot = await db.collection("users").get();

      const users = usersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          displayName: data.displayName || "Unknown",
          email: data.email || "N/A",
          expoPushToken: data.expoPushToken || null,
          createdAt: data.createdAt,
        };
      });

      res.status(200).json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error: any) {
      console.error("Error listing users:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * List all active pairs
 * GET https://us-central1-secretbuddy-5637d.cloudfunctions.net/listPairs
 */
export const listPairs = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();

      const pairsSnapshot = await db
        .collection("pairs")
        .where("status", "==", "active")
        .get();

      const pairs = pairsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userA: data.userA,
          userB: data.userB,
          poolId: data.poolId,
          status: data.status,
          photosA: data.photosA || 0,
          photosB: data.photosB || 0,
          createdAt: data.createdAt,
          photoWindowStart: data.photoWindowStart,
          photoWindowEnd: data.photoWindowEnd,
          revealTime: data.revealTime,
        };
      });

      res.status(200).json({
        success: true,
        count: pairs.length,
        pairs,
      });
    } catch (error: any) {
      console.error("Error listing pairs:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * Delete all pairs (for testing)
 * POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/deleteAllPairs
 */
export const deleteAllPairs = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();

      const pairsSnapshot = await db.collection("pairs").get();
      const batch = db.batch();

      pairsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      res.status(200).json({
        success: true,
        message: `Deleted ${pairsSnapshot.size} pairs`,
        count: pairsSnapshot.size,
      });
    } catch (error: any) {
      console.error("Error deleting pairs:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * Manual create pools for today (for testing)
 * POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePools
 */
export const manualCreatePools = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];

      console.log(`📅 Creating hourly pools for ${dateStr}`);

      const poolHours = [9, 10, 11, 12, 13, 14, 15, 16];
      const batch = db.batch();

      const revealHour = 21;
      const revealMin = Math.floor(Math.random() * 60);
      const revealAt = new Date(now);
      revealAt.setHours(revealHour, revealMin, 0, 0);

      for (const hour of poolHours) {
        const poolId = `${dateStr}-${hour}h`;

        const joinWindowStart = new Date(now);
        joinWindowStart.setHours(hour, 0, 0, 0);

        const joinWindowEnd = new Date(now);
        joinWindowEnd.setHours(hour + 1, 0, 0, 0);

        const photoWindowStart = new Date(now);
        photoWindowStart.setHours(hour, 0, 0, 0);

        const photoWindowEnd = new Date(now);
        photoWindowEnd.setHours(21, 0, 0, 0);

        const photoTimes: Date[] = [];
        if (hour < 21) {
          const hoursAvailable = 21 - hour;

          if (hoursAvailable >= 2) {
            const spacing = hoursAvailable / 2;

            const photo1Hour = hour + Math.floor(spacing / 2);
            const photo1Min = Math.floor(Math.random() * 60);
            const photo1 = new Date(now);
            photo1.setHours(photo1Hour, photo1Min, 0, 0);
            photoTimes.push(photo1);

            const photo2Hour = hour + Math.floor(spacing * 1.5);
            const photo2Min = Math.floor(Math.random() * 60);
            const photo2 = new Date(now);
            photo2.setHours(photo2Hour, photo2Min, 0, 0);
            photoTimes.push(photo2);
          } else if (hoursAvailable === 1) {
            const photoHour = hour;
            const photoMin = Math.floor(Math.random() * 60);
            const photo = new Date(now);
            photo.setHours(photoHour, photoMin, 0, 0);
            photoTimes.push(photo);
          }
        }

        // Schedule Cloud Tasks for each photo time instead of storing in Firestore
        for (const photoTime of photoTimes) {
          await schedulePhotoTask(poolId, photoTime);
        }

        const poolRef = db.collection("pools").doc(poolId);
        batch.set(poolRef, {
          type: `hourly-${hour}h`,
          date: dateStr,
          hour,
          joinWindowStart: admin.firestore.Timestamp.fromDate(joinWindowStart),
          joinWindowEnd: admin.firestore.Timestamp.fromDate(joinWindowEnd),
          photoWindowStart:
            admin.firestore.Timestamp.fromDate(photoWindowStart),
          photoWindowEnd: admin.firestore.Timestamp.fromDate(photoWindowEnd),
          maxPhotos: photoTimes.length,
          // Removed photoTimes array - now using Cloud Tasks for scheduling
          revealAt: admin.firestore.Timestamp.fromDate(revealAt),
          status: "open",
          userCount: 0,
          pairsCount: 0,
          // Sharding metadata (IMPORTANT: needed for sharded pool system)
          currentShard: 0,
          shardUserCounts: { 0: 0 },
        });
        // Also create initial shard document (shard_0) so shards collection exists
        const shardRef = db
          .collection("pools")
          .doc(poolId)
          .collection("shards")
          .doc("shard_0");
        batch.set(shardRef, {
          shardId: "shard_0",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          userCount: 0,
        });
      }

      await batch.commit();

      res.status(200).json({
        success: true,
        message: `Created ${poolHours.length} pools for ${dateStr}`,
        pools: poolHours.map((h) => `${dateStr}-${h}h`),
      });
    } catch (error: any) {
      console.error("Error creating pools:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * Manual close a specific hourly pool (for testing)
 * POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualClosePool
 * Body: { "hour": 14 }  // To close the 14h pool for today
 */
export const manualClosePool = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();

      const { hour } = req.body;

      if (!hour || hour < 9 || hour > 16) {
        res.status(400).json({
          error: "Invalid hour. Must be between 9 and 16.",
        });
        return;
      }

      const result = await closeHourlyPool(hour);

      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error closing pool:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * Send push notification when a photo is received
 * Triggers automatically when a new photo document is created
 */
export const notifyPhotoReceived = functions
  .runWith({ timeoutSeconds: 60, memory: "128MB" })
  .firestore.document("photoChallenge/{photoId}")
  .onCreate(async (snap, context) => {
    try {
      initAdmin();
      const db = admin.firestore();

      const photoData = snap.data();
      if (!photoData) return;

      const { receiverId, senderId, prompt } = photoData;

      // Don't send notification if sender and receiver are the same (shouldn't happen but safety check)
      if (receiverId === senderId) return;

      // Get receiver's user data to check for push token
      const receiverDoc = await db.collection("users").doc(receiverId).get();
      if (!receiverDoc.exists) return;

      const receiverData = receiverDoc.data();
      if (!receiverData?.expoPushToken) {
        console.log(`⚠️ No push token for receiver ${receiverId}`);
        return;
      }

      // Get sender's display name for the notification
      const senderDoc = await db.collection("users").doc(senderId).get();
      const senderName = senderDoc.exists
        ? senderDoc.data()?.displayName || "Your buddy"
        : "Your buddy";

      // Send push notification
      const message = {
        to: receiverData.expoPushToken,
        sound: "default",
        title: "📸 New photo from your buddy!",
        body: `${senderName} sent you a photo: "${prompt}"`,
        data: {
          type: "photo_received",
          photoId: context.params.photoId,
          senderId,
          prompt,
        },
      };

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        console.log(
          `✅ Sent photo notification to ${receiverId} for photo ${context.params.photoId}`
        );
      } else {
        console.error(`❌ Failed to send photo notification:`, response.status);
      }
    } catch (error) {
      console.error("❌ Error in notifyPhotoReceived:", error);
    }
  });

// ==================== POINTS & STREAK SYSTEM ====================

/**
 * Award points when a user sends a photo
 * Triggers automatically when a new photo document is created
 */
export const awardPointsForPhoto = functions
  .runWith({ timeoutSeconds: 60, memory: "128MB" })
  .firestore.document("photoChallenge/{photoId}")
  .onCreate(async (snap, context) => {
    try {
      initAdmin();
      const db = admin.firestore();

      const photoData = snap.data();
      if (!photoData) return;

      const { senderId } = photoData;
      if (!senderId) return;

      // Award 10 points for sending a photo
      const senderRef = db.collection("users").doc(senderId);
      await senderRef.update({
        points: admin.firestore.FieldValue.increment(10),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Awarded 10 points to ${senderId} for sending photo`);
    } catch (error) {
      console.error("❌ Error in awardPointsForPhoto:", error);
    }
  });

/**
 * Award points and update streak when users get paired
 * Triggers automatically when a new pair document is created
 */
export const awardPointsForPairing = functions
  .runWith({ timeoutSeconds: 60, memory: "128MB" })
  .firestore.document("pairs/{pairId}")
  .onCreate(async (snap, context) => {
    try {
      initAdmin();
      const db = admin.firestore();

      const pairData = snap.data();
      if (!pairData) return;

      const { userA, userB, poolId } = pairData;
      if (!userA || !userB) return;

      const today = new Date().toISOString().split("T")[0];

      // Process both users in parallel
      await Promise.all([
        updateUserPairingStats(db, userA, today, poolId),
        updateUserPairingStats(db, userB, today, poolId),
      ]);

      console.log(
        `✅ Awarded pairing points and updated streaks for pair: ${userA} <-> ${userB}`
      );
    } catch (error) {
      console.error("❌ Error in awardPointsForPairing:", error);
    }
  });

/**
 * Helper function to update user pairing stats (points and streak)
 */
async function updateUserPairingStats(
  db: admin.firestore.Firestore,
  userId: string,
  today: string,
  poolId: string
): Promise<void> {
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    console.warn(`⚠️ User ${userId} not found`);
    return;
  }

  const userData = userDoc.data();
  const lastPairedDate = userData?.lastPairedDate;
  const currentStreak = userData?.streak || 0;

  let newStreak = currentStreak;

  // Check if this is a consecutive day pairing
  if (lastPairedDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastPairedDate === yesterdayStr) {
      // Consecutive day - increment streak
      newStreak = currentStreak + 1;
    } else if (lastPairedDate !== today) {
      // Streak broken - reset to 1
      newStreak = 1;
    }
    // If lastPairedDate === today, keep current streak (already paired today)
  } else {
    // First time pairing - start streak
    newStreak = 1;
  }

  // Award 20 points for getting paired + bonus points for streak
  const basePoints = 20;
  const streakBonus = Math.min(newStreak * 5, 50); // Max 50 bonus points
  const totalPoints = basePoints + streakBonus;

  await userRef.update({
    points: admin.firestore.FieldValue.increment(totalPoints),
    streak: newStreak,
    lastPairedDate: today,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(
    `✅ User ${userId}: +${totalPoints} points (base: ${basePoints}, streak bonus: ${streakBonus}), streak: ${newStreak} days`
  );
}

/**
 * Get leaderboard (top users by points)
 * HTTP endpoint to fetch leaderboard data
 * OPTIMIZED: Uses Firestore cache with 5-minute TTL to avoid expensive queries
 */
export const getLeaderboard = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();

      const { type = "global", userId, limit = 10 } = req.query;
      const cacheKey = `leaderboard_${type}_${limit}`;
      const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

      // Step 1: Try to get from cache
      const cacheRef = db.collection("cache").doc(cacheKey);
      const cacheDoc = await cacheRef.get();

      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        const cacheAge = cached
          ? Date.now() - (cached.timestamp || 0)
          : Infinity;

        if (cached && cacheAge < CACHE_TTL_MS) {
          console.log(
            `✅ Serving leaderboard from cache (age: ${Math.round(
              cacheAge / 1000
            )}s)`
          );

          // Still need to get user rank if requested
          let userRank = null;
          if (userId) {
            userRank = await getUserRank(db, userId as string, type as string);
          }

          res.status(200).json({
            success: true,
            type,
            leaderboard: cached.leaderboard,
            userRank,
            cached: true,
            cacheAge: Math.round(cacheAge / 1000),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          return;
        }
      }

      // Step 2: Cache miss or expired - query fresh data
      console.log("🔄 Cache miss or expired, querying fresh leaderboard...");

      let query = db.collection("users").orderBy("points", "desc");

      // Filter by country if requested
      if (type === "country" && userId) {
        const userDoc = await db
          .collection("users")
          .doc(userId as string)
          .get();
        const userData = userDoc.data();

        if (userData?.country) {
          query = query.where("country", "==", userData.country) as any;
        }
      }

      // Get top users
      const snapshot = await query.limit(Number(limit)).get();

      const leaderboard = snapshot.docs.map((doc, index) => ({
        rank: index + 1,
        userId: doc.id,
        displayName: doc.data().displayName || "Unknown",
        points: doc.data().points || 0,
        streak: doc.data().streak || 0,
        country: doc.data().country || null,
      }));

      // Step 3: Store in cache
      await cacheRef.set({
        leaderboard,
        timestamp: Date.now(),
        expiresAt: admin.firestore.Timestamp.fromMillis(
          Date.now() + CACHE_TTL_MS
        ),
      });

      // Step 4: Get user rank if requested
      let userRank = null;
      if (userId) {
        userRank = await getUserRank(db, userId as string, type as string);
      }

      res.status(200).json({
        success: true,
        type,
        leaderboard,
        userRank,
        cached: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error: any) {
      console.error("❌ Error in getLeaderboard:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * Helper: Get a specific user's rank
 * OPTIMIZED: Separate function to avoid duplicate logic
 */
async function getUserRank(
  db: admin.firestore.Firestore,
  userId: string,
  type: string
): Promise<any> {
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return null;

  const userData = userDoc.data();
  const userPoints = userData?.points || 0;

  let countQuery = db.collection("users").where("points", ">", userPoints);

  if (type === "country" && userData?.country) {
    countQuery = countQuery.where("country", "==", userData.country) as any;
  }

  const countSnapshot = await countQuery.get();

  return {
    rank: countSnapshot.size + 1,
    userId,
    displayName: userData?.displayName || "Unknown",
    points: userPoints,
    streak: userData?.streak || 0,
    country: userData?.country || null,
  };
}
