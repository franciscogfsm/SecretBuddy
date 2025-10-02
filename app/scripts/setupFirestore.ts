#!/usr/bin/env node

/**
 * Firestore Setup Script
 *
 * This script will:
 * 1. Create all necessary Firestore collections
 * 2. Add sample data to each collection
 * 3. Display the security rules you need to copy to Firebase Console
 *
 * IMPORTANT: This uses the client SDK, not Admin SDK.
 * Security rules MUST be set manually in Firebase Console.
 *
 * Usage:
 * 1. Make sure Firestore is enabled in Firebase Console
 * 2. Run: npm run setup:firestore
 * 3. Copy the security rules to Firebase Console
 */

import * as dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// Load environment variables
dotenv.config();

// Firebase config from your .env (or hardcoded as fallback)
const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBi9yZLwwnVD-xmHyGtD9dZyIW253DWZgc",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "secretbuddy-5637d.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "secretbuddy-5637d",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "secretbuddy-5637d.firebasestorage.app",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "499700782265",
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    "1:499700782265:web:e4d96b8d5c6a6ba00e7768",
  measurementId:
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-RKGV4Q1NJE",
};

console.log("\n📋 Using Firebase project:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SECURITY_RULES = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // ==================== USERS COLLECTION ====================
    match /users/{userId} {
      // Anyone can read user profiles (for matching)
      allow read: if isAuthenticated();
      
      // Users can only create their own profile
      allow create: if isOwner(userId) 
                    && request.resource.data.uid == userId;
      
      // Users can only update their own profile
      // Cannot change uid, createdAt
      allow update: if isOwner(userId)
                    && request.resource.data.uid == resource.data.uid
                    && request.resource.data.createdAt == resource.data.createdAt;
      
      // Users can delete their own profile
      allow delete: if isOwner(userId);
    }
    
    // ==================== FRIENDS COLLECTION ====================
    match /friends/{friendshipId} {
      // Users can read friendships they're part of
      allow read: if isAuthenticated() 
                  && (resource.data.user1Id == request.auth.uid 
                  || resource.data.user2Id == request.auth.uid);
      
      // Users can create friendships involving themselves
      allow create: if isAuthenticated()
                    && (request.resource.data.user1Id == request.auth.uid 
                    || request.resource.data.user2Id == request.auth.uid);
      
      // Users can update friendships they're part of
      allow update: if isAuthenticated()
                    && (resource.data.user1Id == request.auth.uid 
                    || resource.data.user2Id == request.auth.uid);
      
      // Users can delete friendships they're part of
      allow delete: if isAuthenticated()
                    && (resource.data.user1Id == request.auth.uid 
                    || resource.data.user2Id == request.auth.uid);
    }
    
    // ==================== MATCHES COLLECTION ====================
    match /matches/{matchId} {
      // Users can read their own matches
      allow read: if isAuthenticated()
                  && (resource.data.userId == request.auth.uid 
                  || resource.data.matchedUserId == request.auth.uid);
      
      // System creates matches (users cannot create manually)
      allow create: if false;
      
      // Users can update matches they're part of
      allow update: if isAuthenticated()
                    && (resource.data.userId == request.auth.uid 
                    || resource.data.matchedUserId == request.auth.uid);
      
      // Users cannot delete matches
      allow delete: if false;
    }
    
    // ==================== CHATS COLLECTION ====================
    match /chats/{chatId} {
      // Users can read chats they're part of
      allow read: if isAuthenticated()
                  && request.auth.uid in resource.data.participants;
      
      // Users can create chats if they're a participant
      allow create: if isAuthenticated()
                    && request.auth.uid in request.resource.data.participants;
      
      // Users can update chats they're part of
      allow update: if isAuthenticated()
                    && request.auth.uid in resource.data.participants;
      
      // Users cannot delete chats
      allow delete: if false;
      
      // ==================== MESSAGES SUBCOLLECTION ====================
      match /messages/{messageId} {
        // Users can read messages in chats they're part of
        allow read: if isAuthenticated()
                    && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        
        // Users can create messages in chats they're part of
        allow create: if isAuthenticated()
                      && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants
                      && request.resource.data.senderId == request.auth.uid;
        
        // Messages cannot be updated or deleted
        allow update, delete: if false;
      }
    }
    
    // ==================== PROMPTS COLLECTION ====================
    match /prompts/{promptId} {
      // All authenticated users can read prompts
      allow read: if isAuthenticated();
      
      // Only system can create/update/delete prompts
      allow create, update, delete: if false;
    }
    
    // ==================== SUBMISSIONS COLLECTION ====================
    match /submissions/{submissionId} {
      // Users can read all submissions (for viewing others' photos)
      allow read: if isAuthenticated();
      
      // Users can create their own submissions
      allow create: if isAuthenticated()
                    && request.resource.data.userId == request.auth.uid;
      
      // Users can update their own submissions
      allow update: if isAuthenticated()
                    && resource.data.userId == request.auth.uid;
      
      // Users can delete their own submissions
      allow delete: if isAuthenticated()
                    && resource.data.userId == request.auth.uid;
    }
    
    // ==================== BLOCKS COLLECTION ====================
    match /blocks/{blockId} {
      // Users can read blocks they created
      allow read: if isAuthenticated()
                  && resource.data.blockerId == request.auth.uid;
      
      // Users can create blocks
      allow create: if isAuthenticated()
                    && request.resource.data.blockerId == request.auth.uid;
      
      // Users can delete their own blocks (unblock)
      allow delete: if isAuthenticated()
                    && resource.data.blockerId == request.auth.uid;
      
      // Blocks cannot be updated
      allow update: if false;
    }
    
    // ==================== REPORTS COLLECTION ====================
    match /reports/{reportId} {
      // Users can read their own reports
      allow read: if isAuthenticated()
                  && resource.data.reporterId == request.auth.uid;
      
      // Users can create reports
      allow create: if isAuthenticated()
                    && request.resource.data.reporterId == request.auth.uid;
      
      // Reports cannot be updated or deleted
      allow update, delete: if false;
    }
    
    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

async function setupFirestore() {
  console.log("\n🚀 Starting Firestore Setup...\n");

  try {
    // 1. Create sample user
    console.log("📝 Creating users collection...");
    const sampleUserId = "sample-user-" + Date.now();
    await setDoc(doc(db, "users", sampleUserId), {
      uid: sampleUserId,
      displayName: "Sample User",
      email: "sample@secretbuddy.app",
      username: "sampleuser",
      age: 25,
      bio: "Hey! I'm a sample user.",
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
    console.log("✅ Users collection created");

    // 2. Create sample friendship
    console.log("\n📝 Creating friends collection...");
    await setDoc(doc(db, "friends", "sample-friendship-" + Date.now()), {
      user1Id: sampleUserId,
      user2Id: "another-user-456",
      status: "pending",
      createdAt: serverTimestamp(),
      acceptedAt: null,
    });
    console.log("✅ Friends collection created");

    // 3. Create sample match
    console.log("\n📝 Creating matches collection...");
    const revealDate = new Date();
    revealDate.setDate(revealDate.getDate() + 7); // 7 days from now

    await setDoc(doc(db, "matches", "sample-match-" + Date.now()), {
      userId: sampleUserId,
      matchedUserId: "matched-user-789",
      status: "active",
      createdAt: serverTimestamp(),
      revealAt: Timestamp.fromDate(revealDate),
      revealed: false,
      messages: 0,
    });
    console.log("✅ Matches collection created");

    // 4. Create sample chat
    console.log("\n📝 Creating chats collection...");
    const chatId = "sample-chat-" + Date.now();
    await setDoc(doc(db, "chats", chatId), {
      matchId: "sample-match-123",
      participants: [sampleUserId, "matched-user-789"],
      lastMessage: "Hello! This is a test message.",
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    console.log("✅ Chats collection created");

    // 5. Create sample message in chat
    console.log("\n📝 Creating messages subcollection...");
    await setDoc(doc(db, "chats", chatId, "messages", "msg-" + Date.now()), {
      senderId: sampleUserId,
      text: "Hello! This is a test message.",
      timestamp: serverTimestamp(),
      read: false,
    });
    console.log("✅ Messages subcollection created");

    // 6. Create sample prompt
    console.log("\n📝 Creating prompts collection...");
    const promptExpiresAt = new Date();
    promptExpiresAt.setHours(promptExpiresAt.getHours() + 24);

    await setDoc(doc(db, "prompts", "sample-prompt-" + Date.now()), {
      text: "Share a photo of your favorite place",
      category: "places",
      active: true,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(promptExpiresAt),
    });
    console.log("✅ Prompts collection created");

    // 7. Create sample submission
    console.log("\n📝 Creating submissions collection...");
    await setDoc(doc(db, "submissions", "sample-submission-" + Date.now()), {
      userId: sampleUserId,
      promptId: "sample-prompt-123",
      imageUrl: "https://example.com/sample-image.jpg",
      submittedAt: serverTimestamp(),
      likes: 0,
    });
    console.log("✅ Submissions collection created");

    // 8. Create sample block
    console.log("\n📝 Creating blocks collection...");
    await setDoc(doc(db, "blocks", "sample-block-" + Date.now()), {
      blockerId: sampleUserId,
      blockedUserId: "blocked-user-999",
      createdAt: serverTimestamp(),
    });
    console.log("✅ Blocks collection created");

    // 9. Create sample report
    console.log("\n📝 Creating reports collection...");
    await setDoc(doc(db, "reports", "sample-report-" + Date.now()), {
      reporterId: sampleUserId,
      reportedUserId: "reported-user-888",
      reason: "inappropriate_content",
      description: "Sample report for testing",
      status: "pending",
      createdAt: serverTimestamp(),
    });
    console.log("✅ Reports collection created");

    console.log("\n\n🎉 Firestore collections created successfully!\n");
    console.log("📊 Collections created:");
    console.log("  ✅ users");
    console.log("  ✅ friends");
    console.log("  ✅ matches");
    console.log("  ✅ chats");
    console.log("  ✅ chats/{chatId}/messages (subcollection)");
    console.log("  ✅ prompts");
    console.log("  ✅ submissions");
    console.log("  ✅ blocks");
    console.log("  ✅ reports");

    console.log("\n" + "=".repeat(80));
    console.log(
      "\n⚠️  IMPORTANT: Now you need to set Security Rules manually!\n"
    );
    console.log(
      "📋 Copy the rules below and paste them in Firebase Console:\n"
    );
    console.log("   1. Go to: https://console.firebase.google.com/");
    console.log("   2. Select your project: secretbuddy-5637d");
    console.log("   3. Click 'Firestore Database' → 'Rules' tab");
    console.log("   4. Replace everything with the rules below");
    console.log("   5. Click 'Publish'\n");
    console.log("=".repeat(80));
    console.log("\n" + SECURITY_RULES + "\n");
    console.log("=".repeat(80));

    console.log("\n✨ Next steps:");
    console.log("  1. Copy the security rules above");
    console.log("  2. Paste them in Firebase Console → Firestore → Rules");
    console.log("  3. Click 'Publish'");
    console.log("  4. You can now delete the sample documents if you want");
    console.log(
      "  5. Start using your app - collections will auto-populate!\n"
    );
  } catch (error) {
    console.error("\n❌ Error setting up Firestore:", error);
    console.error("\nMake sure:");
    console.error("  1. Firestore is enabled in Firebase Console");
    console.error("  2. Your .env file has correct Firebase credentials");
    console.error("  3. You have internet connection");
    process.exit(1);
  }
}

// Run the setup
setupFirestore()
  .then(() => {
    console.log("✅ Setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
