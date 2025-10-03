import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin lazily
let initialized = false;

function initializeApp() {
  if (!initialized) {
    admin.initializeApp();
    initialized = true;
  }
}

/**
 * Cloud Function to cleanup old photos from photoChallenge collection
 *
 * RUNS: Every 4 hours automatically
 *
 * DELETES:
 * - Photos older than 4 hours (expired viewing window) from Firestore
 * - Photos older than 24 hours (to free up storage) from both Firestore AND Storage
 *
 * This prevents the database from growing indefinitely and saves storage costs
 */
export const cleanupOldPhotos = functions.pubsub
  .schedule("every 4 hours")
  .timeZone("UTC")
  .onRun(async (_context) => {
    initializeApp();
    const db = admin.firestore();
    const storage = admin.storage();

    console.log("🧹 Starting scheduled photo cleanup...");

    try {
      const now = admin.firestore.Timestamp.now();
      const nowMillis = now.toMillis();

      // Time thresholds
      const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      const photosRef = db.collection("photoChallenge");
      const snapshot = await photosRef.get();

      let deletedFromFirestore = 0;
      let deletedFromStorage = 0;
      let errors = 0;

      // Process each photo
      for (const doc of snapshot.docs) {
        try {
          const photoData = doc.data();
          const photoId = doc.id;

          // Skip if no timestamp or already deleted
          if (!photoData.timestamp || photoData.deleted) {
            continue;
          }

          const photoTimestamp = photoData.timestamp.toMillis();
          const age = nowMillis - photoTimestamp;

          // Delete photos older than 24 hours (full cleanup - Firestore + Storage)
          if (age > TWENTY_FOUR_HOURS) {
            console.log(
              `🗑️ Deleting 24h+ old photo: ${photoId} (${Math.floor(
                age / (60 * 60 * 1000)
              )} hours old)`
            );

            // Delete from Storage if URL exists
            if (photoData.photoUrl) {
              try {
                const photoUrl = photoData.photoUrl;

                // Extract storage path from Firebase Storage URL
                // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
                const pathMatch = photoUrl.match(/\/o\/(.+?)\?/);

                if (pathMatch && pathMatch[1]) {
                  const storagePath = decodeURIComponent(pathMatch[1]);
                  const bucket = storage.bucket();
                  const file = bucket.file(storagePath);

                  // Check if file exists before deleting
                  const [exists] = await file.exists();
                  if (exists) {
                    await file.delete();
                    console.log(`✅ Deleted from Storage: ${storagePath}`);
                    deletedFromStorage++;
                  }
                }
              } catch (storageError) {
                console.warn(
                  `⚠️ Could not delete photo from Storage for ${photoId}:`,
                  storageError
                );
              }
            }

            // Delete document from Firestore
            await doc.ref.delete();
            deletedFromFirestore++;
            console.log(`✅ Deleted from Firestore: ${photoId}`);
          }
          // For photos 4-24 hours old: just mark as deleted in Firestore (viewing window expired)
          else if (age > FOUR_HOURS && !photoData.viewed) {
            console.log(
              `⏱️ Marking expired (4h+) unviewed photo as deleted: ${photoId}`
            );

            await doc.ref.update({
              deleted: true,
              deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            deletedFromFirestore++;
          }
        } catch (error) {
          console.error(`❌ Error processing photo ${doc.id}:`, error);
          errors++;
        }
      }

      // Log summary
      console.log("✅ Photo cleanup completed:");
      console.log(
        `   - Firestore documents deleted/marked: ${deletedFromFirestore}`
      );
      console.log(`   - Storage files deleted: ${deletedFromStorage}`);
      console.log(`   - Errors: ${errors}`);
      console.log(`   - Total photos processed: ${snapshot.size}`);

      return {
        success: true,
        deletedFromFirestore,
        deletedFromStorage,
        errors,
        totalProcessed: snapshot.size,
      };
    } catch (error) {
      console.error("❌ Photo cleanup failed:", error);
      throw error;
    }
  });

/**
 * OPTIONAL: Manual cleanup function that can be called via HTTP
 * Useful for testing or manual cleanup
 *
 * Call it: POST https://<region>-<project-id>.cloudfunctions.net/manualCleanupPhotos
 */
export const manualCleanupPhotos = functions.https.onRequest(
  async (req: functions.https.Request, res: functions.Response) => {
    initializeApp();
    const db = admin.firestore();
    const storage = admin.storage();

    // Only allow POST requests
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    console.log("🧹 Starting manual photo cleanup...");

    try {
      const now = admin.firestore.Timestamp.now();
      const nowMillis = now.toMillis();

      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      const photosRef = db.collection("photoChallenge");
      const snapshot = await photosRef.get();

      let deletedFromFirestore = 0;
      let deletedFromStorage = 0;
      let errors = 0;

      for (const doc of snapshot.docs) {
        try {
          const photoData = doc.data();

          if (!photoData.timestamp || photoData.deleted) {
            continue;
          }

          const photoTimestamp = photoData.timestamp.toMillis();
          const age = nowMillis - photoTimestamp;

          if (age > TWENTY_FOUR_HOURS) {
            // Full cleanup
            if (photoData.photoUrl) {
              try {
                const photoUrl = photoData.photoUrl;
                const pathMatch = photoUrl.match(/\/o\/(.+?)\?/);

                if (pathMatch && pathMatch[1]) {
                  const storagePath = decodeURIComponent(pathMatch[1]);
                  const bucket = storage.bucket();
                  const file = bucket.file(storagePath);

                  const [exists] = await file.exists();
                  if (exists) {
                    await file.delete();
                    deletedFromStorage++;
                  }
                }
              } catch (storageError) {
                console.warn(`⚠️ Storage deletion error:`, storageError);
              }
            }

            await doc.ref.delete();
            deletedFromFirestore++;
          } else if (age > FOUR_HOURS && !photoData.viewed) {
            // Mark as deleted
            await doc.ref.update({
              deleted: true,
              deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            deletedFromFirestore++;
          }
        } catch (error) {
          console.error(`❌ Error processing photo ${doc.id}:`, error);
          errors++;
        }
      }

      res.status(200).json({
        success: true,
        deletedFromFirestore,
        deletedFromStorage,
        errors,
        totalProcessed: snapshot.size,
        message: "Cleanup completed successfully",
      });
    } catch (error) {
      console.error("❌ Manual cleanup failed:", error);
      res.status(500).json({
        success: false,
        error: "Cleanup failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
