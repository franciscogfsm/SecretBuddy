import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// Don't initialize at module load - causes timeout
let initialized = false;
function initAdmin() {
  if (!initialized) {
    admin.initializeApp();
    initialized = true;
  }
}

// ==================== PHOTO CLEANUP ====================

// Shared cleanup logic
async function performCleanup() {
  initAdmin();
  const db = admin.firestore();
  const storage = admin.storage();
  const bucket = storage.bucket();

  const now = Date.now();
  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const photosRef = db.collection("photoChallenge");
  const snapshot = await photosRef.get();

  let deletedFromFirestore = 0;
  let deletedFromStorage = 0;
  let errors = 0;

  const tasks: Promise<any>[] = [];

  snapshot.forEach((doc) => {
    tasks.push(
      (async () => {
        try {
          const photoData = doc.data();
          if (!photoData.timestamp || photoData.deleted) return;

          const photoTimestamp =
            photoData.timestamp.toMillis?.() ??
            new Date(photoData.timestamp).getTime();
          const age = now - photoTimestamp;

          // Full cleanup: older than 24h
          if (age > TWENTY_FOUR_HOURS) {
            // Delete from storage using storagePath
            if (photoData.storagePath) {
              try {
                const file = bucket.file(photoData.storagePath);
                const [exists] = await file.exists();
                if (exists) {
                  await file.delete();
                  deletedFromStorage++;
                  console.log(
                    `🗑️ Deleted from storage: ${photoData.storagePath}`
                  );
                } else {
                  console.log(
                    `⚠️ File not found in storage: ${photoData.storagePath}`
                  );
                }
              } catch (e) {
                console.warn(
                  `⚠️ Storage deletion error: ${photoData.storagePath}`,
                  e
                );
              }
            } else {
              console.warn(`⚠️ No storagePath for photo: ${doc.id}`);
            }

            // Delete Firestore document
            await doc.ref.delete();
            deletedFromFirestore++;
          }
          // Expire unviewed 4h+ photos (soft delete)
          else if (age > FOUR_HOURS && !photoData.viewed) {
            await doc.ref.update({
              deleted: true,
              deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            deletedFromFirestore++;
          }
        } catch (e) {
          console.error(`❌ Error processing ${doc.id}:`, e);
          errors++;
        }
      })()
    );
  });

  await Promise.all(tasks);

  console.log("✅ Cleanup complete", {
    deletedFromFirestore,
    deletedFromStorage,
    errors,
    totalProcessed: snapshot.size,
  });

  return { deletedFromFirestore, deletedFromStorage, errors };
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
    const storage = admin.storage();

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

    // 3. Delete messages older than 2 days
    console.log("🗑️ Deleting messages older than 2 days...");
    const messagesSnapshot = await db
      .collection("messages")
      .where("timestamp", "<", admin.firestore.Timestamp.fromDate(twoDaysAgo))
      .get();

    const messagesBatch = db.batch();
    messagesSnapshot.forEach((doc) => {
      messagesBatch.delete(doc.ref);
      messagesDeleted++;
    });
    await messagesBatch.commit();

    // 4. Delete photo challenges older than 1 day
    console.log("🗑️ Deleting photo challenges older than 1 day...");
    const photoChallengeSnapshot = await db
      .collection("photoChallenge")
      .where("timestamp", "<", admin.firestore.Timestamp.fromDate(yesterday))
      .get();

    const photoBatch = db.batch();
    const storageDeleteTasks: Promise<any>[] = [];

    photoChallengeSnapshot.forEach((doc) => {
      const data = doc.data();

      // Delete from storage if storagePath exists
      if (data.storagePath) {
        storageDeleteTasks.push(
          (async () => {
            try {
              const bucket = storage.bucket();
              const file = bucket.file(data.storagePath);
              const [exists] = await file.exists();
              if (exists) {
                await file.delete();
                photosDeletedFromStorage++;
                console.log(`🗑️ Deleted from storage: ${data.storagePath}`);
              }
            } catch (e) {
              console.warn(`⚠️ Storage deletion error: ${data.storagePath}`, e);
            }
          })()
        );
      }

      photoBatch.delete(doc.ref);
      photoChallengesDeleted++;
    });

    await Promise.all([photoBatch.commit(), ...storageDeleteTasks]);

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

// ==================== POOL SYSTEM ====================

/**
 * Create daily hourly pools at midnight (00:00 UTC)
 * Creates 8 hourly pools: 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00
 * Each pool:
 * - Opens at the hour (e.g., 10:00)
 * - Closes and pairs at the next hour (e.g., 11:00)
 * - Users get 2 photo notifications between join time and 21:00
 * - Reveal is always between 21:00-22:00
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

    // Create 8 hourly pools: 10h, 11h, 12h, 13h, 14h, 15h, 16h, 17h
    const poolHours = [10, 11, 12, 13, 14, 15, 16, 17];
    const batch = db.batch();

    // Random reveal time between 21:00-22:00 (same for all pools)
    const revealHour = 21;
    const revealMin = Math.floor(Math.random() * 60);
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

          // Second photo: hour + spacing + spacing/2
          const photo2Hour = hour + Math.floor(spacing * 1.5);
          const photo2Min = Math.floor(Math.random() * 60);
          const photo2 = new Date(now);
          photo2.setHours(photo2Hour, photo2Min, 0, 0);
          photoTimes.push(photo2);
        } else if (hoursAvailable === 1) {
          // Only 1 hour left, send 1 photo at random time
          const photoHour = hour;
          const photoMin = Math.floor(Math.random() * 60);
          const photo = new Date(now);
          photo.setHours(photoHour, photoMin, 0, 0);
          photoTimes.push(photo);
        }
        // If hour >= 20, no photos (too close to reveal)
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
        photoTimes: photoTimes.map((t) =>
          admin.firestore.Timestamp.fromDate(t)
        ),
        revealAt: admin.firestore.Timestamp.fromDate(revealAt),
        status: "open",
        userCount: 0,
        pairsCount: 0,
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
 * Creates 8 functions, one for each hour (11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00, 18:00)
 * Each function pairs users from the previous hour's pool
 */

// 11:00 - Pair users from 10h pool
export const closePool10h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 11 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(10);
  });

// 12:00 - Pair users from 11h pool
export const closePool11h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 12 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(11);
  });

