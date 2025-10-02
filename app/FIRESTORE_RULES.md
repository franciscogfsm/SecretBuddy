# Firestore Security Rules

Copy these rules to Firebase Console → Firestore Database → Rules tab

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // ==================== USERS COLLECTION ====================
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId)
                    && request.resource.data.keys().hasAll(['displayName', 'email', 'ageVisible', 'points', 'streak', 'hearts', 'createdAt', 'updatedAt', 'lastActive'])
                    && request.resource.data.displayName is string
                    && request.resource.data.email is string
                    && (!('username' in request.resource.data) || request.resource.data.username is string)
                    && (!('age' in request.resource.data) || request.resource.data.age is number)
                    && (!('country' in request.resource.data) || request.resource.data.country is string)
                    && (!('bio' in request.resource.data) || request.resource.data.bio is string)
                    && (!('profilePhotoUrl' in request.resource.data) || request.resource.data.profilePhotoUrl is string);
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);
    }

    // ==================== FRIENDS COLLECTION ====================
    match /friends/{friendshipId} {
      allow read: if isAuthenticated()
                  && (resource.data.user1Id == request.auth.uid
                  || resource.data.user2Id == request.auth.uid);
      allow create, update, delete: if isAuthenticated();
    }

    // ==================== MATCHES COLLECTION ====================
    match /matches/{matchId} {
      allow read: if isAuthenticated()
                  && (resource.data.userId == request.auth.uid
                  || resource.data.matchedUserId == request.auth.uid);
      allow create: if false; // System only
      allow update: if isAuthenticated();
      allow delete: if false;
    }

    // ==================== CHATS COLLECTION ====================
    match /chats/{chatId} {
      allow read: if isAuthenticated()
                  && request.auth.uid in resource.data.participants;
      allow create, update: if isAuthenticated();
      allow delete: if false;

      // Messages subcollection
      match /messages/{messageId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated()
                      && request.resource.data.senderId == request.auth.uid;
        allow update, delete: if false;
      }
    }

    // ==================== PROMPTS COLLECTION ====================
    match /prompts/{promptId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if false; // System only
    }

    // ==================== SUBMISSIONS COLLECTION ====================
    match /submissions/{submissionId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated()
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated()
                            && resource.data.userId == request.auth.uid;
    }

    // ==================== BLOCKS COLLECTION ====================
    match /blocks/{blockId} {
      allow read: if isAuthenticated()
                  && resource.data.blockerId == request.auth.uid;
      allow create, delete: if isAuthenticated();
      allow update: if false;
    }

    // ==================== REPORTS COLLECTION ====================
    match /reports/{reportId} {
      allow read: if isAuthenticated()
                  && resource.data.reporterId == request.auth.uid;
      allow create: if isAuthenticated()
                    && request.resource.data.reporterId == request.auth.uid;
      allow update, delete: if false;
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## How to Apply These Rules

1. Go to: https://console.firebase.google.com/project/secretbuddy-5637d/firestore
2. Click **"Create database"** if you haven't already
   - Choose **Production mode**
   - Select region: **us-central** (or closest to you)
3. After creation, click the **"Rules"** tab
4. **Delete all existing rules**
5. **Copy and paste** the rules above
6. Click **"Publish"**

✅ Done! Your Firestore is now configured with proper security rules.

## Required Indexes

For username uniqueness checking to work efficiently, you need to create an index:

1. Go to: https://console.firebase.google.com/project/secretbuddy-5637d/firestore/indexes
2. Click **"Create Index"**
3. Configure:
   - **Collection ID**: `users`
   - **Field**: `username` → **Ascending**
   - **Query scope**: **Collection**
4. Click **"Create"**

This index allows fast queries when checking if a username is already taken.

## Collections Will Be Created Automatically

You don't need to manually create collections. They will be created automatically when your app adds the first document:

- ✅ `users` - Created when user signs up (via useUserProfile hook)
- ✅ `friends` - Created when user sends first friend request
- ✅ `matches` - Created by matching algorithm
- ✅ `chats` - Created when match starts chatting
- ✅ `prompts` - Created by admin/system
- ✅ `submissions` - Created when user submits photo
- ✅ `blocks` - Created when user blocks someone
- ✅ `reports` - Created when user reports someone

Just enable Firestore, set the rules, and run your app!
