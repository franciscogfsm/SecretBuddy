# 🧪 Test Chat Setup Guide

## Quick Setup for Testing Real-Time Chat

### ✅ What's Been Updated

1. **30-minute grace period** added to expiration (so you can test at 12:04 AM!)
2. **TestChatButton component** - Creates test conversations instantly
3. **MatchesScreen** - Now loads real conversations from Firebase
4. **ChatScreen** - Already connected to real-time backend

### 🚀 How to Test Right Now

#### Step 1: Get Your Friend's User ID

1. Ask your friend to log into the app
2. Go to Firebase Console > Authentication
3. Copy their **User ID (UID)** - it looks like: `abc123xyz456...`

#### Step 2: Update MatchesScreen

Open `app/src/screens/MatchesScreen.tsx` and find this line (around line 281):

```typescript
<TestChatButton friendUserId="FRIEND_USER_ID_HERE" />
```

Replace `"FRIEND_USER_ID_HERE"` with your friend's actual User ID:

```typescript
<TestChatButton friendUserId="abc123xyz456..." />
```

#### Step 3: Create Test Chat

1. Open the app
2. Go to **Matches** tab
3. Click the **"Create Test Chat with Friend"** button
4. It will create a conversation and some test messages
5. Click "Open Chat" when the popup appears

#### Step 4: Test Real-Time Messaging

**On Your Device:**

1. Send a message in the chat
2. It should appear instantly

**On Your Friend's Device:**

1. Have them open the app and go to Matches tab
2. They should see the conversation appear
3. When they open it, they'll see your message
4. When they reply, you'll see it instantly!

### 🎯 What to Test

- ✅ Send messages back and forth - should appear instantly
- ✅ Messages sync in real-time without refresh
- ✅ Read receipts (messages show as "read" after viewing)
- ✅ Profile viewing (tap avatar to see profile)
- ✅ End conversation button (with confirmation)
- ✅ Expiration warning (shows time until midnight)
- ✅ Multiple conversations (create more test chats)

### 🔧 Grace Period for Testing

The expiration now has a **30-minute grace period**, so chats that "expired" at midnight will still work until 12:30 AM. This is perfect for testing!

To change the grace period, edit `chatService.ts`:

```typescript
// Change this value (in milliseconds)
const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes
```

### 📱 Finding Your Friend's User ID

#### Method 1: Firebase Console

1. Go to: https://console.firebase.google.com
2. Select your project
3. Go to **Authentication** in the left sidebar
4. Find your friend in the users list
5. Copy their **User UID**

#### Method 2: In the App (Add This Temporarily)

Add this to ProfileScreen to show the current user's ID:

```typescript
<Text>Your User ID: {user?.uid}</Text>
```

Then share the ID with your friend via WhatsApp, etc.

### 🐛 Troubleshooting

#### "No active chats" showing

- Make sure you clicked the "Create Test Chat" button
- Check Firebase Console > Firestore > conversations collection
- Verify your friend's user ID is correct

#### Messages not appearing in real-time

- Check internet connection
- Verify both users are logged in
- Check browser console for errors (if using web)
- Make sure Firestore is not in offline mode

#### "Conversation expired" even though it's 12:04

- The grace period should handle this
- If not, increase `GRACE_PERIOD_MS` in chatService.ts

#### Friend can't see the conversation

- Double-check you used the correct user ID
- Make sure friend refreshes the Matches screen
- Check that both users' UIDs are in the `participants` array in Firestore

### 💾 What Gets Created

When you click "Create Test Chat", it creates:

1. **1 Conversation document** in Firestore:

   ```json
   {
     "participants": ["your_uid", "friend_uid"],
     "expiresAt": "tomorrow at midnight",
     "isActive": true,
     "matchId": "test_match_...",
     "isRevealed": true
   }
   ```

2. **2 Test messages**:
   - One from you: "Hey! This is a test message 👋"
   - One from friend: "Hi! Testing real-time chat 🚀"

### 📊 Where to See the Data

**Firebase Console:**

- Firestore Database > conversations
- Firestore Database > messages

You can manually add/edit/delete documents here for testing.

### 🎨 Alternative: Use Firebase Console

If the button doesn't work, you can manually create test data:

1. Go to Firestore Database
2. Create a new document in `conversations`:

   ```
   participants: [your_uid, friend_uid]
   expiresAt: (tomorrow timestamp)
   isActive: true
   matchId: "test_123"
   isRevealed: true
   ```

3. Create documents in `messages`:
   ```
   conversationId: (the conversation ID from step 2)
   senderId: your_uid
   text: "Test message"
   timestamp: (now)
   read: false
   type: "text"
   ```

### ✨ Next Steps After Testing

Once you've confirmed real-time chat works:

1. **Remove the test button** from MatchesScreen
2. **Integrate with RevealScreen** - Add "Start Chat" button after reveal
3. **Add to match logic** - Create conversations automatically after reveal
4. **Set up push notifications** (optional)

### 📝 Important Notes

- **Test conversations expire tomorrow** (not at midnight tonight)
- **Grace period is 30 minutes** after expiration
- **Only last 2 conversations** will show in MatchesScreen
- **Real-time updates** work via Firestore listeners
- **No polling** - messages appear instantly when sent

### 🎉 Success Criteria

You'll know it's working when:

- ✅ Messages appear instantly on both devices
- ✅ No need to refresh or pull down
- ✅ Read receipts update automatically
- ✅ Profile viewing works
- ✅ End conversation button works
- ✅ Expiration warnings show correctly

---

**Ready to test!** 🚀

Just update the friend's user ID in MatchesScreen and click the test button!
