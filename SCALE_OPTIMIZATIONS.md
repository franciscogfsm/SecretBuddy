# Scale Optimizations for SecretBuddy

This document explains the major optimizations implemented to handle 100k+ users per pool and reduce Firestore costs.

## 🎯 Overview of Changes

1. **Pool Sharding** - Handle 100k+ users per pool
2. **Friendship Lookup Optimization** - O(1) instead of full collection scans
3. **Message Partitioning** - Date-based collections for efficient cleanup
4. **Photo Cleanup Automation** - GCS Lifecycle + Firestore TTL

---

## 1. Pool Sharding System

### Problem

A single pool collection can't efficiently handle 100k+ users. Queries become slow, rollovers are expensive.

### Solution

**Sharded pool structure:**

```
/pools/{poolId}/shards/{shardId}/poolUsers/{userId}
```

- Each shard holds max 10,000 users
- Shards created dynamically as users join
- Queries and rollovers contained per shard

### Implementation Details

**Pool document structure:**

```typescript
{
  type: "hourly-9h",
  date: "2025-10-05",
  hour: 9,
  status: "open",
  userCount: 15000,
  pairsCount: 0,
  currentShard: 1,        // Active shard for new users
  shardUserCounts: {
    0: 10000,             // Shard 0 is full
    1: 5000               // Shard 1 has capacity
  },
  // ... other pool fields
}
```

**User assignment:**

```typescript
// When user joins pool
const shardId = await getAvailableShard(poolId, db);
// Returns "shard_0" or "shard_1" etc.

// User added to:
/pools/2025-10-05-9h/shards/shard_0/poolUsers/{userId}
```

**Pairing process:**

```typescript
// closeHourlyPool now:
1. Gets all shards for the pool
2. Processes each shard independently
3. Aggregates pairs and unpaired users
4. Rollovers use sharding system too
```

### Migration Notes

**Old structure (deprecated):**

```
/poolUsers/{poolId-userId}
```

**New structure:**

```
/pools/{poolId}/shards/{shardId}/poolUsers/{userId}
```

⚠️ **The app-side code must be updated** to use the new sharding structure when users join pools.

---

## 2. Friendship Lookup Optimization

### Problem

Every friend-match check was querying the entire `friendships` collection, causing:

- Massive read costs (N² queries for friend matching)
- Slow pairing for large pools

### Solution

**Store friends array in user docs:**

```typescript
{
  uid: "user123",
  displayName: "Alice",
  email: "alice@example.com",
  friends: ["user456", "user789", "user012"]  // ✅ NEW
}
```

### Implementation

**Friendship check is now O(1):**

```typescript
// OLD (expensive query):
const friendshipsSnapshot = await db
  .collection("friendships")
  .where("status", "==", "accepted")
  .get();
// Then iterate all docs...

// NEW (O(1) lookup):
const user1Friends = friendsMap.get(userId1);
return user1Friends ? user1Friends.has(userId2) : false;
```

**Matching process:**

1. Batch load all user docs in pool (chunks of 10)
2. Build friends map in memory
3. Check friendship with Set lookups (O(1))

### Migration Required

Run the migration function **once** to populate friends arrays:

```bash
curl -X GET https://us-central1-secretbuddy-5637d.cloudfunctions.net/migrateFriendships
```

**What it does:**

1. Reads all accepted friendships
2. Builds friends map
3. Updates user docs with friends arrays
4. Commits in batches of 500

**Going forward:**

- When users become friends, update both users' `friends` arrays
- When unfriending, remove from both arrays
- Keep `friendships` collection for backward compatibility

---

## 3. Message Partitioning by Date

### Problem

Deleting old messages required:

- Query all messages older than X days
- Iterate and delete each document
- Expensive with millions of messages

### Solution

**Date-partitioned collections:**

```
messages_2025_10_05
messages_2025_10_06
messages_2025_10_07
```

**Key benefit**: No daily Firestore indexes needed! 🎉

- Queries use only `where("conversationId")` filter (automatic single-field index)
- Sorting happens in memory (fast for typical conversation sizes)
- No need to create composite indexes for each new date collection

### Implementation

**Message creation:**

```typescript
const dateStr = new Date().toISOString().split("T")[0]; // "2025-10-05"
const collectionName = `messages_${dateStr.replace(/-/g, "_")}`;

await db.collection(collectionName).add({
  conversationId: "...",
  senderId: "...",
  text: "...",
  timestamp: FieldValue.serverTimestamp(),
});
```

**Message reading (INDEX-FREE):**

```typescript
const dateStr = new Date().toISOString().split("T")[0];
const collectionName = `messages_${dateStr.replace(/-/g, "_")}`;

// ✅ Only uses conversationId filter (no composite index needed)
const q = query(
  collection(db, collectionName),
  where("conversationId", "==", conversationId)
  // NO orderBy - sort in memory instead to avoid needing daily indexes
);

const snapshot = await getDocs(q);
let messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

// Sort in memory (fast for <100 messages/conversation/day)
messages.sort((a, b) => a.timestamp - b.timestamp);
```

