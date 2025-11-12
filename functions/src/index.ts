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
const PROJECT =
  process.env.GCP_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  functions.config().firebase?.projectId ||
  admin.app().options.projectId;
const LOCATION = config?.tasks?.location || "us-central1";
const QUEUE = config?.tasks?.queue || "reveal-queue-now";
const REVEAL_HANDLER_URL =
  config?.tasks?.handler_url ||
  `https://${LOCATION}-${PROJECT}.cloudfunctions.net/sendRevealForPair`;
const PHOTO_HANDLER_URL =
  config?.tasks?.photo_handler_url ||
  `https://${LOCATION}-${PROJECT}.cloudfunctions.net/sendPhotoForPool`;
const SINGLE_REVEAL_HANDLER_URL =
  config?.tasks?.single_reveal_handler_url ||
  `https://${LOCATION}-${PROJECT}.cloudfunctions.net/sendSingleRevealNotification`;

// Log configuration for debugging
console.log(
  `🔧 Cloud Tasks Config: Project=${PROJECT}, Location=${LOCATION}, Queue=${QUEUE}`
);

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
 * Daily cleanup at 00:01 UTC (runs after all daily activities are complete)
 * Since it runs at 1:01 AM UTC (after pools close, reveals happen, etc.),
 * we can safely delete ALL data from previous day without checking expiration status.
 * Deletes:
 * 1. poolUsers from previous day
 * 2. pools from previous day
 * 3. pairs from previous day
 * 4. messages older than 2 days
 * 5. ALL photo challenges from previous day (hard delete)
 * 6. photos from storage older than 1 day
 */
