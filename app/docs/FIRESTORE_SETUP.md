# Firestore Setup Instructions

## Automatic Setup (Recommended)

Run this command to automatically create all Firestore collections and get the security rules:

```bash
npm run setup:firestore
```

This will:

1. ✅ Create all 9 collections with sample data
2. ✅ Display security rules to copy to Firebase Console

## Manual Steps After Running Script

1. **Copy the Security Rules** displayed in the terminal
2. Go to [Firebase Console](https://console.firebase.google.com/)
3. Select project: **secretbuddy-5637d**
4. Click **Firestore Database** → **Rules** tab
5. **Replace all existing rules** with the ones from the terminal
6. Click **"Publish"**

## Collections That Will Be Created

- ✅ `users` - User profiles
- ✅ `friends` - Friend relationships
- ✅ `matches` - Anonymous matches
- ✅ `chats` - Chat conversations
- ✅ `chats/{chatId}/messages` - Chat messages (subcollection)
- ✅ `prompts` - Daily photo prompts
- ✅ `submissions` - User photo submissions
- ✅ `blocks` - Blocked users
- ✅ `reports` - User reports

## If Script Fails

### Error: "ts-node not found"

```bash
npm install -D ts-node
npm run setup:firestore
```

### Error: "Firestore not enabled"

1. Go to Firebase Console
2. Click **Firestore Database**
3. Click **"Create database"**
4. Choose **Production mode**
5. Select location (e.g., `us-central`)
6. Click **Enable**
7. Run script again: `npm run setup:firestore`

### Error: "Permission denied"

The script needs write access. Make sure:

1. Firestore is enabled in Firebase Console
2. Temporary rules allow writes (we'll fix this with proper rules)

Quick fix - Set temporary rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Then run the script and replace with proper rules afterward.

## Alternative: Manual Creation

If you prefer to create collections manually:

1. Go to Firebase Console → Firestore Database
2. Click **"Start collection"**
3. Enter collection ID (e.g., `users`)
4. Add a sample document following the structure in the script
5. Repeat for each collection
6. Copy security rules from `setupFirestore.ts` to Firebase Console

## Verifying Setup

After running the script:

1. Go to Firebase Console → Firestore Database
2. You should see all 9 collections listed
3. Each collection should have at least 1 sample document
4. Security rules should be published (green checkmark)

## Cleaning Up Sample Data

Once you've verified everything works:

1. Go to Firebase Console → Firestore Database
2. Find documents starting with "sample-"
3. Delete them (they were just for testing)
4. Real data will be created when users sign up and use the app

## Next Steps

After setup is complete:

1. ✅ Collections are ready
2. ✅ Security rules are active
3. ✅ Run your app: `npm run start`
4. ✅ Sign up or login
5. ✅ Your real user profile will be created automatically in the `users` collection!