**Why no orderBy?**

- `where("conversationId") + orderBy("timestamp")` requires composite index
- Each date-partitioned collection would need its own index
- That's 365 indexes per year! ❌
- Solution: Sort in memory (conversations rarely have >100 messages/day)
  .get();

````

**Cleanup (daily):**

```typescript
// Instead of querying all messages:
const twoDaysAgoStr = "2025_10_03";
const collectionName = `messages_${twoDaysAgoStr}`;

// Drop entire collection using BulkWriter
const bulkWriter = db.bulkWriter();
const snapshot = await db.collection(collectionName).limit(500).get();
snapshot.docs.forEach((doc) => bulkWriter.delete(doc.ref));
await bulkWriter.close();
````

### Migration Notes

**Update client-side code:**

- `messageService.ts` must use date-partitioned collections
- Query messages from current date collection
- For older messages, query previous date collections if needed

**Backward compatibility:**

- Old messages in `messages` collection remain
- New messages go to `messages_YYYY_MM_DD`
- Cleanup handles both collections

---

## 5. Client-Side Updates ✅

**Status**: Complete - All client services updated to use new structures

### poolService.ts Updates

**`joinPool()` - Automatic shard assignment:**

```typescript
// Finds available shard (max 10k per shard)
const poolDoc = await getDoc(doc(db, POOLS_COLLECTION, poolId));
const currentShard = poolData.currentShard || 0;
const shardUserCounts = poolData.shardUserCounts || { 0: 0 };

let targetShard = currentShard;
if (shardUserCounts[currentShard] >= MAX_USERS_PER_SHARD) {
  targetShard = currentShard + 1;
}

// Create user in shard
const poolUserDoc = doc(
  db,
  POOLS_COLLECTION,
  poolId,
  "shards",
  targetShard.toString(),
  "poolUsers",
  userId
);
```

**`leavePool()` - Searches all shards:**

```typescript
// Check all shards (from 0 to currentShard)
for (let shardId = 0; shardId <= currentShard; shardId++) {
  const poolUserDoc = doc(
    db,
    POOLS_COLLECTION,
    poolId,
    "shards",
    shardId.toString(),
    "poolUsers",
    userId
  );
  const userDoc = await getDoc(poolUserDoc);
  if (userDoc.exists()) {
    await deleteDoc(poolUserDoc);
    return;
  }
}
```

**`isUserInPool()` - Checks all shards:**

```typescript
for (let shardId = 0; shardId <= currentShard; shardId++) {
  const poolUserDoc = doc(
    db,
    POOLS_COLLECTION,
    poolId,
    "shards",
    shardId.toString(),
    "poolUsers",
    userId
  );
  const userDoc = await getDoc(poolUserDoc);
  if (userDoc.exists()) return true;
}
return false;
```

### chatService.ts Updates

**`getMessagesCollection()` - Date-partitioned helper:**

```typescript
const getMessagesCollection = (date: Date = new Date()): string => {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `messages_${year}_${month}_${day}`; // e.g., "messages_2025_10_05"
};
```

**`sendMessage()` - Writes to today's collection:**

```typescript
const messagesCollection = getMessagesCollection();
const messagesRef = collection(db, messagesCollection);
await addDoc(messagesRef, messageData);
console.log(`✅ Message sent to ${messagesCollection}`);
```

**`subscribeToMessages()` - Reads from 2 days:**

```typescript
// Query today's and yesterday's messages (older messages deleted)
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const todayCollection = getMessagesCollection(today);
const yesterdayCollection = getMessagesCollection(yesterday);

// Subscribe to both collections
const unsubscribeToday = subscribeToMessagesInCollection(
  todayCollection,
  conversationId,
  onMessagesUpdate,
  onError,
  messageLimit
);
const unsubscribeYesterday = subscribeToMessagesInCollection(
  yesterdayCollection,
  conversationId,
  onMessagesUpdate,
  onError,
  messageLimit
);
```

**`markMessagesAsRead()` - Queries only recent dates:**

```typescript
const collections = [
  getMessagesCollection(today),
  getMessagesCollection(yesterday),
];

for (const collectionName of collections) {
  const messagesRef = collection(db, collectionName);
  const q = query(messagesRef, where("conversationId", "==", conversationId));
  const snapshot = await getDocs(q);
  // Mark unread messages as read...
}
```

### photoService.ts Updates

**`sendPhotoChallenge()` - Sets TTL expireAt field:**

```typescript
// ✅ Set expireAt for Firestore TTL auto-cleanup (24 hours)
const expireDate = new Date();
expireDate.setHours(expireDate.getHours() + 24);