export const dailyCleanup = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 0 * * *") // Every day at midnight UTC
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

    if (!poolUsersSnapshot.empty) {
      const docs = poolUsersSnapshot.docs;
      for (let i = 0; i < docs.length; i += 450) {
        const chunk = docs.slice(i, i + 450);
        const poolUsersBatch = db.batch();
        chunk.forEach((doc) => {
          poolUsersBatch.delete(doc.ref);
          poolUsersDeleted++;
        });
        await poolUsersBatch.commit();
      }
    }

    // 2. Delete pools from previous day (always delete, not conditional)
    // This includes the main pool documents AND all their subcollections (shards, poolUsers)
    console.log("🗑️ Deleting pools from previous day...");
    const yesterdayPoolsSnapshot = await db
      .collection("pools")
      .where("date", "==", yesterdayStr)
      .get();

    if (!yesterdayPoolsSnapshot.empty) {
      const docs = yesterdayPoolsSnapshot.docs;

      // Delete each pool and all its subcollections completely
      for (const poolDoc of docs) {
        const poolId = poolDoc.id;
        console.log(`🗑️ Deleting pool ${poolId} and all subcollections...`);

        // Get all shards for this pool
        const shardsSnapshot = await db
          .collection("pools")
          .doc(poolId)
          .collection("shards")
          .get();

        if (!shardsSnapshot.empty) {
          console.log(`  Found ${shardsSnapshot.size} shards to delete`);

          // Delete all poolUsers in each shard, then delete the shard
          for (const shardDoc of shardsSnapshot.docs) {
            const shardId = shardDoc.id;

            // Get all poolUsers in this shard
            const poolUsersSnapshot = await db
              .collection("pools")
              .doc(poolId)
              .collection("shards")
              .doc(shardId)
              .collection("poolUsers")
              .get();

            // Delete poolUsers in batches
            if (!poolUsersSnapshot.empty) {
              console.log(
                `    Deleting ${poolUsersSnapshot.size} poolUsers from ${shardId}`
              );
              const poolUsersDocs = poolUsersSnapshot.docs;
              for (let i = 0; i < poolUsersDocs.length; i += 450) {
                const chunk = poolUsersDocs.slice(i, i + 450);
                const poolUsersBatch = db.batch();
                chunk.forEach((doc) => {
                  poolUsersBatch.delete(doc.ref);
                });
                await poolUsersBatch.commit();
              }
            }

            // Delete the shard document itself after all poolUsers are deleted
            console.log(`    Deleting shard document ${shardId}`);
            await shardDoc.ref.delete();
          }
        }

        // Finally, delete the main pool document (after all subcollections are gone)
        console.log(`  Deleting main pool document ${poolId}`);
        await poolDoc.ref.delete();
        poolsDeleted++;
      }
    }

    // 3. Delete pairs from previous day
    console.log("🗑️ Deleting pairs from previous day...");
    const pairsRef = db.collection("pairs");
    const pairsQuery = pairsRef
      .where("poolId", ">=", `${yesterdayStr}-0`)
      .where("poolId", "<", `${yesterdayStr}~`);

    const pairsSnapshot = await pairsQuery.get();
    let pairsDeleted = 0;

    if (!pairsSnapshot.empty) {
      const docs = pairsSnapshot.docs;
      for (let i = 0; i < docs.length; i += 450) {
        const chunk = docs.slice(i, i + 450);
        const pairsBatch = db.batch();
        chunk.forEach((d) => {
          pairsBatch.delete(d.ref);
          pairsDeleted++;
        });
        await pairsBatch.commit();
      }
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
      // Get all messages and delete in chunks
      const messagesSnapshot = await messagesCollectionRef.get();
      if (!messagesSnapshot.empty) {
        const docs = messagesSnapshot.docs;
        for (let i = 0; i < docs.length; i += 450) {
          const chunk = docs.slice(i, i + 450);
          const messagesBatch = db.batch();
          chunk.forEach((doc) => {
            messagesBatch.delete(doc.ref);
            messagesDeleted++;
          });
          await messagesBatch.commit();
        }
        console.log(
          `✅ Deleted ${messagesDeleted} messages from ${messageCollectionName}`
        );
      } else {
        console.log(`⚠️ No messages found in ${messageCollectionName}`);
      }
    } catch (e) {
      console.warn(`⚠️ Error deleting ${messageCollectionName}:`, e);
    }

    // 4. Photo challenges: Hard delete ALL from previous day (no expiration check needed)
    console.log("🗑️ Hard deleting ALL photo challenges from previous day...");
    try {
      const yesterdayPhotoChallengesSnapshot = await db
        .collection("photoChallenge")
        .where("poolId", ">=", `${yesterdayStr}-0`)
        .where("poolId", "<", `${yesterdayStr}~`)
        .get();

      let photoChallengesDeleted = 0;
      let storageDeleted = 0;

      if (!yesterdayPhotoChallengesSnapshot.empty) {
        const docs = yesterdayPhotoChallengesSnapshot.docs;

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

          // Hard delete the Firestore documents in this chunk
          for (const d of chunk) {
            batch.delete(d.ref);
            photoChallengesDeleted++;
          }

          await batch.commit();
        }
      }

      console.log(
        `✅ Hard deleted ${photoChallengesDeleted} photo challenges from ${yesterdayStr}`
      );
    } catch (e) {
      console.warn("⚠️ Error hard deleting photoChallenge collection:", e);
    }

    console.log("✅ Daily cleanup complete", {
      poolUsersDeleted,
      poolsDeleted,
      pairsDeleted,
      messagesDeleted,
      photoChallengesDeleted,
      photosDeletedFromStorage,
      date: yesterdayStr,
    });

    return {
      success: true,
      poolUsersDeleted,
      poolsDeleted,
      pairsDeleted,
      messagesDeleted,
      photoChallengesDeleted,
      photosDeletedFromStorage,
    };
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
 * ✅ UPDATED: Creates 8 hourly pools: 08:00-15:00 UTC (09:00-16:00 Portugal)
 * Each pool:
 * - Opens at the hour (e.g., 08:00 UTC = 09:00 Portugal)
 * - Closes and pairs at the next hour (e.g., 09:00 UTC = 10:00 Portugal)
 * - Users get 2 photo notifications between join time and 19:45 UTC (20:45 Portugal)
 * - Reveal is always between 20:00-20:59 UTC (21:00-21:59 Portugal)
 * - Uses sharding system to handle 100k+ users per pool
 */
