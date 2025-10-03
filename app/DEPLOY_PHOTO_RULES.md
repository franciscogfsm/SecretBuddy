# 🔐 Deploy Photo Challenge Storage Rules

## Quick Deploy Steps

### 1. **Go to Firebase Console**

Open: https://console.firebase.google.com/project/secretbuddy-5637d/storage/rules

### 2. **Copy the Updated Rules**

The rules are in `STORAGE_SECURITY_RULES.rules` file.

### 3. **Paste and Publish**

- Click on the "Rules" tab
- Replace the existing rules with the content from `STORAGE_SECURITY_RULES.rules`
- Click **"Publish"**

---

## What Changed?

Added security rules for the **Photo Challenge** feature:

```
photos/{senderId}/{fileName}
```

### Security Features:

✅ **Upload**: Only sender can upload to their own folder  
✅ **Read**: Only sender and receiver can view the photo  
✅ **Delete**: Only sender can delete their photos  
✅ **Size Limit**: Max 5MB per photo  
✅ **File Type**: Only images allowed (jpg, jpeg, png, gif, webp)

### How It Works:

- Path format: `photos/N64CUFQ3xUWYcElIRJen2pbhIJs1/u4FhcyXndsRiAjTK2VcC0dUhU643_1759503447418.jpg`
- Sender (N64CUFQ3xUWYcElIRJen2pbhIJs1) uploads to their folder
- Receiver (u4FhcyXndsRiAjTK2VcC0dUhU643) can read files that start with their UID
- No one else can access the photos

---

## Alternative: Deploy via CLI

If you have Firebase CLI installed:

```bash
cd app
firebase deploy --only storage
```

This will deploy the rules from `firebase.json` (if configured) or you can specify:

```bash
firebase deploy --only storage:rules
```

---

## Verify Rules Are Active

After publishing, test by:

1. Taking a photo in the app
2. Check Firebase Console → Storage → Files
3. You should see: `photos/yourUID/receiverUID_timestamp.jpg`

If you see the file uploaded successfully, the rules are working! ✅