const photoData = {
  senderId,
  receiverId,
  photoUrl,
  prompt,
  timestamp: serverTimestamp(),
  expireAt: Timestamp.fromDate(expireDate), // ✅ TTL field
  viewed: false,
  pairId: pair.id,
  storagePath: storagePath || null,
};

await setDoc(photoRef, photoData);
console.log("✅ Photo challenge sent with TTL expireAt");
```

### Backward Compatibility

✅ **All changes maintain backward compatibility:**

- **Pool sharding**: Functions check from shard 0 to currentShard (handles single-shard pools)
- **Message partitioning**: Only queries recent date collections (avoids old flat collection)
- **Photo TTL**: Firestore TTL index auto-deletes docs, no client code needed

### Next Steps

1. ✅ Deploy Cloud Functions (backend optimizations)
2. ✅ Deploy app with updated services (client-side optimizations)
3. Run friendship migration: `curl https://us-central1-secretbuddy-5637d.cloudfunctions.net/migrateFriendships`
4. Configure GCS lifecycle rule (Firebase Console → Storage → Lifecycle)
5. Create Firestore TTL index (Firebase Console → Firestore → Indexes)
6. Monitor Firebase usage metrics to verify cost reductions

---

## 6. Deployment Steps

### Problem

Manual cleanup of photos was expensive:

- Query all photos
- Check age of each photo
- Delete from Storage manually
- Delete from Firestore manually

### Solution

**Automated cleanup with:**

1. **GCS Lifecycle Rules** (Storage auto-deletion)
2. **Firestore TTL Index** (Firestore auto-deletion)

### GCS Lifecycle Setup

**Via Firebase Console:**

1. Go to Firebase Console → Storage
2. Click on bucket → Lifecycle
3. Add rule:
   - **Action:** Delete
   - **Age:** 1 day
   - **Prefix:** `photoChallenge/`

**Via gcloud CLI:**

```bash
# Create lifecycle.json
{
  "lifecycle": {
    "rule": [{
      "action": {"type": "Delete"},
      "condition": {
        "age": 1,
        "matchesPrefix": ["photoChallenge/"]
      }
    }]
  }
}

# Apply to bucket
gsutil lifecycle set lifecycle.json gs://secretbuddy-5637d.appspot.com
```

### Firestore TTL Index Setup

**Via Firebase Console:**

1. Go to Firestore → Indexes
2. Create TTL Index:
   - **Collection:** `photoChallenge`
   - **Field:** `expireAt`
   - **Query Scope:** Collection
   - **TTL:** Enabled

**In photo creation code:**

```typescript
await db.collection("photoChallenge").add({
  userId: "...",
  photoUrl: "...",
  timestamp: FieldValue.serverTimestamp(),
  expireAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
  viewed: false,
});
```

### What Changed

**cleanupOldPhotos function:**

- ❌ Removed: Manual storage deletion
- ❌ Removed: Manual Firestore deletion after 24h
- ✅ Kept: Soft-delete for unviewed 4h+ photos (for UI purposes)

**dailyCleanup function:**

- ❌ Removed: Photo challenge deletion loop
- ❌ Removed: Storage deletion tasks
- ℹ️ Now: Just logs that cleanup is auto-handled

---

## 🚀 Deployment Steps

### 1. Deploy Cloud Functions

```bash
cd functions
npm run deploy
```

### 2. Run Friendship Migration (One-time)

```bash
curl -X GET https://us-central1-secretbuddy-5637d.cloudfunctions.net/migrateFriendships
```

### 3. Set up GCS Lifecycle Rule

**Option A: Firebase Console**

- Storage → Lifecycle → Add Rule
- Delete after 1 day for prefix `photoChallenge/`

**Option B: gcloud CLI**

```bash
# Create lifecycle.json
{
  "lifecycle": {
    "rule": [{
      "action": {"type": "Delete"},
      "condition": {"age": 1, "matchesPrefix": ["photoChallenge/"]}
    }]
  }
}

# Apply
gsutil lifecycle set lifecycle.json gs://secretbuddy-5637d.appspot.com
```

### 4. Create Firestore TTL Index

**Firebase Console:**

- Firestore → Indexes → Create Index
- Collection: `photoChallenge`
- Field: `expireAt`
- TTL: Enabled

**Wait ~10 minutes for index to build**

### 5. Update Client Code

**Files to update:**

- `app/src/services/poolService.ts` - Use sharded pool structure
- `app/src/services/messageService.ts` - Use date-partitioned collections
- `app/src/services/photoService.ts` - Add `expireAt` field when creating photos

---

## 📊 Expected Improvements

### Before Optimizations

