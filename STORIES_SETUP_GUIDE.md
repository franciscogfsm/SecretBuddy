# 🎬 Stories Feature Setup Guide

## Overview

The Stories feature allows users to post daily photos that expire after 24 hours. Photos are stored in Cloudflare R2 (free egress), with metadata in Firestore.

---

## 📋 Prerequisites

1. **Cloudflare Account** (Free tier is fine)
2. **Firebase Project** with Cloud Functions enabled
3. **Expo development environment** with camera permissions

---

## 🚀 Setup Steps

### 1. Install Required Packages

Run these commands in your `/app` directory:

```bash
cd app
npm install expo-camera aws-sdk
```

Then in `/functions` directory:

```bash
cd ../functions
npm install aws-sdk
```

### 2. Configure Cloudflare R2

#### A. Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **Create Bucket**
3. Name: `secretbuddy-stories`
4. Location: **Automatic** (or choose closest to your users)
5. Click **Create Bucket**

#### B. Enable Public Access (Optional - for direct URLs)

1. In your bucket settings, go to **Settings** → **Public Access**
2. Enable **Allow Access**
3. Copy your **Public URL** (format: `https://pub-XXXXXXXX.r2.dev`)
4. **Save this URL** - you'll need it later

#### C. Create API Token

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **Create API Token**
3. Name: `SecretBuddy Stories Upload`
4. Permissions: **Object Read & Write**
5. Apply to: **Specific Buckets** → Select `secretbuddy-stories`
6. Click **Create API Token**
7. **SAVE THESE VALUES** (you'll only see them once):
   - Account ID: `abc123...`
   - Access Key ID: `def456...`
   - Secret Access Key: `ghi789...`

#### D. Set R2 Lifecycle Rules (Auto-delete after 24h)

1. In your bucket, go to **Settings** → **Object Lifecycle Rules**
2. Click **Create Rule**
3. Rule name: `Auto-delete after 24 hours`
4. Action: **Delete**
5. Condition: **Age** → `1 day`
6. Prefix filter: `stories/`
7. Save

### 3. Configure Firebase Cloud Functions

Store your R2 credentials in Firebase Functions config:

```bash
cd functions

# Set R2 credentials
firebase functions:config:set \
  r2.account_id="YOUR_ACCOUNT_ID" \
  r2.access_key_id="YOUR_ACCESS_KEY_ID" \
  r2.secret_access_key="YOUR_SECRET_ACCESS_KEY" \
  r2.bucket_name="secretbuddy-stories" \
  r2.public_url="https://pub-XXXXXXXX.r2.dev"
```

**Replace:**

- `YOUR_ACCOUNT_ID` - From step 2C
- `YOUR_ACCESS_KEY_ID` - From step 2C
- `YOUR_SECRET_ACCESS_KEY` - From step 2C
- `https://pub-XXXXXXXX.r2.dev` - From step 2B

### 4. Deploy Cloud Functions

```bash
# Deploy the stories functions
firebase deploy --only functions:generateStoryUploadUrl,functions:getStoryUrl,functions:cleanupExpiredStories
```

This deploys:

- **generateStoryUploadUrl** - Generates pre-signed upload URLs
- **getStoryUrl** - Returns public URLs for viewing stories
- **cleanupExpiredStories** - Runs daily at 01:00 UTC to cleanup

### 5. Update Cloud Function URLs in App

After deployment, Firebase will show you the function URLs. Update `storiesService.ts`:

1. Get your function URLs:

```bash
firebase functions:list
```

2. Open `app/src/services/storiesService.ts`

3. Find and replace these placeholders:

```typescript
// Line ~110
const GENERATE_UPLOAD_URL_FUNCTION =
  "https://us-central1-YOUR_PROJECT.cloudfunctions.net/generateStoryUploadUrl";

// Line ~145
const GET_STORY_URL_FUNCTION =
  "https://us-central1-YOUR_PROJECT.cloudfunctions.net/getStoryUrl";
```

Replace `YOUR_PROJECT` with your Firebase project ID.

### 6. Configure Firestore Security Rules

Add these rules to `firestore.rules`:

```javascript
// Daily Stories Collection
match /dailyStories/{storyId} {
  // Anyone can read stories (anonymity preserved)
  allow read: if request.auth != null;

  // Only authenticated users can create their own story
  allow create: if request.auth != null
    && request.resource.data.userId == request.auth.uid
    && !exists(/databases/$(database)/documents/dailyStories/$(request.auth.uid + '_' + request.time.date()));

  // Only owner can update (for revealing profile if winner)
  allow update: if request.auth != null
    && resource.data.userId == request.auth.uid;

  // Reactions subcollection
  match /reactions/{userId} {
    allow read: if request.auth != null;
    allow write: if request.auth != null && userId == request.auth.uid;
  }

  // Views subcollection (for analytics)
  match /views/{userId} {
    allow read: if request.auth != null;
    allow write: if request.auth != null && userId == request.auth.uid;
  }
}
```

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

### 7. Create Firestore Indexes

Run these commands in Firebase Console or use the Firebase CLI:

```bash
# Create composite index for querying stories
firebase firestore:indexes:create \
  --collection-group=dailyStories \
  --query-scope=COLLECTION \
  --field-path=createdAt --order=DESCENDING \
  --field-path=userId --order=ASCENDING
```

Or create manually in Firebase Console:

1. Go to **Firestore** → **Indexes**
2. Click **Create Index**
3. Collection: `dailyStories`
4. Fields:
   - `createdAt` - Descending
   - `userId` - Ascending
5. Query scope: **Collection**

### 8. Test the Setup

#### A. Test R2 Upload URL Generation

```bash
curl -X POST https://us-central1-YOUR_PROJECT.cloudfunctions.net/generateStoryUploadUrl \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user_123"}'
```

Expected response:

```json
{
  "success": true,
  "uploadUrl": "https://abc123.r2.cloudflarestorage.com/secretbuddy-stories/stories/2025-11-11/test_user_123_1234567890.jpg?...",
  "fileKey": "stories/2025-11-11/test_user_123_1234567890.jpg",
  "bucket": "secretbuddy-stories"
}
```

#### B. Test Story URL Retrieval

```bash
curl "https://us-central1-YOUR_PROJECT.cloudfunctions.net/getStoryUrl?fileKey=stories/2025-11-11/test_user_123_1234567890.jpg"
```

Expected response:

```json
{
  "success": true,
  "url": "https://pub-XXXXXXXX.r2.dev/stories/2025-11-11/test_user_123_1234567890.jpg"
}
```

---

## 📱 App Configuration

### Update app.json for Camera Permissions

Add these permissions in `app/app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow SecretBuddy to access your camera to post stories"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "We need camera access to let you post daily stories"
      }
    },
    "android": {
      "permissions": ["CAMERA"]
    }
  }
}
```

### Rebuild Native Code

After adding camera permissions:

```bash
cd app

# iOS
npx expo prebuild --platform ios
npx expo run:ios

# Android
npx expo prebuild --platform android
npx expo run:android
```

---

## 🎯 Usage Flow

### 1. User Posts Story

```typescript
// HomeScreen.tsx
const handleAddStory = async () => {
  setShowCameraModal(true);
};

const handlePhotoCapture = async (uri: string) => {
  try {
    // 1. Get upload URL
    const { uploadUrl, fileKey } = await generateR2UploadUrl(currentUserId);

    // 2. Upload to R2
    await uploadToR2(uploadUrl, uri);

    // 3. Create Firestore record
    const publicUrl = await getR2PublicUrl(fileKey);
    await createStory(currentUserId, fileKey, publicUrl);

    // 4. Update UI
    setUserHasPostedStory(true);
    setShowCameraModal(false);
  } catch (error) {
    console.error("Error posting story:", error);
  }
};
```

### 2. User Views Stories

```typescript
// HomeScreen.tsx
useEffect(() => {
  const loadStories = async () => {
    if (!userHasPostedStory) return; // Post-to-see gate

    const stories = await getTodayStories(currentUserId);
    setDemoStories(stories);
  };

  loadStories();
}, [userHasPostedStory]);
```

---

## 🔐 Security

### R2 Security

- **Pre-signed URLs** expire after 5 minutes
- **Public URLs** are read-only
- **Lifecycle rules** auto-delete after 24 hours
- **Object ACLs** prevent unauthorized access

### Firestore Security

- **Authentication required** for all operations
- **User can only post once per day**
- **Anonymity preserved** - no user info exposed in queries
- **Reactions isolated** per user in subcollection

---

## 💰 Cost Estimate

### Cloudflare R2 (Free Tier)

- Storage: 10 GB free
- Egress: **FREE** (unlimited)
- Operations: 1M writes/month, 10M reads/month

**Estimated for 10,000 active users:**

- Storage: ~2 GB/day (10k photos × 200 KB each)
- Cost: **$0.015/GB/month** = $0.03/month
- Operations: ~10k writes/day = **FREE**

### Firebase

- Cloud Functions: 125K invocations/month free
- Firestore: 50K reads/day free

**Total estimated cost:** < $1/month for 10K users

---

## 🐛 Troubleshooting

### "R2 credentials not configured"

- Run `firebase functions:config:get` to verify config
- Re-run the config commands from Step 3
- Redeploy functions: `firebase deploy --only functions`

### "Failed to upload image"

- Check R2 bucket permissions
- Verify API token has "Object Read & Write"
- Check pre-signed URL hasn't expired (5 min limit)

### "Cannot read stories"

- Verify Firestore security rules deployed
- Check composite indexes created
- Ensure user has posted their own story first

### Camera not working

- Rebuild with `npx expo prebuild`
- Check permissions in device settings
- Verify `expo-camera` installed correctly

---

## 📊 Monitoring

### Cloud Functions Logs

```bash
firebase functions:log --only generateStoryUploadUrl,getStoryUrl,cleanupExpiredStories
```

### R2 Analytics

- Go to **R2 Dashboard** → **secretbuddy-stories** → **Metrics**
- Monitor storage usage, requests, and bandwidth

### Firestore Monitoring

- **Firebase Console** → **Firestore** → **Usage**
- Track reads, writes, and storage

---

## 🎉 You're Done!

Your Stories feature is now fully configured with:

- ✅ Camera capture
- ✅ R2 storage (free egress)
- ✅ Firestore metadata
- ✅ Automatic cleanup
- ✅ Security rules
- ✅ Anonymous viewing

Users can now post and view daily stories!