// 13:00 - Pair users from 12h pool
export const closePool12h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 13 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(12);
  });

// 14:00 - Pair users from 13h pool
export const closePool13h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 14 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(13);
  });

// 15:00 - Pair users from 14h pool
export const closePool14h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 15 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(14);
  });

// 16:00 - Pair users from 15h pool
export const closePool15h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 16 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(15);
  });

// 17:00 - Pair users from 16h pool
export const closePool16h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 17 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(16);
  });

// 18:00 - Pair users from 17h pool
export const closePool17h = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 18 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    return await closeHourlyPool(17);
  });

/**
 * Shared logic to close and pair an hourly pool
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

  // Get all users in this pool (OPTIMIZED: only queries users who joined)
  const poolUsersSnapshot = await db
    .collection("poolUsers")
    .where("poolId", "==", poolId)
    .get();

  console.log(`👥 Found ${poolUsersSnapshot.size} users in pool ${poolId}`);

  if (poolUsersSnapshot.empty) {
    console.log("⚠️ No users to pair");
    await db.collection("pools").doc(poolId).update({ status: "closed" });
    return { success: true, pairs: 0 };
  }

  // Match users
  const pairs = await matchUsers(poolId, poolUsersSnapshot.docs, db);

  await db.collection("pools").doc(poolId).update({
    status: "closed",
    pairsCount: pairs,
  });

  console.log(`✅ Pool ${poolId} closed. Created ${pairs} pairs`);

  return { success: true, pairs };
}

/**
 * Match users in a pool
 * Priority: Friends > Same Country > Random
 */