export const createDailyPools = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .pubsub.schedule("1 0 * * *") // Every day at 00:01 UTC
  .timeZone("UTC")
  .onRun(async () => {
    initAdmin();
    const db = admin.firestore();

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`📅 Creating hourly pools for ${dateStr}`);

    // ✅ Create 8 hourly pools: 8h-15h UTC (9h-16h Portugal)
    const poolHours = [9, 10, 11, 12, 13, 14, 15, 16];
    const batch = db.batch();

    // Random reveal time between 21:00-22:00 Portugal time (20:00-21:00 UTC)
    const revealHour = 20; // 20:00 UTC = 21:00 Portugal
    const revealMin = Math.floor(Math.random() * 60); // 0-59 minutes
    const revealAt = new Date(now);
    revealAt.setHours(revealHour, revealMin, 0, 0);

    // SAFETY CHECK: Ensure reveal time is never 21:xx or later (should be 20:00-20:59 UTC)
    if (revealAt.getHours() >= 21) {
      console.error(
        `🚨 CRITICAL: Reveal time calculated as ${revealAt.getHours()}:${revealAt.getMinutes()} - clamping to 20:59`
      );
      revealAt.setHours(20, 59, 0, 0);
    }

    for (const hour of poolHours) {
      const poolId = `${dateStr}-${hour}h`;

      // Join window: From (hour-1):00 to hour:00
      const joinWindowStart = new Date(now);
      joinWindowStart.setHours(hour - 1, 0, 0, 0);

      const joinWindowEnd = new Date(now);
      joinWindowEnd.setHours(hour, 0, 0, 0);

      // Photo notification window: From (hour-1):00 to 19:45 (2 photos)
      const photoWindowStart = new Date(now);
      photoWindowStart.setHours(hour - 1, 0, 0, 0);

      const photoWindowEnd = new Date(now);
      photoWindowEnd.setHours(19, 45, 0, 0);

      // Calculate 2 photo times evenly spaced between hour and 19:45
      // Only if there's time (hour < 20)
      // ✅ FIX: Last photo must be max 19:45 (not later)
      const photoTimes: Date[] = [];
      if (hour < 20) {
        const hoursAvailable = 19.75 - (hour - 1);

        if (hoursAvailable >= 2) {
          // Space 2 photos evenly
          const spacing = hoursAvailable / 2;

          // First photo: hour + spacing/2
          const photo1Hour = hour - 1 + Math.floor(spacing / 2);
          const photo1Min = Math.floor(Math.random() * 60);
          const photo1 = new Date(now);
          photo1.setHours(photo1Hour, photo1Min, 0, 0);
          photoTimes.push(photo1);

          // Second photo: hour + spacing + spacing/2 (but max 19:45)
          let photo2Hour = hour - 1 + Math.floor(spacing * 1.5);
          let photo2Min = Math.floor(Math.random() * 60);

          // ✅ Enforce max 19:45
          if (photo2Hour > 19 || (photo2Hour === 19 && photo2Min > 45)) {
            photo2Hour = 19;
            photo2Min = Math.min(45, Math.floor(Math.random() * 46)); // 0-45
          }

          const photo2 = new Date(now);
          photo2.setHours(photo2Hour, photo2Min, 0, 0);
          photoTimes.push(photo2);
        } else if (hoursAvailable === 1) {
          // Only 1 hour left, send 1 photo at random time (but max 19:45)
          let photoHour = hour - 1;
          let photoMin = Math.floor(Math.random() * 60);

          // ✅ Enforce max 19:45 if hour is 20
          if (photoHour === 19) {
            photoMin = Math.min(45, Math.floor(Math.random() * 46)); // 0-45
          }

          const photo = new Date(now);
          photo.setHours(photoHour, photoMin, 0, 0);
          photoTimes.push(photo);
        }
        // If hour >= 19, no photos (too close to reveal)
      }

      // Schedule Cloud Tasks for each photo time instead of storing in Firestore
      for (const photoTime of photoTimes) {
        const taskName = await schedulePhotoTask(poolId, photoTime);
        if (!taskName) {
          console.error(
            `❌ Failed to schedule photo task for pool ${poolId} at ${photoTime.toISOString()}`
          );
        }
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

      // Log photo times for debugging
      const photoTimesStr = photoTimes.map((pt) => pt.toISOString()).join(", ");
      console.log(
        `✅ Pool ${poolId} created: Join ${hour - 1}:00-${hour}:00, Photos: ${
          photoTimes.length
        } [${photoTimesStr}], Reveal ${revealHour}:${revealMin
          .toString()
          .padStart(2, "0")} UTC (${revealHour + 1}:${revealMin
          .toString()
          .padStart(2, "0")} Portugal)`
      );
    }

    await batch.commit();
    console.log(`✅ Created ${poolHours.length} hourly pools for ${dateStr}`);

    // Schedule ONE reveal task for all pools (since they all have the same reveal time)
    const revealTaskName = await scheduleSingleRevealTask(revealAt);
    if (!revealTaskName) {
      console.error(
        `❌ Failed to schedule reveal task at ${revealAt.toISOString()}`
      );
    }

    return { success: true, date: dateStr, pools: poolHours.length };
  });

