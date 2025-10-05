# 🧪 Testing the Pairing System

## Understanding the Problem

The error you're seeing happens because **the sharded structure only exists when users actually join a pool**. There are two ways to test:

## Option 1: Real User Testing (RECOMMENDED ✅)

This tests the actual user flow:

### Step 1: Have Users Join the Pool

1. Open the app on 2+ devices/emulators
2. Sign in with different users
3. **Click "Join Pool" button** on the Home screen
4. Select priority (friends/country/world)
5. Wait for confirmation "Joined Pool! 🎉"

### Step 2: Verify in Firestore

Check that the sharded structure was created:

```
/pools/2025-10-05-10h/shards/shard_0/poolUsers/
  ├── user1_id
  └── user2_id
```

### Step 3: Manually Trigger Pairing

Call the pairing endpoint:

```bash
POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs
Content-Type: application/json

{
  "poolId": "2025-10-05-10h"
}
```

**Note:** DO NOT use `allUsers: true` in this case!

### Step 4: Check Results

```bash
GET https://us-central1-secretbuddy-5637d.cloudfunctions.net/listPairs
```

---

## Option 2: Automated Testing with allUsers=true

This simulates users joining by adding ALL users from the database:

### Step 1: Ensure Users Exist in Database

Check you have users:

```bash
GET https://us-central1-secretbuddy-5637d.cloudfunctions.net/listUsers
```

You should see:

```json
{
  "success": true,
  "count": 2,
  "users": [
    { "uid": "abc123", "displayName": "User1", "country": "Portugal" },
    { "uid": "def456", "displayName": "User2", "country": "Portugal" }
  ]
}
```

### Step 2: Call with allUsers=true

```bash
POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs
Content-Type: application/json

{
  "poolId": "2025-10-05-10h",
  "allUsers": true
}
```

**What this does:**

1. Gets ALL users from `/users` collection
2. Adds them to pool shards (creates subcollections)
3. Waits 3 seconds for Firestore consistency
4. Reads from shards and creates pairs

### Step 3: If You Get Consistency Error

If you see:

```
"No users in pool... this is a Firestore consistency issue - try again in a few seconds"
```

The error response now includes debug info:

```json
{
  "error": "...",
  "debug": {
    "poolMetadata": {
      "currentShard": 0,
      "shardUserCounts": { "0": 2 },
      "userCount": 2
    }
  }
}
```

**Solution:** Wait 5-10 seconds and call the endpoint again (without `allUsers: true` this time):

```bash
POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs
Content-Type: application/json

{
  "poolId": "2025-10-05-10h"
}
```

---

## Common Issues & Solutions

### ❌ "No users in pool"

**Cause:** No users have joined the pool yet.

**Solution:**

- Option 1: Have users click "Join Pool" in the app
- Option 2: Use `allUsers: true` to simulate users joining

### ❌ "Firestore consistency issue"

**Cause:** Firestore's eventual consistency means subcollections may not be immediately visible.

**Solution:**

1. Wait 5-10 seconds
2. Call `manualCreatePairs` again WITHOUT `allUsers: true`

### ❌ "Pool not found"

**Cause:** The pool doesn't exist for today.

**Solution:** Create pools first:

```bash
POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePools
```

### ❌ App users can't join pool

**Cause:** May need to rebuild the app with updated `poolService.ts`.

**Solution:**

```bash
cd app
# Stop metro bundler (Ctrl+C)
npm start -- --reset-cache
```

---

## Verification Steps

### 1. Check Pool Structure in Firestore Console

```
/pools/2025-10-05-10h
  ├── currentShard: 0
  ├── shardUserCounts: { "0": 2 }
  ├── userCount: 2
  └── /shards/shard_0/poolUsers/
      ├── user1_id { userId: "user1_id", country: "Portugal", priority: "world" }
      └── user2_id { userId: "user2_id", country: "Portugal", priority: "world" }
```

### 2. Check Pairs Collection

```
/pairs
  └── 2025-10-05-10h-user1_id-user2_id
      ├── userA: "user1_id"
      ├── userB: "user2_id"
      ├── status: "active"
      └── poolId: "2025-10-05-10h"
```

### 3. Check in App

- Open app
- Home screen should show "Already Paired! 🎉"
- Wait for reveal time (check pool's `revealAt` field)
- Navigate to Reveal screen

---

## Quick Test Script

For quick testing from the app's test button:

### Update TestChatButton.tsx (if exists)

Replace the dev pairing logic to use the real flow:

```typescript
// Instead of allUsers=true, guide users to join first
Alert.alert(
  "Test Pairing",
  "Please ensure 2+ users have joined the pool, then try pairing",
  [
    {
      text: "Join Pool (User 1)",
      onPress: async () => {
        await poolService.joinPool(userId, poolId, "world");
      },
    },
    {
      text: "Pair Users",
      onPress: async () => {
        // Call without allUsers
        const response = await fetch(pairingUrl, {
          method: "POST",
          body: JSON.stringify({ poolId }),
        });
      },
    },
  ]
);
```

---

## What's Fixed

1. ✅ **Increased consistency delay** from 1s to 3s
2. ✅ **Added debug logging** to see pool metadata
3. ✅ **Include country data** when adding users via `allUsers=true`
4. ✅ **App's `joinPool`** now correctly increments counters
5. ✅ **Shard naming** consistent everywhere (`shard_0` not `0`)

---

## Recommended Testing Flow

For the most realistic test:

1. **Create today's pools:**

   ```bash
   POST /manualCreatePools
   ```

2. **Have 2 users join via app:**

   - User 1: Open app → Join Pool → Select priority
   - User 2: Open app → Join Pool → Select priority

3. **Verify in Firestore:**

   - Check `/pools/{poolId}/shards/shard_0/poolUsers/`
   - Should see 2 user documents

4. **Trigger pairing:**

   ```bash
   POST /manualCreatePairs
   { "poolId": "2025-10-05-10h" }
   ```

5. **Check results:**
   - Firestore: `/pairs` collection
   - App: Home screen shows "Already Paired! 🎉"

✅ **This flow exactly mimics production behavior!**
