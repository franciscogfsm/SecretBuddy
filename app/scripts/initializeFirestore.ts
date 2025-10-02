/**
 * Script to initialize Firestore collections with sample data
 * Run this ONCE to set up your Firestore database structure
 *
 * Usage:
 * 1. Make sure you're logged in with a test account
 * 2. Run: npx ts-node scripts/initializeFirestore.ts
 */

import { db } from "../src/config/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

const initializeCollections = async () => {
  console.log("🚀 Initializing Firestore collections...\n");

  // 1. Create a sample user document
  console.log("📝 Creating users collection...");

  const sampleUserId = "sample-user-123"; // Replace with real UID when testing
  const userRef = doc(db, "users", sampleUserId);

  await setDoc(userRef, {
    uid: sampleUserId,
    displayName: "Sample User",
    email: "sample@secretbuddy.app",
    username: "sampleuser",
    age: 25,
    bio: "Hey! I'm a sample user for testing.",
    country: "Portugal",
    ageVisible: true,
    profilePhotoUrl: "",
    points: 0,
    streak: 0,
    hearts: 5,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActive: serverTimestamp(),
  });

  console.log("✅ Users collection created with sample document");

  // 2. Create other collections (for future use)

  // Friends collection structure
  console.log("\n📝 Creating friends collection structure...");
  const friendRef = doc(db, "friends", "sample-friendship-123");
  await setDoc(friendRef, {
    user1Id: sampleUserId,
    user2Id: "another-user-456",
    status: "pending", // pending, accepted, blocked
    createdAt: serverTimestamp(),
    acceptedAt: null,
  });
  console.log("✅ Friends collection created");

  // Matches collection structure
  console.log("\n📝 Creating matches collection structure...");
  const matchRef = doc(db, "matches", "sample-match-123");
  await setDoc(matchRef, {
    userId: sampleUserId,
    matchedUserId: "matched-user-789",
    status: "active", // active, revealed, expired
    createdAt: serverTimestamp(),
    revealAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    revealed: false,
    messages: 0,
  });
  console.log("✅ Matches collection created");

  // Chats collection structure
  console.log("\n📝 Creating chats collection structure...");
  const chatRef = doc(db, "chats", "sample-chat-123");
  await setDoc(chatRef, {
    matchId: "sample-match-123",
    participants: [sampleUserId, "matched-user-789"],
    lastMessage: "Hello! This is a test message.",
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  console.log("✅ Chats collection created");

  // Prompts collection structure
  console.log("\n📝 Creating prompts collection structure...");
  const promptRef = doc(db, "prompts", "sample-prompt-123");
  await setDoc(promptRef, {
    text: "Share a photo of your favorite place",
    category: "places",
    active: true,
    createdAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  });
  console.log("✅ Prompts collection created");

  // Submissions collection structure
  console.log("\n📝 Creating submissions collection structure...");
  const submissionRef = doc(db, "submissions", "sample-submission-123");
  await setDoc(submissionRef, {
    userId: sampleUserId,
    promptId: "sample-prompt-123",
    imageUrl: "https://example.com/sample-image.jpg",
    submittedAt: serverTimestamp(),
    likes: 0,
  });
  console.log("✅ Submissions collection created");

  console.log("\n🎉 Firestore initialization complete!");
  console.log("\n📊 Collections created:");
  console.log("  - users");
  console.log("  - friends");
  console.log("  - matches");
  console.log("  - chats");
  console.log("  - prompts");
  console.log("  - submissions");

  console.log("\n⚠️  Don't forget to:");
  console.log("  1. Update Firestore Security Rules");
  console.log("  2. Delete sample documents after testing");
  console.log("  3. Replace sample-user-123 with real user IDs");
};

// Run the initialization
initializeCollections()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error initializing Firestore:", error);
    process.exit(1);
  });
