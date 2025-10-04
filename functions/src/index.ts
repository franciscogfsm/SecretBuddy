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
            if (photoData.storagePath) {
              try {
                const bucket = storage.bucket();
                const file = bucket.file(photoData.storagePath);
                const [exists] = await file.exists();
                if (exists) {
                  await file.delete();
                  deletedFromStorage++;
                }
              } catch (e) {
                console.warn(`⚠️ Storage deletion error: ${doc.id}`, e);
              }
            }
            await doc.ref.delete();
            deletedFromFirestore++;
          }
          // Expire unviewed 4h+ photos
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

// ==================== POOL SYSTEM ====================

/**
 * Create daily pools at midnight (00:00 UTC)
 * Creates both morning and afternoon pools with random photo windows and reveal times
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

    console.log(`📅 Creating pools for ${dateStr}`);

    // Morning Pool: Join 08:00-13:00, Pairing at 13:00
    const morningJoinStart = new Date(now);
    morningJoinStart.setHours(8, 0, 0, 0);

    const morningJoinEnd = new Date(now);
    morningJoinEnd.setHours(13, 0, 0, 0);

    // Random photo window between 13:00-21:00 (different each day)
    const photoStartHour = 13 + Math.floor(Math.random() * 8); // 13-20
    const photoStartMin = Math.floor(Math.random() * 60);
    const morningPhotoStart = new Date(now);
    morningPhotoStart.setHours(photoStartHour, photoStartMin, 0, 0);

    const morningPhotoEnd = new Date(morningPhotoStart);
    morningPhotoEnd.setHours(morningPhotoEnd.getHours() + 6); // 6 hour window

    // Random max photos (1-3)
    const morningMaxPhotos = 1 + Math.floor(Math.random() * 3);

    // Generate photo notification times for morning pool
    const morningPhotoTimes: Date[] = [];
    const morningWindowStart = 13;
    const morningWindowEnd = 21;

    for (let i = 0; i < morningMaxPhotos; i++) {
      // Ensure at least 1 hour spacing between photo times
      const minHour = i === 0 ? morningWindowStart : morningWindowStart + i + 1;
      const maxHour =
        morningWindowEnd - (morningMaxPhotos - i - 1) - 1 >= minHour
          ? morningWindowEnd - (morningMaxPhotos - i - 1) - 1
          : minHour;

      const photoHour =
        minHour + Math.floor(Math.random() * (maxHour - minHour + 1));
      const photoMin = Math.floor(Math.random() * 60);

      const photoTime = new Date(now);
      photoTime.setHours(photoHour, photoMin, 0, 0);
      morningPhotoTimes.push(photoTime);
    }

    // Sort times in ascending order
    morningPhotoTimes.sort((a, b) => a.getTime() - b.getTime());

    // Random reveal time between 21:00-22:00
    const revealHour = 21;
    const revealMin = Math.floor(Math.random() * 60);
    const morningRevealAt = new Date(now);
    morningRevealAt.setHours(revealHour, revealMin, 0, 0);

    await db
      .collection("pools")
      .doc(`morning-${dateStr}`)
      .set({
        type: "morning",
        date: dateStr,
        joinWindowStart: admin.firestore.Timestamp.fromDate(morningJoinStart),
        joinWindowEnd: admin.firestore.Timestamp.fromDate(morningJoinEnd),
        photoWindowStart: admin.firestore.Timestamp.fromDate(morningPhotoStart),
        photoWindowEnd: admin.firestore.Timestamp.fromDate(morningPhotoEnd),
        maxPhotos: morningMaxPhotos,
        photoTimes: morningPhotoTimes.map((t) =>
          admin.firestore.Timestamp.fromDate(t)
        ),
        revealAt: admin.firestore.Timestamp.fromDate(morningRevealAt),
        status: "open",
        userCount: 0,
        pairsCount: 0,
      });

    console.log(
      `✅ Morning pool created: Photos at ${morningPhotoTimes
        .map(
          (t) => `${t.getHours()}:${t.getMinutes().toString().padStart(2, "0")}`
        )
        .join(", ")}, Max ${morningMaxPhotos}, Reveal ${revealHour}:${revealMin
        .toString()
        .padStart(2, "0")}`
    );

    // Afternoon Pool: Join 13:00-17:00, Pairing at 17:00
    const afternoonJoinStart = new Date(now);
    afternoonJoinStart.setHours(13, 0, 0, 0);

    const afternoonJoinEnd = new Date(now);
    afternoonJoinEnd.setHours(17, 0, 0, 0);

    // Random photo window between 17:00-21:00
    const afternoonPhotoStartHour = 17 + Math.floor(Math.random() * 4); // 17-20
    const afternoonPhotoStartMin = Math.floor(Math.random() * 60);
    const afternoonPhotoStart = new Date(now);
    afternoonPhotoStart.setHours(
      afternoonPhotoStartHour,
      afternoonPhotoStartMin,
      0,
      0
    );

    const afternoonPhotoEnd = new Date(afternoonPhotoStart);
    afternoonPhotoEnd.setHours(afternoonPhotoEnd.getHours() + 4); // 4 hour window

    // Always 1 photo for afternoon
    const afternoonMaxPhotos = 1;

    // Generate photo notification time for afternoon pool (only 1 photo)
    const afternoonPhotoTimes: Date[] = [];
    const afternoonPhotoHour = 17 + Math.floor(Math.random() * 4); // 17-20
    const afternoonPhotoMin = Math.floor(Math.random() * 60);
    const afternoonPhotoTime = new Date(now);
    afternoonPhotoTime.setHours(afternoonPhotoHour, afternoonPhotoMin, 0, 0);
    afternoonPhotoTimes.push(afternoonPhotoTime);

    // Same reveal time as morning
    const afternoonRevealAt = new Date(now);
    afternoonRevealAt.setHours(revealHour, revealMin, 0, 0);

    await db
      .collection("pools")
      .doc(`afternoon-${dateStr}`)
      .set({
        type: "afternoon",
        date: dateStr,
        joinWindowStart: admin.firestore.Timestamp.fromDate(afternoonJoinStart),
        joinWindowEnd: admin.firestore.Timestamp.fromDate(afternoonJoinEnd),
        photoWindowStart:
          admin.firestore.Timestamp.fromDate(afternoonPhotoStart),
        photoWindowEnd: admin.firestore.Timestamp.fromDate(afternoonPhotoEnd),
        maxPhotos: afternoonMaxPhotos,
        photoTimes: afternoonPhotoTimes.map((t) =>
          admin.firestore.Timestamp.fromDate(t)
        ),
        revealAt: admin.firestore.Timestamp.fromDate(afternoonRevealAt),
        status: "open",
        userCount: 0,
        pairsCount: 0,
      });

    console.log(
      `✅ Afternoon pool created: Photo at ${afternoonPhotoHour}:${afternoonPhotoMin
        .toString()
        .padStart(
          2,
          "0"
        )}, Max ${afternoonMaxPhotos}, Reveal ${revealHour}:${revealMin
        .toString()
        .padStart(2, "0")}`
    );

    return { success: true, date: dateStr };
  });

/**
 * Close morning pool and create pairs (13:00 UTC daily)
 */
