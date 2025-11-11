# 🔐 R2 Configuration - COMPLETE THIS SETUP

## ✅ Your R2 Credentials

Based on your Cloudflare setup, here are your credentials:

```
Account ID: 6cc92d69a3e9b6983d2c6d7115dbc78b
Access Key ID: 2091d81efc7ab777228094f090b615c1
Secret Access Key: e47d0f2d2c15158c934a0ae2838db2136a5ab30ab899608e123e1fe499313632
API Token: pgkeJleIt0Gem3_zf108lQu_KMzCMbcCwC5iJDMG
Bucket Name: secretbuddy-stories
Public URL: https://pub-7b26f8245cfa4f8eae2e4c32b998c388.r2.dev
Endpoint: https://6cc92d69a3e9b6983d2c6d7115dbc78b.r2.cloudflarestorage.com
```

---

## 🚀 Setup Commands

### 1. Configure Firebase Functions

Run this command in your terminal (in the `/functions` directory):

```bash
cd functions

firebase functions:config:set \
  r2.account_id="6cc92d69a3e9b6983d2c6d7115dbc78b" \
  r2.access_key_id="2091d81efc7ab777228094f090b615c1" \
  r2.secret_access_key="e47d0f2d2c15158c934a0ae2838db2136a5ab30ab899608e123e1fe499313632" \
  r2.bucket_name="secretbuddy-stories" \
  r2.public_url="https://pub-7b26f8245cfa4f8eae2e4c32b998c388.r2.dev"
```

### 2. Verify Configuration

```bash
firebase functions:config:get
```

You should see:

```json
{
  "r2": {
    "account_id": "6cc92d69a3e9b6983d2c6d7115dbc78b",
    "access_key_id": "2091d81efc7ab777228094f090b615c1",
    "secret_access_key": "e47d0f2d2c15158c934a0ae2838db2136a5ab30ab899608e123e1fe499313632",
    "bucket_name": "secretbuddy-stories",
    "public_url": "https://pub-7b26f8245cfa4f8eae2e4c32b998c388.r2.dev"
  }
}
```

### 3. Deploy Cloud Functions

```bash
firebase deploy --only functions:generateStoryUploadUrl,functions:getStoryUrl,functions:cleanupExpiredStories
```

### 4. Get Function URLs

After deployment, copy the URLs shown and update `app/src/services/storiesService.ts`:

Example:

```
✔ functions[generateStoryUploadUrl] https://us-central1-secretbuddy-5637d.cloudfunctions.net/generateStoryUploadUrl
✔ functions[getStoryUrl] https://us-central1-secretbuddy-5637d.cloudfunctions.net/getStoryUrl
```

---

## 🔒 Security Notes

1. **Never commit this file to git** - It contains sensitive credentials
2. The credentials are stored securely in Firebase Functions config
3. R2 bucket should have public read access enabled for viewing
4. Lifecycle rules ensure automatic deletion after 24 hours

---

## ✅ Checklist

- [ ] Run `firebase functions:config:set` command
- [ ] Verify with `firebase functions:config:get`
- [ ] Deploy functions with `firebase deploy`
- [ ] Copy function URLs
- [ ] Update `storiesService.ts` with function URLs
- [ ] Test upload: Open app → Post story
- [ ] Verify R2 dashboard shows uploaded file
- [ ] Check that midnight cleanup function is scheduled

---

## 🧪 Testing

### Test Upload URL Generation

```bash
curl -X POST https://us-central1-YOUR_PROJECT.cloudfunctions.net/generateStoryUploadUrl \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123"}'
```

Expected response:

```json
{
  "success": true,
  "uploadUrl": "https://6cc92d69a3e9b6983d2c6d7115dbc78b.r2.cloudflarestorage.com/secretbuddy-stories/stories/2025-11-11/test123_1234567890.jpg?...",
  "fileKey": "stories/2025-11-11/test123_1234567890.jpg",
  "bucket": "secretbuddy-stories"
}
```

### Test Public URL

```bash
curl "https://us-central1-YOUR_PROJECT.cloudfunctions.net/getStoryUrl?fileKey=stories/2025-11-11/test123_1234567890.jpg"
```

Expected response:

```json
{
  "success": true,
  "url": "https://pub-7b26f8245cfa4f8eae2e4c32b998c388.r2.dev/stories/2025-11-11/test123_1234567890.jpg"
}
```

---

## 🕐 Midnight Cleanup

The `cleanupExpiredStories` function runs automatically at **01:00 UTC** every day.

It will:

1. Delete story documents from Firestore (older than 24h)
2. Delete image files from R2 bucket
3. You can view logs with: `firebase functions:log --only cleanupExpiredStories`

---

## 💡 Troubleshooting

### "R2 credentials not configured"

- Run the config:set command again
- Redeploy: `firebase deploy --only functions`

### "Access Denied" when uploading

- Check R2 API token has "Object Read & Write" permissions
- Verify bucket name matches exactly

### Images not visible

- Ensure R2 public access is enabled
- Check public URL is correct
- Files are at: `https://pub-7b26f8245cfa4f8eae2e4c32b998c388.r2.dev/stories/...`

---

## 🎉 Done!

Once you complete the checklist, your Stories feature will be fully operational with Cloudflare R2 storage!
