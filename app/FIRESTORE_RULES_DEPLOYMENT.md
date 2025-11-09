# 🔐 Firestore Security Rules - Deployment Guide

## ✅ What's Protected

Your new security rules protect:

1. **Users** - Read anyone (for friend search), write only own profile
2. **Friendships** - Only participants can read/write
3. **Conversations** - Only the 2 participants can access
4. **Messages** - Only participants in that conversation
5. **Photo Challenges** - Only sender and receiver
6. **Pairs** - Read only (Cloud Functions manage pairing)
7. **Pools** - Read for all, write only via Cloud Functions
8. **Reports** - Create and read own reports only
9. **Blocked Users** - Manage own block list only

## 🚀 How to Deploy

### Option 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** in the left menu
4. Click **Rules** tab at the top
5. Copy the entire content from `FIRESTORE_SECURITY_RULES.rules`
6. Paste it into the editor
7. Click **Publish**

### Option 2: Firebase CLI

```bash
# Make sure you're in the app directory
cd app

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Or deploy everything
firebase deploy
```

## ⚠️ Important Notes

### Before Deployment

- **Backup**: The old rules will be overwritten
- **Test**: If you have a test project, deploy there first
- **Verify**: All existing functionality should work exactly the same

### After Deployment

- Everything should work exactly as before
- No code changes needed
- Cloud Functions still work (they use admin SDK)

### What's Different

- Old rules expired on **November 10, 2025**
- New rules **never expire** and are production-ready
- **Much more secure** - users can only access their own data
- **No breaking changes** - all existing features still work

## 🧪 Testing After Deployment

Test these key features:

1. ✅ Login/Signup
2. ✅ Search for friends by username
3. ✅ Send friend requests
4. ✅ Chat with matched buddy
5. ✅ Send photo challenges
6. ✅ View profile
7. ✅ Report/block users

If any of these fail, check the Firebase Console logs.

## 🛟 Rollback (If Needed)

If something breaks:

1. Go to Firebase Console → Firestore → Rules
2. Click **History** at the top
3. Find the previous version
4. Click **Restore**

## 📊 Security Highlights

### What Users CAN Do:

- ✅ Read all user profiles (for friend search)
- ✅ Create/update their own profile
- ✅ Manage their own friendships
- ✅ Read/write conversations they're part of
- ✅ Send messages in their conversations
- ✅ Send/receive photo challenges
- ✅ Read pool data
- ✅ Join/leave pools
- ✅ Create reports
- ✅ Block/unblock users

### What Users CANNOT Do:

- ❌ Read other users' conversations
- ❌ Read other users' messages
- ❌ Modify other users' profiles
- ❌ Delete other users' data
- ❌ Create pairs (only Cloud Functions)
- ❌ Modify pool metadata (only Cloud Functions)
- ❌ Read other users' reports
- ❌ Access any other collections

## 🔍 Monitoring

After deployment, monitor for:

- Firebase Console → Firestore → Usage tab
- Check for permission denied errors
- Look at Cloud Functions logs for any issues

## 📝 Notes

- These rules are **simple and straightforward**
- They match your current app architecture
- Cloud Functions bypass all rules (use admin SDK)
- No overly complex validation that breaks things
- Easy to understand and maintain

## ⏰ When to Deploy

**Deploy NOW** - Your old rules expire on November 10, 2025!

After that date, ALL client requests will be denied until you update.
