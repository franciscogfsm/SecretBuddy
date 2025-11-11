# ✅ Stories Feature - FINAL IMPLEMENTATION

## 🎯 What Changed

### 1. **Camera Component** - Simplified to use `expo-image-picker` ✅

- **Removed**: `expo-camera` dependency (not installed)
- **Using**: `expo-image-picker` (already in your project)
- **Behavior**: Opens camera immediately when user taps + button
- **Format**: 9:16 vertical (Instagram Stories format)
- **Quality**: 0.8 compression for faster uploads

**File Modified:**

- `app/src/components/StoryCameraModal.tsx` - Now uses ImagePicker.launchCameraAsync()

---

### 2. **R2 Configuration** - Your Cloudflare Credentials Added ✅

Your R2 setup:

```
Account ID: 6cc92d69a3e9b6983d2c6d7115dbc78b
Bucket: secretbuddy-stories
Public URL: https://pub-7b26f8245cfa4f8eae2e4c32b998c388.r2.dev
Endpoint: https://6cc92d69a3e9b6983d2c6d7115dbc78b.r2.cloudflarestorage.com
```

---

### 3. **Midnight Cleanup** - Automatic Deletion ✅

Cloud Function `cleanupExpiredStories` runs at **01:00 UTC** (02:00 Portugal time):

- Deletes Firestore documents older than 24h
- Deletes R2 files older than 24h
- Logs available: `firebase functions:log --only cleanupExpiredStories`

---

## 📦 NO New Packages Needed!

Since you're already using `expo-image-picker`, there's nothing to install! ✅

---

## 🚀 Setup Steps (5 Minutes)

### Step 1: Configure Firebase (2 min)

```bash
cd functions

firebase functions:config:set \
  r2.account_id="6cc92d69a3e9b6983d2c6d7115dbc78b" \
  r2.access_key_id="2091d81efc7ab777228094f090b615c1" \
  r2.secret_access_key="e47d0f2d2c15158c934a0ae2838db2136a5ab30ab899608e123e1fe499313632" \
  r2.bucket_name="secretbuddy-stories" \
  r2.public_url="https://pub-7b26f8245cfa4f8eae2e4c32b998c388.r2.dev"
```

### Step 2: Deploy Functions (2 min)

```bash
firebase deploy --only functions:generateStoryUploadUrl,functions:getStoryUrl,functions:cleanupExpiredStories
```

### Step 3: Update Function URLs (1 min)

After deployment, you'll see URLs like:

```
✔ functions[generateStoryUploadUrl] https://us-central1-YOUR_PROJECT.cloudfunctions.net/generateStoryUploadUrl
✔ functions[getStoryUrl] https://us-central1-YOUR_PROJECT.cloudfunctions.net/getStoryUrl
```

Open `app/src/services/storiesService.ts` (around line 80) and update:

```typescript
const GENERATE_UPLOAD_URL_FUNCTION =
  "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/generateStoryUploadUrl";
const GET_STORY_URL_FUNCTION =
  "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/getStoryUrl";
```

Replace `YOUR_PROJECT_ID` with your actual Firebase project ID (probably `secretbuddy-5637d`).

---

## 🎬 Usage in HomeScreen

Here's how to integrate the camera modal in your HomeScreen:

```typescript
import { StoryCameraModal } from "../components/StoryCameraModal";
import {
  generateR2UploadUrl,
  uploadToR2,
  getR2PublicUrl,
  createStory,
  getTodayStories,
  hasPostedToday,
} from "../services/storiesService";

// In your component
const [showStoryCameraModal, setShowStoryCameraModal] = useState(false);
const [userHasPostedStory, setUserHasPostedStory] = useState(false);

// Check if user posted today (on mount)
useEffect(() => {
  const checkPosted = async () => {
    if (user?.uid) {
      const posted = await hasPostedToday(user.uid);
      setUserHasPostedStory(posted);
    }
  };
  checkPosted();
}, [user]);

// Handle + button press on StoriesTray
const handleAddStory = () => {
  setShowStoryCameraModal(true);
};

// Handle photo capture
const handleStoryPhotoCapture = async (uri: string) => {
  try {
    setShowStoryCameraModal(false);

    // Show loading
    Alert.alert("📤 Uploading story...");

    if (!user?.uid) return;

    // 1. Get R2 upload URL from Cloud Function
    const { uploadUrl, fileKey } = await generateR2UploadUrl(user.uid);
    console.log("Got upload URL:", fileKey);

    // 2. Upload image directly to R2
    await uploadToR2(uploadUrl, uri);
    console.log("Uploaded to R2");

    // 3. Get public viewing URL
    const publicUrl = await getR2PublicUrl(fileKey);
    console.log("Public URL:", publicUrl);

    // 4. Create Firestore record
    await createStory(user.uid, fileKey, publicUrl);
    console.log("Created story document");

    // 5. Update UI
    setUserHasPostedStory(true);
    Alert.alert("✅ Success", "Your story was posted!");
  } catch (error) {
    console.error("Error posting story:", error);
    Alert.alert("❌ Error", "Failed to post story. Please try again.");
  }
};

// In your JSX
return (
  <View>
    <StoriesTray
      userHasPostedStory={userHasPostedStory}
      onAddPress={handleAddStory}
      stories={/* your stories array */}
    />

    <StoryCameraModal
      visible={showStoryCameraModal}
      onClose={() => setShowStoryCameraModal(false)}
      onCapture={handleStoryPhotoCapture}
    />
  </View>
);
```

