# Firestore Query Examples for SecretBuddy

## Basic Queries

### 1. Simple Find (Get Single Document)

```typescript
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

// Get a single user by ID
const userRef = doc(db, "users", userId);
const userSnap = await getDoc(userRef);

if (userSnap.exists()) {
  console.log("User data:", userSnap.data());
} else {
  console.log("No user found");
}
```

### 2. Query with Conditions (equivalent to MongoDB find)

```typescript
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

// Find users from a specific country with age > 18
const usersRef = collection(db, "users");
const q = query(
  usersRef,
  where("country", "==", "Portugal"),
  where("age", ">", 18)
);

const querySnapshot = await getDocs(q);
querySnapshot.forEach((doc) => {
  console.log(doc.id, " => ", doc.data());
});
```

### 3. Query with Sorting (equivalent to MongoDB sort)

```typescript
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

// Get top 10 users with highest points
const usersRef = collection(db, "users");
const q = query(usersRef, orderBy("points", "desc"), limit(10));

const querySnapshot = await getDocs(q);
const topUsers = querySnapshot.docs.map((doc) => ({
  id: doc.id,
  ...doc.data(),
}));
```

### 4. Complex Query (equivalent to MongoDB aggregate)

```typescript
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

// Find active users from Portugal, sorted by points, limit 10
const usersRef = collection(db, "users");
const q = query(
  usersRef,
  where("country", "==", "Portugal"),
  where("points", ">", 100),
  orderBy("points", "desc"),
  orderBy("streak", "desc"),
  limit(10)
);

const querySnapshot = await getDocs(q);
const results = querySnapshot.docs.map((doc) => ({
  id: doc.id,
  ...doc.data(),
}));
```

## Real-Time Listeners (Live Updates)

### 5. Listen to Document Changes

```typescript
import { doc, onSnapshot } from "firebase/firestore";

// Real-time listener for user profile changes
const userRef = doc(db, "users", userId);
const unsubscribe = onSnapshot(userRef, (doc) => {
  if (doc.exists()) {
    console.log("Current data:", doc.data());
    // Update UI with new data
  }
});

// Don't forget to unsubscribe when component unmounts
// unsubscribe();
```

### 6. Listen to Collection Query

```typescript
import { collection, query, where, onSnapshot } from "firebase/firestore";

// Real-time listener for active matches
const matchesRef = collection(db, "matches");
const q = query(
  matchesRef,
  where("userId", "==", currentUserId),
  where("status", "==", "active")
);

const unsubscribe = onSnapshot(q, (querySnapshot) => {
  const matches = [];
  querySnapshot.forEach((doc) => {
    matches.push({ id: doc.id, ...doc.data() });
  });
  console.log("Active matches:", matches);
});
```

## Query Operators

### Comparison Operators

```typescript
where("age", "==", 25); // Equal to
where("age", "!=", 25); // Not equal to
where("age", ">", 18); // Greater than
where("age", ">=", 18); // Greater than or equal
where("age", "<", 30); // Less than
where("age", "<=", 30); // Less than or equal
where("country", "in", ["Portugal", "Spain", "France"]); // In array
where("country", "not-in", ["USA", "UK"]); // Not in array
where("tags", "array-contains", "verified"); // Array contains
```

## Practical Examples for SecretBuddy

### Example 1: Get User's Active Matches

```typescript
export const getUserActiveMatches = async (userId: string) => {
  const matchesRef = collection(db, "matches");
  const q = query(
    matchesRef,
    where("userId", "==", userId),
    where("status", "==", "active"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
```

### Example 2: Get Top Users by Points

```typescript
export const getLeaderboard = async (limitCount: number = 10) => {
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("points", "desc"), limit(limitCount));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
```

### Example 3: Get Users by Country (for matching)

```typescript
export const getUsersByCountry = async (
  country: string,
  excludeUserId: string
) => {
  const usersRef = collection(db, "users");
  const q = query(
    usersRef,
    where("country", "==", country),
    where("uid", "!=", excludeUserId),
    limit(20)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
```

### Example 4: Get Chat Messages with Pagination

```typescript
export const getChatMessages = async (chatId: string, lastVisible?: any) => {
  const messagesRef = collection(db, "chats", chatId, "messages");
  let q = query(messagesRef, orderBy("timestamp", "desc"), limit(25));

  // Add pagination if we have a last visible document
  if (lastVisible) {
    q = query(q, startAfter(lastVisible));
  }

  const snapshot = await getDocs(q);
  return {
    messages: snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
    lastVisible: snapshot.docs[snapshot.docs.length - 1],
  };
};
```

## Important Notes

⚠️ **Firestore Limitations**:

- Cannot use `!=` or `not-in` with other operators in the same query
- Need composite indexes for queries with multiple `orderBy()` or `where()` + `orderBy()`
- Maximum 10 inequality filters per query
- Array membership (`array-contains`) limited to one per query

✅ **Best Practices**:

1. Create indexes for complex queries (Firestore Console → Indexes)
2. Use real-time listeners (`onSnapshot`) for live data
3. Use pagination for large result sets
4. Cache frequently accessed data locally
5. Minimize reads by fetching only what you need

## Creating Required Indexes

If you get "index required" errors, Firestore will provide a link to create the index automatically.
Or create them manually in Firebase Console → Firestore → Indexes.

### Common Indexes for SecretBuddy:

1. **Users by country and points**

   - Collection: `users`
   - Fields: `country` (Ascending), `points` (Descending)

2. **Matches by user and status**

   - Collection: `matches`
   - Fields: `userId` (Ascending), `status` (Ascending), `createdAt` (Descending)

3. **Messages by timestamp**
   - Collection: `chats/{chatId}/messages`
   - Fields: `timestamp` (Descending)
