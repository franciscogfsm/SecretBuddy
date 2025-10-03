# 🔐 Deploy Updated Firebase Storage Rules

## What Changed?

Updated Storage rules to allow **both sender AND receiver** to delete photos after viewing.

## Why This Change?

Previously, only the sender could delete photos from Storage. Now the receiver can also delete photos after viewing them, which is necessary for the "Got it!" button functionality.

## Updated Rule

```javascript
// Delete: Sender OR receiver (receiver's UID must be at start of fileName)
allow delete: if isSignedIn() && (
  isOwner(senderId) ||
  fileName.matches('^' + request.auth.uid + '_.*\\.(jpg|jpeg|png|gif|webp)$')
);
```

## How to Deploy

### Option 1: Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **secretbuddy-5637d**
3. Click **Storage** in the left menu
4. Click the **Rules** tab at the top
5. Copy the entire content from `STORAGE_SECURITY_RULES.rules`
6. Paste it into the rules editor
7. Click **Publish** button

### Option 2: Firebase CLI

```bash
# Make sure you're in the app directory
cd app

# Deploy only Storage rules
firebase deploy --only storage
```

## Verification

After deploying, test by:

1. Send a photo challenge from one user to another
2. Receiver opens the photo modal
3. Receiver clicks "Got it!" button
4. Photo should delete successfully (no 403 Forbidden error)

## What the Rule Does

- **Sender** can always delete their sent photos
- **Receiver** can delete photos where their UID is at the start of the filename
- Example: User `u4FhcyXndsRiAjTK2VcC0dUhU643` can delete file `u4FhcyXndsRiAjTK2VcC0dUhU643_1759506408038.jpg`

## 🚨 Important

**You MUST deploy these rules** for the "Got it!" button to work properly. Without this, receivers will get a 403 Forbidden error when trying to delete viewed photos.
