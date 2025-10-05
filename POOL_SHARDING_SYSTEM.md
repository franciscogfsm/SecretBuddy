# 🎯 Pool Sharding System - Complete Guide

## Overview

The SecretBuddy pool system uses **sharding** to scale to 100k+ concurrent users per pool.

## Structure

### Firestore Structure

```
/pools/{poolId}
  ├── date: "2025-10-05"
  ├── hour: 10
  ├── status: "open"
  ├── userCount: 0
  ├── currentShard: 0
  ├── shardUserCounts: { 0: 0 }
  └── /shards/{shardId}         ← SUBCOLLECTION (created when users join)
      └── /poolUsers/{userId}   ← User documents (max 10k per shard)
          ├── userId: "abc123"
          ├── poolId: "2025-10-05-10h"
          ├── gameMode: "world"
          ├── country: "Portugal"
          └── joinedAt: timestamp
```

### Shard Naming

- Shards are named: `shard_0`, `shard_1`, `shard_2`, etc.
- Each shard holds max **10,000 users**
- New shards are created automatically when the current shard is full

## How It Works

### 1. Pool Creation (Midnight UTC)

The `createDailyPools` function creates 8 hourly pools with **initial metadata**:

```typescript
{
  currentShard: 0,
  shardUserCounts: { 0: 0 },
  userCount: 0,
  // ... other pool data
}
```

**⚠️ At this point, NO subcollections exist yet!**

### 2. Users Join Pool (Dynamic)

When users join via the app's `joinPool` function:

```typescript
// 1. Find available shard (or create new one)
let targetShard = currentShard;
if (shardUserCounts[currentShard] >= 10000) {
  targetShard = currentShard + 1;
}

// 2. Add user to shard subcollection
/pools/{poolId}/shards/shard_{targetShard}/poolUsers/{userId}

// 3. Update pool metadata
{
  shardUserCounts: { [targetShard]: +1 },
  userCount: +1,
  currentShard: targetShard (if new)
}
```

**✅ The subcollections are created NOW (dynamically)!**

### 3. Pool Closes & Pairs Users (Hourly)

The `closeHourlyPool` function:

1. Finds all shards in the pool
2. Processes users in each shard independently
3. Creates pairs based on matching logic (friends > country > random)
4. Rolls over unpaired users to next pool

## Testing

### Option 1: Wait for Real Users

- Deploy the app
- Users join pools naturally
- Shards are created automatically

### Option 2: Manual Testing with All Users

Use the `manualCreatePairs` endpoint to simulate users:

```bash
POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs
Content-Type: application/json

{
  "poolId": "2025-10-05-10h",
  "allUsers": true
}
```

This will:

1. Get ALL users from Firestore
2. Add them to shards (creating subcollections)
3. Create pairs

### Option 3: Test from App

1. Have 2+ test users sign in
2. Both join the same pool
3. Check Firestore:

```
/pools/2025-10-05-10h/shards/shard_0/poolUsers/
  ├── user1_id
  └── user2_id
```

## Key Points

### ✅ What's Fixed

1. **Pool creation** now includes sharding metadata (`currentShard`, `shardUserCounts`)
2. **`joinPool`** now:
   - Uses correct shard naming (`shard_0` not `0`)
   - Increments `shardUserCounts` and `userCount`
   - Creates new shards when needed
3. **`leavePool`** now:
   - Uses correct shard naming
   - Decrements counts properly

### ⚠️ Important Notes

1. **Subcollections are NOT created at pool creation time** - this is CORRECT!
2. They are created **dynamically when users join** - saves costs!
3. Empty pools will have NO subcollections - this is EXPECTED!
4. The metadata (`currentShard`, `shardUserCounts`) is always present

### 🎯 Expected Behavior

After deploying, you should see:

**Before any users join:**

```
/pools/2025-10-05-10h
  ├── currentShard: 0
  ├── shardUserCounts: { 0: 0 }
  └── (NO shards subcollection yet)
```

**After 2 users join:**

```
/pools/2025-10-05-10h
  ├── currentShard: 0
  ├── shardUserCounts: { 0: 2 }
  ├── userCount: 2
  └── /shards/shard_0/poolUsers/
      ├── user1_id
      └── user2_id
```

**After 10,001 users join:**

```
/pools/2025-10-05-10h
  ├── currentShard: 1
  ├── shardUserCounts: { 0: 10000, 1: 1 }
  ├── userCount: 10001
  ├── /shards/shard_0/poolUsers/ (10,000 users)
  └── /shards/shard_1/poolUsers/ (1 user)
```

## Deployment

Redeploy both functions and app:

```bash
# Functions
cd functions
npm run deploy

# App
cd ../app
# Test on device/emulator
```

## Monitoring

Check Firebase Console:

1. **Firestore > pools collection** - See pool metadata
2. **Firestore > pools/{poolId}/shards** - See shard subcollections (after users join)
3. **Functions logs** - See user join/leave events

---

✅ **System is now fully configured and ready for production!**