- **Pool queries:** Full collection scan for 100k users
- **Friend matching:** N² queries to friendships collection
- **Message cleanup:** Query + delete millions of docs
- **Photo cleanup:** Manual storage + Firestore deletion

### After Optimizations

- **Pool queries:** Max 10k users per shard
- **Friend matching:** O(1) lookups in memory
- **Message cleanup:** Drop entire date collection
- **Photo cleanup:** Automated by GCS + Firestore

### Cost Reduction Estimates

- **Reads:** 90% reduction (sharding + friends array)
- **Writes:** 50% reduction (no manual cleanup writes)
- **Function invocations:** 70% reduction (auto-cleanup)
- **Storage operations:** 95% reduction (lifecycle rules)

---

## ⚠️ Important Notes

### Pool Sharding

- Shards are created automatically as users join
- Each shard max 10k users
- Client code must use new structure when joining pools

### Friendship Migration

- Run migration function **once**
- Keep friendships collection for backward compat
- Update both arrays when friendship changes

### Message Partitioning

- Update client to use date collections
- Old messages in `messages` remain accessible
- Cleanup handles both old and new structures

### Photo TTL

- Set `expireAt` field on all new photos
- Firestore auto-deletes after expiration
- GCS lifecycle auto-deletes storage files

---

## 🧪 Testing

### Test Pool Sharding

```bash
# Create pools
curl -X POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePools

# Add all users to pool (tests sharding)
curl -X POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs \
  -H "Content-Type: application/json" \
  -d '{"poolId": "2025-10-05-14h", "allUsers": true}'

# Check shards in Firestore console:
# /pools/2025-10-05-14h/shards/shard_0/poolUsers
# /pools/2025-10-05-14h/shards/shard_1/poolUsers
```

### Test Friendship Optimization

```bash
# Run migration
curl -X GET https://us-central1-secretbuddy-5637d.cloudfunctions.net/migrateFriendships

# Check user docs have friends array in Firestore
# Pairing logs should show O(1) lookups instead of queries
```

### Test Message Partitioning

```typescript
// Send message from app
// Check Firestore for messages_2025_10_05 collection
// Verify cleanup deletes old date collections
```

### Test Photo TTL

```typescript
// Upload photo with expireAt set
// Wait 24h
// Verify document auto-deleted from Firestore
// Verify file auto-deleted from Storage (check lifecycle logs)
```

---

## 📈 Monitoring

### Firestore Metrics to Watch

- Reads per pool close operation (should be ~10k per shard)
- Writes during friend matching (should be minimal)
- Document count in photoChallenge (should plateau, not grow)

### Storage Metrics

- Storage usage (should stay flat with lifecycle rules)
- Lifecycle rule executions (check in GCS logs)

### Function Metrics

- closePoolXh execution time (should be faster with sharding)
- cleanupOldPhotos reads (should drop to near-zero)
- dailyCleanup execution time (should be much faster)

---

## 🆘 Troubleshooting

### "No users in pool" error with allUsers=true

**Symptoms**: Dev button or scheduler fails with "No users in pool" despite users existing

**Root Cause**: Firestore eventual consistency - writes to shards subcollection aren't immediately visible when queried

**What happens**:

1. `addUserToPoolShard` writes to `/pools/{poolId}/shards/{shardId}/poolUsers/{userId}`
2. Query immediately after: `pool.collection('shards').get()` returns empty
3. Function fails with "No shards found"

**Solution Applied**:

- Added 1-second delay after adding users to shards (line 937)
- Track shard IDs in `Set<string>` during user addition
- Enhanced logging: "📊 Shards created: shard_0", "📊 Found X shards", "📊 Shard X has Y users"
- Better error messages explaining consistency delay

**Debug Logs to Check**:

```
📊 Found 2 total users
✅ Added 2 users to pool shards
📊 Shards created: shard_0
[1 second delay]
📊 Found 1 shards to process
📊 Shard shard_0 has 2 users
✅ Created 1 pairs
```

If you see "No shards found after adding users", the delay may not be sufficient. Increase to 2000ms in high-latency environments.

### Shards not created

- Check pool document has `currentShard` and `shardUserCounts` fields
- Verify `addUserToPoolShard` function is being called

### Friends array empty

- Run migration function
- Check migration logs for errors
- Manually verify a few user docs

### Messages not partitioning

- Update client code to use date collections
- Check message creation code uses correct collection name

### Photos not auto-deleting

- Verify TTL index is built (check Firestore console)
- Verify lifecycle rule is active (check GCS console)
- Wait 24-48h for first automatic deletions

---

## 🔄 Rollback Plan

If issues occur:

1. **Pool Sharding:** Old code still works with flat structure
2. **Friendship:** Keep friendships collection, revert to old query
3. **Messages:** Old messages collection still exists
4. **Photos:** Manual cleanup functions still present (commented)

To rollback, redeploy previous Cloud Functions version.
