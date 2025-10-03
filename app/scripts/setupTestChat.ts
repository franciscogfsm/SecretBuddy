/**
 * Test Chat Setup Script
 *
 * This script creates a test conversation between you and your friend
 * so you can test real-time chat functionality.
 *
 * Run with: npx ts-node scripts/setupTestChat.ts
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// Firebase config - same as your app
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Get tomorrow at midnight (extended expiration for testing)
 */
const getTomorrowMidnight = (): Date => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  return tomorrow;
};

async function setupTestChat() {
  console.log("🚀 Setting up test chat conversation...\n");

  // YOUR USER ID - Replace with your actual Firebase Auth UID
  const YOUR_USER_ID = "YOUR_USER_ID_HERE"; // TODO: Replace this

  // YOUR FRIEND'S USER ID - Replace with your friend's Firebase Auth UID
  const FRIEND_USER_ID = "FRIEND_USER_ID_HERE"; // TODO: Replace this

  if (
    YOUR_USER_ID === "YOUR_USER_ID_HERE" ||
    FRIEND_USER_ID === "FRIEND_USER_ID_HERE"
  ) {
    console.error(
      "❌ ERROR: Please edit this script and replace YOUR_USER_ID_HERE and FRIEND_USER_ID_HERE with actual user IDs"
    );
    console.log("\nTo get your user ID:");
    console.log("1. Log into the app");
    console.log("2. Check Firebase Console > Authentication");
    console.log("3. Copy your UID and your friend's UID");
    console.log(
      "4. Edit scripts/setupTestChat.ts and replace the placeholder IDs"
    );
    process.exit(1);
  }

  try {
    // Step 1: Create a test conversation
    console.log("📝 Creating test conversation...");

    const conversationData = {
      participants: [YOUR_USER_ID, FRIEND_USER_ID].sort(),
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(getTomorrowMidnight()), // Extended for testing
      isActive: true,
      matchId: `test_match_${Date.now()}`, // Fake match ID for testing
      isRevealed: true,
      lastMessage: "Hey! This is a test message 👋",
      lastMessageTimestamp: serverTimestamp(),
    };

    const conversationRef = await addDoc(
      collection(db, "conversations"),
      conversationData
    );

    console.log("✅ Conversation created:", conversationRef.id);

    // Step 2: Add some test messages
    console.log("\n📨 Adding test messages...");

    const testMessages = [
      {
        conversationId: conversationRef.id,
        senderId: YOUR_USER_ID,
        text: "Hey! This is a test message from me 👋",
        timestamp: serverTimestamp(),
        read: true,
        type: "text",
      },
      {
        conversationId: conversationRef.id,
        senderId: FRIEND_USER_ID,
        text: "Hey! I got your message! Testing real-time chat 🚀",
        timestamp: serverTimestamp(),
        read: false,
        type: "text",
      },
      {
        conversationId: conversationRef.id,
        senderId: YOUR_USER_ID,
        text: "Perfect! Now let's test if messages appear instantly",
        timestamp: serverTimestamp(),
        read: true,
        type: "text",
      },
    ];

    for (const message of testMessages) {
      await addDoc(collection(db, "messages"), message);
      console.log(`  ✓ Added message: "${message.text.substring(0, 30)}..."`);
    }

    console.log("\n✅ Test chat setup complete!");
    console.log("\n📱 To test the chat:");
    console.log("1. Open the app on your device");
    console.log("2. Navigate to Matches screen");
    console.log("3. You should see the test conversation");
    console.log("4. Open the chat and send messages");
    console.log("5. Have your friend do the same on their device");
    console.log("6. Messages should appear instantly on both devices!");
    console.log("\n📋 Conversation Details:");
    console.log(`   Conversation ID: ${conversationRef.id}`);
    console.log(`   Your User ID: ${YOUR_USER_ID}`);
    console.log(`   Friend's User ID: ${FRIEND_USER_ID}`);
    console.log(`   Expires: ${getTomorrowMidnight().toLocaleString()}`);
    console.log("\n💡 To navigate to this chat in your app, use:");
    console.log(`   navigation.navigate("Chat", {`);
    console.log(`     conversationId: "${conversationRef.id}",`);
    console.log(`     matchedUserId: "${FRIEND_USER_ID}",`);
    console.log(`     matchedUserName: "Test Friend"`);
    console.log(`   });`);
  } catch (error) {
    console.error("❌ Error setting up test chat:", error);
    throw error;
  }
}

// Run the setup
setupTestChat()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  });