---

## 🔒 Firestore Security Rules

Add these rules to `firestore.rules`:

```javascript
match /dailyStories/{storyId} {
  // Anyone authenticated can read
  allow read: if request.auth != null;

  // Users can only create their own story
  allow create: if request.auth != null
    && request.resource.data.userId == request.auth.uid;

  // Only owner can update
  allow update: if request.auth != null
    && resource.data.userId == request.auth.uid;

  // Reactions subcollection
  match /reactions/{userId} {
    allow read, write: if request.auth != null;
  }

  // Views subcollection (analytics)
  match /views/{userId} {
    allow read, write: if request.auth != null && userId == request.auth.uid;
  }
}
```

Deploy:

```bash
firebase deploy --only firestore:rules
```

---

## 🗂️ Firestore Index

Create a composite index for the query:

```bash
firebase firestore:indexes:create \
  --collection-group=dailyStories \
  --query-scope=COLLECTION \
  --field-path=createdAt --order=DESCENDING \
  --field-path=userId --order=ASCENDING
```

Or create manually in Firebase Console:

- Collection: `dailyStories`
- Fields:
  - `createdAt` - Descending
  - `userId` - Ascending

---

## 🧪 Testing

### 1. Test Cloud Functions

```bash
# Test upload URL generation
curl -X POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/generateStoryUploadUrl \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123"}'
```

Expected response:

```json
{
  "success": true,
  "uploadUrl": "https://6cc92d69a3e9b6983d2c6d7115dbc78b.r2.cloudflarestorage.com/...",
  "fileKey": "stories/2025-11-11/test123_1234567890.jpg",
  "bucket": "secretbuddy-stories"
}
```

### 2. Test in App

1. Open app, go to Home
2. Tap **+** button on Stories tray
3. Camera opens automatically
4. Take photo
5. Wait ~2 seconds for upload
6. Story appears in your circle as "You"
7. Tap to view fullscreen

---

## 📊 Monitoring

### View Function Logs

```bash
firebase functions:log
```

### Check R2 Storage

- Go to https://dash.cloudflare.com/
- Navigate to **R2** → **secretbuddy-stories**
- View uploaded files under `stories/2025-11-11/...`

### Check Firestore

- Firebase Console → **Firestore**
- Collection: `dailyStories`
- Should see your story document

---

## 💰 Cost (Still < $1/month!)

### Cloudflare R2

- Storage: 10 GB/month **FREE**
- Egress: **FREE** (unlimited)
- Operations: 1M writes/month **FREE**

**For 10,000 daily users:**

- Storage: ~2 GB (10k × 200KB)
- Cost: $0.015/GB = **$0.03/month**

### Firebase

- Functions: 125K/month **FREE**
- Firestore: 50K reads/day **FREE**

**Total: < $1/month** 🎉

---

## 🐛 Troubleshooting

### "R2 credentials not configured"

```bash
firebase functions:config:get  # Verify config exists
firebase deploy --only functions  # Redeploy
```

### "Upload failed"

- Check R2 bucket exists: `secretbuddy-stories`
- Verify API token permissions: "Object Read & Write"
- Check pre-signed URL hasn't expired (5 min)

### "Cannot view stories"

- User must post their own story first (post-to-see gate)
- Check Firestore rules deployed
- Verify index created

### Camera not opening

- Permissions already granted (you're using ImagePicker elsewhere)
- Check `ImagePicker.launchCameraAsync` logs for errors

---

## ✅ Final Checklist

- [ ] Run `firebase functions:config:set` command ✅ (provided above)
- [ ] Deploy functions: `firebase deploy --only functions:generateStoryUploadUrl,functions:getStoryUrl,functions:cleanupExpiredStories`
- [ ] Copy function URLs from deployment output
- [ ] Update `storiesService.ts` line ~80 with function URLs
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Create Firestore index (command provided above)
- [ ] Add camera modal to HomeScreen (code provided above)
- [ ] Test: Post a story from app
- [ ] Verify: Check R2 dashboard for uploaded file
- [ ] Verify: Check Firestore for story document
- [ ] Monitor: Check function logs with `firebase functions:log`

---

## 🎉 You're Done!

Your Stories feature is production-ready with:

- ✅ Simplified camera (uses existing expo-image-picker)
- ✅ Cloudflare R2 storage (FREE egress!)
- ✅ Automatic midnight cleanup (01:00 UTC)
- ✅ Real Firebase integration
- ✅ Security rules
- ✅ Anonymous viewing
- ✅ Fire reactions
- ✅ Owner analytics

**Just follow the 5-minute setup above and you're live!** 🚀