export const closeMorningPool = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 13 * * *") // Every day at 13:00 UTC
  .timeZone("UTC")
  .onRun(async () => {
    initAdmin();
    const db = admin.firestore();

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const poolId = `morning-${dateStr}`;

    console.log(`🔒 Closing morning pool: ${poolId}`);

    await db.collection("pools").doc(poolId).update({
      status: "pairing",
    });

    // Get all users in this pool
    const poolUsersSnapshot = await db
      .collection("poolUsers")
      .where("poolId", "==", poolId)
      .get();

    console.log(`👥 Found ${poolUsersSnapshot.size} users in pool`);

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

    console.log(`✅ Morning pool closed. Created ${pairs} pairs`);

    return { success: true, pairs };
  });

/**
 * Close afternoon pool and create pairs (17:00 UTC daily)
 */
export const closeAfternoonPool = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 17 * * *") // Every day at 17:00 UTC
  .timeZone("UTC")
  .onRun(async () => {
    initAdmin();
    const db = admin.firestore();

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const poolId = `afternoon-${dateStr}`;

    console.log(`🔒 Closing afternoon pool: ${poolId}`);

    await db.collection("pools").doc(poolId).update({
      status: "pairing",
    });

    // Get all users in this pool
    const poolUsersSnapshot = await db
      .collection("poolUsers")
      .where("poolId", "==", poolId)
      .get();

    console.log(`👥 Found ${poolUsersSnapshot.size} users in pool`);

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

    console.log(`✅ Afternoon pool closed. Created ${pairs} pairs`);

    return { success: true, pairs };
  });

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