async function matchUsers(
  poolId: string,
  userDocs: admin.firestore.QueryDocumentSnapshot[],
  db: admin.firestore.Firestore
): Promise<number> {
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

  // Helper: Check if two users are friends
  const areFriends = async (
    userId1: string,
    userId2: string
  ): Promise<boolean> => {
    const friendshipsSnapshot = await db
      .collection("friendships")
      .where("status", "==", "accepted")
      .get();

    for (const doc of friendshipsSnapshot.docs) {
      const data = doc.data();
      if (
        (data.userId1 === userId1 && data.userId2 === userId2) ||
        (data.userId1 === userId2 && data.userId2 === userId1)
      ) {
        return true;
      }
    }
    return false;
  };

  // Step 1: Match friends first
  console.log("🤝 Step 1: Matching friends...");
  for (const user of users) {
    if (matched.has(user.id)) continue;

    for (const otherUser of users) {
      if (matched.has(otherUser.id) || user.id === otherUser.id) continue;

      if (await areFriends(user.id, otherUser.id)) {
        await createPair(user.id, otherUser.id, poolId, poolData, db);
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
        await createPair(user.id, otherUser.id, poolId, poolData, db);
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
    await createPair(
      unmatched[i].id,
      unmatched[i + 1].id,
      poolId,
      poolData,
      db
    );
    pairsCreated++;
    console.log(
      `✅ Paired randomly: ${unmatched[i].id} <-> ${unmatched[i + 1].id}`
    );
  }

  // If odd number, last user stays unpaired
  if (unmatched.length % 2 === 1) {
    console.log(
      `⚠️ User ${unmatched[unmatched.length - 1].id} left unpaired (odd count)`
    );
  }

  return pairsCreated;
}

/**
 * Create a pair in Firestore
 */
async function createPair(
  userA: string,
  userB: string,
  poolId: string,
  poolData: any,
  db: admin.firestore.Firestore
): Promise<void> {
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
}

/**
 * Manual HTTP function to create pairs (for testing)
 * Can work in two modes:
 * 1. With poolId: Pairs only users who joined that pool
 * 2. With allUsers=true: Creates fake pool entries for ALL users and pairs them
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

      let poolUsersSnapshot;

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

        // Create fake poolUsers entries for all users
        const batch = db.batch();
        const userIds: string[] = [];

        allUsersSnapshot.forEach((userDoc) => {
          const userId = userDoc.id;
          userIds.push(userId);

          const poolUserRef = db
            .collection("poolUsers")
            .doc(`${poolId}-${userId}`);
          batch.set(poolUserRef, {
            poolId,
            userId,
            joinedAt: admin.firestore.FieldValue.serverTimestamp(),
            priority: "world",
          });
        });

        await batch.commit();
        console.log(
          `✅ Created ${userIds.length} poolUsers entries for testing`
        );

        // Get the created poolUsers
        poolUsersSnapshot = await db
          .collection("poolUsers")
          .where("poolId", "==", poolId)
          .get();
      }
      // MODE 2: Pair only users who joined the pool
      else {
        console.log("👥 NORMAL MODE: Pairing users who joined the pool");

        poolUsersSnapshot = await db
          .collection("poolUsers")
          .where("poolId", "==", poolId)
          .get();

        if (poolUsersSnapshot.empty) {
          res.status(404).json({
            error: "No users in pool. Use allUsers=true to pair all users.",
          });
          return;
        }
      }

      const pairs = await matchUsers(poolId, poolUsersSnapshot.docs, db);

      res.status(200).json({
        success: true,
        message: `Created ${pairs} pairs`,
        pairs,
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

    console.log(`📸 Sending to ${userIds.size} users in ${poolId}`);

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
 * Check and send photo notifications every minute
 * OPTIMIZED: Only runs if there are photo times scheduled for current minute
 * Uses indexed query instead of fetching all pools
 */
export const checkPhotoNotifications = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .pubsub.schedule("every 1 minutes")
  .timeZone("UTC")
  .onRun(async () => {
    initAdmin();
    const db = admin.firestore();

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Early exit: Photo times only happen between 13:00-22:00 UTC
    if (currentHour < 13 || currentHour >= 22) {
      // Silent exit - no logs to save costs
      return { success: true, skipped: "outside_photo_hours" };
    }

    console.log(
      `⏰ Checking photo notifications at ${currentHour}:${currentMin}`
    );

    // OPTIMIZATION: Use batch get for both pools in one call
    const poolRefs = [
      db.collection("pools").doc(`morning-${dateStr}`),
      db.collection("pools").doc(`afternoon-${dateStr}`),
    ];

    const [morningPoolDoc, afternoonPoolDoc] = await db.getAll(...poolRefs);

    const poolsToCheck = [
      { doc: morningPoolDoc, name: "morning" },
      { doc: afternoonPoolDoc, name: "afternoon" },
    ];

    let notificationsSent = 0;

    for (const { doc, name } of poolsToCheck) {
      if (!doc.exists) continue;

      const poolData = doc.data();
      const photoTimes = poolData?.photoTimes || [];

      // OPTIMIZATION: Check all photo times in memory (no extra queries)
      for (const photoTime of photoTimes) {
        const photoDate = photoTime.toDate();
        const photoHour = photoDate.getHours();
        const photoMin = photoDate.getMinutes();

        // Match current time (within 1-minute window)
        if (photoHour === currentHour && photoMin === currentMin) {
          console.log(`📸 ${name} pool photo time matched! Sending...`);
          const sent = await sendPhotoNotificationToPool(doc.id, db);
          notificationsSent += sent;
        }
      }
    }

    // Only log if notifications were sent
    if (notificationsSent > 0) {
      console.log(`✅ Sent ${notificationsSent} total notifications`);
    }

    return { success: true, sent: notificationsSent };
  });

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

      const poolHours = [10, 11, 12, 13, 14, 15, 16, 17];
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
          photoTimes: photoTimes.map((t) =>
            admin.firestore.Timestamp.fromDate(t)
          ),
          revealAt: admin.firestore.Timestamp.fromDate(revealAt),
          status: "open",
          userCount: 0,
          pairsCount: 0,
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

      if (!hour || hour < 10 || hour > 17) {
        res.status(400).json({
          error: "Invalid hour. Must be between 10 and 17.",
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
