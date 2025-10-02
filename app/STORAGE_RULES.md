# Firebase Storage Security Rules

Copy these rules to Firebase Console → Storage → Rules tab

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }

    function isValidSize() {
      // Max 5MB for images
      return request.resource.size < 5 * 1024 * 1024;
    }

    // ==================== PROFILE PHOTOS ====================
    match /profile-photos/{userId}.jpg {
      // Anyone can read profile photos (for viewing profiles)
      allow read: if isAuthenticated();

      // Only owner can upload/update their photo
      allow write: if isAuthenticated()
                   && isOwner(userId)
                   && isImage()
                   && isValidSize();

      // Only owner can delete their photo
      allow delete: if isAuthenticated() && isOwner(userId);
    }

    // ==================== SUBMISSION PHOTOS ====================
    match /submissions/{userId}/{submissionId}.jpg {
      // Only authenticated users can read submissions
      allow read: if isAuthenticated();

      // Only owner can upload their submission
      allow write: if isAuthenticated()
                   && isOwner(userId)
                   && isImage()
                   && isValidSize();

      // Only owner can delete their submission
      allow delete: if isAuthenticated() && isOwner(userId);
    }

    // ==================== CHAT PHOTOS ====================
    match /chats/{chatId}/{messageId}.jpg {
      // Only authenticated users can read chat photos
      allow read: if isAuthenticated();

      // Only authenticated users can upload chat photos
      allow write: if isAuthenticated()
                   && isImage()
                   && isValidSize();

      // No one can delete chat photos (keep history)
      allow delete: if false;
    }

    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## How to Apply These Rules

1. Go to: https://console.firebase.google.com/project/YOUR_PROJECT_ID/storage
2. Click **"Get Started"** if Storage is not enabled yet
   - Choose **Production mode**
   - Select the same region as Firestore
3. After creation, click the **"Rules"** tab
4. **Delete all existing rules**
5. **Copy and paste** the rules above
6. Click **"Publish"**

✅ Done! Your Firebase Storage is now configured with proper security rules.

## Storage Folders

These folders will be created automatically when files are uploaded:

- ✅ `profile-photos/` - User profile pictures
- ✅ `submissions/` - Daily prompt photo submissions
- ✅ `chats/` - Photos shared in chats

## Size Limits

- Maximum file size: **5 MB**
- Only **image files** are allowed
- Files are automatically compressed by the app before upload

## Important Notes

1. **Enable Firebase Storage** in your Firebase Console first
2. Make sure your Firebase project is on the **Blaze (Pay-as-you-go)** plan if you need more than 1GB storage (free tier includes 5GB downloads/day and 1GB storage)
3. Profile photos are named with the user's UID: `{userId}.jpg`
4. Old photos are automatically replaced when a user uploads a new photo