/**
 * Close and pair hourly pools
 * ✅ UPDATED: Functions run at the END of each pool's window
 * Pool 9h UTC (10h PT): Opens 08:00, closes 09:00 → Function runs at 09:00
 * Pool 10h UTC (11h PT): Opens 09:00, closes 10:00 → Function runs at 10:00
 * etc.
 */

// 09:00 UTC - Pair users from 9h pool (08:00-09:00 UTC = 09:00-10:00 Portugal)
export const closePool9h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 9 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(9);
  });

// 10:00 UTC - Pair users from 10h pool (09:00-10:00 UTC = 10:00-11:00 Portugal)
export const closePool10h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 10 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(10);
  });

// 11:00 UTC - Pair users from 11h pool (10:00-11:00 UTC = 11:00-12:00 Portugal)
export const closePool11h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 11 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(11);
  });

// 12:00 UTC - Pair users from 12h pool (11:00-12:00 UTC = 12:00-13:00 Portugal)
export const closePool12h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 12 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(12);
  });

// 13:00 UTC - Pair users from 13h pool (12:00-13:00 UTC = 13:00-14:00 Portugal)
export const closePool13h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 13 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(13);
  });

// 14:00 UTC - Pair users from 14h pool (13:00-14:00 UTC = 14:00-15:00 Portugal)
export const closePool14h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 14 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(14);
  });

// 15:00 UTC - Pair users from 15h pool (14:00-15:00 UTC = 15:00-16:00 Portugal)
export const closePool15h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 15 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(15);
  });

// 16:00 UTC - Pair users from 16h pool (15:00-16:00 UTC = 16:00-17:00 Portugal)
export const closePool16h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 16 * * *")
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

  // Shuffle the unmatched array to ensure random pairing
  for (let i = unmatched.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unmatched[i], unmatched[j]] = [unmatched[j], unmatched[i]];
  }

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

  // Increment lifetime buddies count for both users when they are paired
  const batch = db.batch();
  const userARef = db.collection("users").doc(userA);
  const userBRef = db.collection("users").doc(userB);

  batch.update(userARef, {
    lifetimeBuddiesCount: admin.firestore.FieldValue.increment(1),
  });
  batch.update(userBRef, {
    lifetimeBuddiesCount: admin.firestore.FieldValue.increment(1),
  });

  await batch.commit();

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
    // Get today's date for filtering pairs created today
    const today = new Date().toISOString().split("T")[0];
    const todayStart = new Date(today + "T00:00:00.000Z");
    const todayEnd = new Date(today + "T23:59:59.999Z");

    // OPTIMIZATION: Single indexed query for active pairs in today's pool
    const pairsSnapshot = await db
      .collection("pairs")
      .where("poolId", "==", poolId)
      .where("status", "==", "active")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(todayStart))
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(todayEnd))
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
            .collection("photoChallenge")
            .doc(`${poolId}-${doc.id}-${timestamp}`);

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
    const today = new Date().toISOString().split("T")[0];

    // Query active pairs from today's pools only
    const pairsRef = db.collection("pairs");
    const snapshot = await pairsRef
      .where("status", "==", "active")
      .where("poolId", ">=", today)
      .where("poolId", "<", today + "\uf8ff")
      .get();
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
async function scheduleRevealTask(poolId: string, revealAt: Date) {
  if (!PROJECT) {
    console.error("❌ PROJECT environment variable not set");
    throw new Error("PROJECT environment variable not set");
  }

  try {
    const tasksClient = getTasksClient();
    const parent = tasksClient.queuePath(PROJECT, LOCATION, QUEUE);
    const payload = { poolId };
    const scheduleTime = { seconds: Math.floor(revealAt.getTime() / 1000) };

    console.log(
      `📋 Scheduling reveal task - Queue: ${QUEUE}, Location: ${LOCATION}, Project: ${PROJECT}`
    );

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
      `✅ Scheduled reveal task for pool ${poolId} at ${revealAt.toISOString()}`
    );
    return response[0].name;
  } catch (error: any) {
    console.error(`❌ Error scheduling reveal task for pool ${poolId}:`, {
      error: error.message,
      stack: error.stack,
      queue: QUEUE,
      location: LOCATION,
      project: PROJECT,
    });
    return null;
  }
}

/**
 * Schedule a single Cloud Task to send reveal notifications to all pools at revealAt time
 */
async function scheduleSingleRevealTask(revealAt: Date) {
  if (!PROJECT) {
    console.error("❌ PROJECT environment variable not set");
    throw new Error("PROJECT environment variable not set");
  }

  try {
    const tasksClient = getTasksClient();
    const parent = tasksClient.queuePath(PROJECT, LOCATION, QUEUE);
    const payload = {}; // No poolId needed for single reveal task
    const scheduleTime = { seconds: Math.floor(revealAt.getTime() / 1000) };

    console.log(
      `📋 Scheduling single reveal task - Queue: ${QUEUE}, Location: ${LOCATION}, Project: ${PROJECT}`
    );

    const task = {
      httpRequest: {
        httpMethod: "POST" as const,
        url: SINGLE_REVEAL_HANDLER_URL,
        headers: { "Content-Type": "application/json" },
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        oidcToken: {
          serviceAccountEmail: `${PROJECT}@appspot.gserviceaccount.com`,
        },
      },
      scheduleTime,
    };

    const response = await tasksClient.createTask({ parent, task });
    console.log(`✅ Scheduled single reveal task at ${revealAt.toISOString()}`);
    return response[0].name;
  } catch (error: any) {
    console.error(`❌ Error scheduling single reveal task:`, {
      error: error.message,
      stack: error.stack,
      queue: QUEUE,
      location: LOCATION,
      project: PROJECT,
    });
    return null;
  }
}

/**
 * Schedule a Cloud Task to send photo notification at photo time
 */
async function schedulePhotoTask(poolId: string, photoAt: Date) {
  if (!PROJECT) {
    console.error("❌ PROJECT environment variable not set");
    throw new Error("PROJECT environment variable not set");
  }

  try {
    const tasksClient = getTasksClient();
    const parent = tasksClient.queuePath(PROJECT, LOCATION, QUEUE);
    const payload = { poolId };
    const scheduleTime = { seconds: Math.floor(photoAt.getTime() / 1000) };

    console.log(
      `📋 Scheduling photo task - Queue: ${QUEUE}, Location: ${LOCATION}, Project: ${PROJECT}`
    );

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
  } catch (error: any) {
    console.error(`❌ Error scheduling photo task for pool ${poolId}:`, {
      error: error.message,
      stack: error.stack,
      queue: QUEUE,
      location: LOCATION,
      project: PROJECT,
    });
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
 * HTTP handler called by Cloud Tasks to send reveal notification for a pool
 */
export const sendRevealForPair = functions
  .runWith({ timeoutSeconds: 60, memory: "128MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();
      const { poolId } = req.body;
      if (!poolId) {
        res.status(400).json({ error: "poolId required" });
        return;
      }

      // Send notifications (reuse existing logic)
      const sent = await sendRevealNotificationsForPool(poolId, db);
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
 * HTTP handler called by Cloud Tasks to send single reveal notification to all pairs
 */
export const sendSingleRevealNotification = functions
  .runWith({ timeoutSeconds: 60, memory: "128MB" })
  .https.onRequest(async (req, res) => {
    try {
      initAdmin();
      const db = admin.firestore();

      // Send notifications to all eligible pairs (no poolId needed)
      const sent = await sendRevealNotifications(db);
      res.status(200).json({ success: true, sent });
    } catch (error: any) {
      console.error("Error in sendSingleRevealNotification:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

/**
 * Send reveal notifications for all pairs in a pool
 */
async function sendRevealNotificationsForPool(
  poolId: string,
  db: admin.firestore.Firestore
) {
  try {
    const nowTs = admin.firestore.Timestamp.now();
    const today = new Date().toISOString().split("T")[0];

    // Ensure we're only processing today's pools
    if (!poolId.startsWith(today)) {
      console.log(`⚠️ Skipping reveal notifications for old pool: ${poolId}`);
      return 0;
    }

    const pairsRef = db.collection("pairs");

    const snapshot = await pairsRef
      .where("poolId", "==", poolId)
      .where("status", "==", "active")
      .get();
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
      `📤 Sending reveal notifications for ${eligiblePairs.length} pairs in pool ${poolId}...`
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
      `✅ Sent ${totalSent} reveal notifications for ${eligiblePairs.length} pairs in pool ${poolId}`
    );
    return totalSent;
  } catch (error) {
    console.error("❌ Error sending reveal notifications for pool:", error);
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

      const revealHour = 20;
      const revealMin = Math.floor(Math.random() * 60);
      const revealAt = new Date(now);
      revealAt.setHours(revealHour, revealMin, 0, 0);

      // SAFETY CHECK: Ensure reveal time is never 21:xx or later
      if (revealAt.getHours() >= 21) {
        console.error(
          `🚨 CRITICAL: Reveal time calculated as ${revealAt.getHours()}:${revealAt.getMinutes()} - clamping to 20:59`
        );
        revealAt.setHours(20, 59, 0, 0);
      }

      for (const hour of poolHours) {
        const poolId = `${dateStr}-${hour}h`;

        const joinWindowStart = new Date(now);
        joinWindowStart.setHours(hour - 1, 0, 0, 0);

        const joinWindowEnd = new Date(now);
        joinWindowEnd.setHours(hour, 0, 0, 0);

        const photoWindowStart = new Date(now);
        photoWindowStart.setHours(hour - 1, 0, 0, 0);

        const photoWindowEnd = new Date(now);
        photoWindowEnd.setHours(19, 45, 0, 0);

        const photoTimes: Date[] = [];
        if (hour < 20) {
          const hoursAvailable = 19.75 - (hour - 1);

          if (hoursAvailable >= 2) {
            const spacing = hoursAvailable / 2;

            const photo1Hour = hour - 1 + Math.floor(spacing / 2);
            const photo1Min = Math.floor(Math.random() * 60);
            const photo1 = new Date(now);
            photo1.setHours(photo1Hour, photo1Min, 0, 0);
            photoTimes.push(photo1);

            const photo2Hour = hour - 1 + Math.floor(spacing * 1.5);
            const photo2Min = Math.floor(Math.random() * 60);
            const photo2 = new Date(now);
            photo2.setHours(photo2Hour, photo2Min, 0, 0);
            photoTimes.push(photo2);
          } else if (hoursAvailable === 1) {
            const photoHour = hour - 1;
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

        // Schedule reveal task for the pool
        const revealTaskName = await scheduleRevealTask(poolId, revealAt);
        if (!revealTaskName) {
          console.error(
            `❌ Failed to schedule reveal task for pool ${poolId} at ${revealAt.toISOString()}`
          );
        }
      }

      await batch.commit();

      // Schedule ONE reveal task for all pools (since they all have the same reveal time)
      const singleRevealTaskName = await scheduleSingleRevealTask(revealAt);
      if (!singleRevealTaskName) {
        console.error(
          `❌ Failed to schedule single reveal task at ${revealAt.toISOString()}`
        );
      }

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

      // Read current user data to update streak based on last activity date
      const senderDoc = await senderRef.get();
      const senderData = senderDoc.exists ? senderDoc.data() : {};
      const lastActivityDate =
        senderData?.lastActivityDate || senderData?.lastPairedDate;
      const currentStreak = senderData?.streak || 0;

      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = currentStreak;

      if (lastActivityDate) {
        if (lastActivityDate === yesterdayStr) {
          // Consecutive day activity
          newStreak = currentStreak + 1;
        } else if (lastActivityDate === today) {
          // Already active today - keep current streak
          newStreak = currentStreak || 1;
        } else {
          // Missed one or more days - lose streak
          newStreak = 0;
        }
      } else {
        // First time activity - start streak
        newStreak = 1;
      }

      await senderRef.update({
        points: admin.firestore.FieldValue.increment(10),
        streak: newStreak,
        lastActivityDate: today,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `✅ Awarded 10 points to ${senderId} for sending photo, streak: ${newStreak}`
      );
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
      // Streak broken - reset to 0 (user loses their streak and won't receive streak bonus)
      newStreak = 0;
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

// ==================== STORIES (R2 INTEGRATION) ====================

/**
 * Generate pre-signed R2 upload URL for story images
 * Client calls this to get an upload URL, then uploads directly to R2
 *
 * Setup Required in Cloudflare R2:
 * 1. Create bucket: "secretbuddy-stories"
 * 2. Create API Token with "Object Read & Write" permissions
 * 3. Store in Firebase Config:
 *    firebase functions:config:set r2.account_id="YOUR_ACCOUNT_ID"
 *    firebase functions:config:set r2.access_key_id="YOUR_ACCESS_KEY"
 *    firebase functions:config:set r2.secret_access_key="YOUR_SECRET_KEY"
 *    firebase functions:config:set r2.bucket_name="secretbuddy-stories"
 *
 * POST /generateStoryUploadUrl
 * Body: { userId: string }
 * Returns: { uploadUrl: string, fileKey: string }
 */
export const generateStoryUploadUrl = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      initAdmin();
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: "userId required" });
        return;
      }

      // Get R2 credentials from Firebase config
      const r2Config = functions.config().r2;

      if (
        !r2Config ||
        !r2Config.account_id ||
        !r2Config.access_key_id ||
        !r2Config.secret_access_key
      ) {
        console.error(
          "❌ R2 credentials not configured. Run: firebase functions:config:set r2.account_id=... r2.access_key_id=... r2.secret_access_key=..."
        );
        res.status(500).json({
          error: "R2 not configured",
          details:
            "Please configure R2 credentials using Firebase functions config",
        });
        return;
      }

      const ACCOUNT_ID = r2Config.account_id;
      const ACCESS_KEY_ID = r2Config.access_key_id;
      const SECRET_ACCESS_KEY = r2Config.secret_access_key;
      const BUCKET_NAME = r2Config.bucket_name || "secretbuddy-stories";

      // Generate unique file key
      const today = new Date().toISOString().split("T")[0];
      const timestamp = Date.now();
      const fileKey = `stories/${today}/${userId}_${timestamp}.jpg`;

      // Generate pre-signed URL using AWS SDK (R2 is S3-compatible)
      const AWS = require("aws-sdk");

      const s3 = new AWS.S3({
        endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
        signatureVersion: "v4",
        region: "auto",
      });

      const uploadUrl = await s3.getSignedUrlPromise("putObject", {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Expires: 300, // 5 minutes
        ContentType: "image/jpeg",
      });

      console.log(`✅ Generated upload URL for user ${userId}`);

      res.status(200).json({
        success: true,
        uploadUrl,
        fileKey,
        bucket: BUCKET_NAME,
      });
    } catch (error: any) {
      console.error("❌ Error generating upload URL:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * Get public R2 URL for a story image
 * R2 public URL format: https://pub-XXXX.r2.dev/stories/...
 *
 * Setup Required:
 * 1. Enable R2 Public Access in Cloudflare dashboard
 * 2. Get public URL domain (e.g., pub-abc123.r2.dev)
 * 3. Store in Firebase Config:
 *    firebase functions:config:set r2.public_url="https://pub-XXXX.r2.dev"
 *
 * GET /getStoryUrl?fileKey=stories/2025-11-11/user123_1234567890.jpg
 * Returns: { url: string }
 */
export const getStoryUrl = functions
  .runWith({ timeoutSeconds: 10, memory: "128MB" })
  .https.onRequest(async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const { fileKey } = req.query;

      if (!fileKey) {
        res.status(400).json({ error: "fileKey required" });
        return;
      }

      const r2Config = functions.config().r2;

      if (!r2Config || !r2Config.public_url) {
        console.error(
          "❌ R2 public URL not configured. Run: firebase functions:config:set r2.public_url=https://pub-XXXX.r2.dev"
        );
        res.status(500).json({
          error: "R2 public URL not configured",
          details:
            "Please configure r2.public_url using Firebase functions config",
        });
        return;
      }

      const PUBLIC_URL = r2Config.public_url;
      const url = `${PUBLIC_URL}/${fileKey}`;

      res.status(200).json({
        success: true,
        url,
      });
    } catch (error: any) {
      console.error("❌ Error getting story URL:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * Cleanup expired stories from R2 and Firestore
 * Runs daily at 01:00 UTC to delete stories older than 24 hours
 *
 * This handles:
 * 1. Delete story documents from Firestore (older than 24h)
 * 2. Delete story images from R2 bucket (older than 24h)
 */
export const cleanupExpiredStories = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 1 * * *") // Every day at 01:00 UTC
  .timeZone("UTC")
  .onRun(async () => {
    initAdmin();
    const db = admin.firestore();

    const now = Date.now();

    console.log("🧹 Cleaning up expired stories...");

    try {
      // Delete expired stories from Firestore
      const expiredSnapshot = await db
        .collection("dailyStories")
        .where("expiresAt", "<", admin.firestore.Timestamp.fromMillis(now))
        .get();

      let deletedCount = 0;
      const r2FileKeys: string[] = [];

      if (!expiredSnapshot.empty) {
        const batch = db.batch();

        expiredSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.r2FileKey) {
            r2FileKeys.push(data.r2FileKey);
          }
          batch.delete(doc.ref);
          deletedCount++;
        });

        await batch.commit();
      }

      console.log(`✅ Deleted ${deletedCount} expired stories from Firestore`);

      // Delete files from R2 if configured
      if (r2FileKeys.length > 0) {
        const r2Config = functions.config().r2;

        if (
          r2Config?.account_id &&
          r2Config?.access_key_id &&
          r2Config?.secret_access_key
        ) {
          const AWS = require("aws-sdk");
          const BUCKET_NAME = r2Config.bucket_name || "secretbuddy-stories";

          const s3 = new AWS.S3({
            endpoint: `https://${r2Config.account_id}.r2.cloudflarestorage.com`,
            accessKeyId: r2Config.access_key_id,
            secretAccessKey: r2Config.secret_access_key,
            signatureVersion: "v4",
            region: "auto",
          });

          // Delete in batches (S3 allows 1000 per batch)
          for (let i = 0; i < r2FileKeys.length; i += 1000) {
            const chunk = r2FileKeys.slice(i, i + 1000);

            await s3
              .deleteObjects({
                Bucket: BUCKET_NAME,
                Delete: {
                  Objects: chunk.map((key) => ({ Key: key })),
                },
              })
              .promise();
          }

          console.log(`✅ Deleted ${r2FileKeys.length} files from R2`);
        }
      }

      return {
        success: true,
        deletedStories: deletedCount,
        deletedFiles: r2FileKeys.length,
      };
    } catch (error: any) {
      console.error("❌ Error cleaning up stories:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  });
