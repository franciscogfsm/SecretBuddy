# Points & Streaks System - Complete Implementation Guide

## 🎯 Overview

The SecretBuddy app now has a fully functional points, streaks, and leaderboard system that rewards users for consistent engagement and photo sharing.

## ✅ What Was Implemented

### 1. **Automatic Points System**

Users earn points automatically for:

- **Getting Paired**: 20 base points + streak bonus (up to 50 bonus points)
  - Triggered when users are matched in daily pools
  - Bonus increases with consecutive day streaks: `streakBonus = min(streak × 5, 50)`
- **Sending Photos**: 10 points per photo sent
  - Triggered when a photo challenge is created
  - Encourages photo sharing and engagement

### 2. **Daily Streak System**

- Tracks consecutive days of getting paired
- Automatically increments when users get paired on consecutive days
- Resets to 1 if a day is skipped
- Provides increasing point bonuses for maintaining streaks
- Stored in user profile: `lastPairedDate` field tracks the last pairing

### 3. **Real-Time Leaderboards**

Three types of leaderboards:

- **Friends Leaderboard**: Shows top friends sorted by points
- **Country Leaderboard**: Shows top users in the same country
- **Global Leaderboard**: Available via Cloud Function (optional)

### 4. **Live Data Display**

- **HomeScreen**: Shows real streak and points from user profile
- **PointsScreen**: Displays complete stats, badges, and leaderboards
- **ChatScreen**: Shows partner's points and streak

## 🔧 Technical Implementation

### Cloud Functions (Firebase Functions)

Located in: `functions/src/index.ts`

#### **awardPointsForPhoto** (Firestore Trigger)

```typescript
Trigger: onCreate("photoChallenge/{photoId}")
Action: Awards 10 points when a photo is sent
```

#### **awardPointsForPairing** (Firestore Trigger)

```typescript
Trigger: onCreate("pairs/{pairId}")
Action:
  - Awards 20 base points + streak bonus
  - Updates streak (increments or resets based on lastPairedDate)
  - Tracks lastPairedDate for streak calculation
```

#### **getLeaderboard** (HTTP Endpoint)

```typescript
Endpoint: GET /getLeaderboard
Parameters:
  - type: "global" | "country" | "friends"
  - userId: string (optional)
  - limit: number (default: 10)

Response:
  {
    success: boolean,
    type: string,
    leaderboard: LeaderboardEntry[],
    userRank?: LeaderboardEntry
  }
```

### Client Services

Located in: `app/src/services/`

#### **leaderboardService.ts**

- `getGlobalLeaderboard()`: Fetches top users globally
- `getCountryLeaderboard()`: Fetches top users in same country (client-side implementation)
- `getFriendsLeaderboard()`: Fetches friends sorted by points
- `getUserGlobalRank()`: Gets user's global ranking

#### **userService.ts**

Already includes:

- `addPoints(uid, amount)`: Manually add points
- `removePoints(uid, amount)`: Manually remove points
- `updateStreak(uid, newStreak)`: Set streak value
- `incrementStreak(uid)`: Increment streak by 1
- `resetStreak(uid)`: Reset streak to 0

### Data Structure

#### **User Document** (`users/{userId}`)

```typescript
{
  displayName: string,
  email: string,
  points: number,          // Total points earned
  streak: number,          // Current consecutive day streak
  hearts: number,          // Available hearts
  lastPairedDate: string,  // YYYY-MM-DD format for streak tracking
  country?: string,
  // ... other fields
}
```

## 📊 Point Values

| Action       | Points     | Notes                      |
| ------------ | ---------- | -------------------------- |
| Get Paired   | 20 + bonus | Bonus: min(streak × 5, 50) |
| Send Photo   | 10         | Per photo sent             |
| Streak Bonus | 5 per day  | Capped at 50 points        |

### Streak Bonus Examples:

- Day 1: 20 points (no bonus)
- Day 2: 30 points (20 + 10 bonus)
- Day 3: 35 points (20 + 15 bonus)
- Day 7: 55 points (20 + 35 bonus)
- Day 10+: 70 points (20 + 50 max bonus)

## 🚀 Deployment Status

### ✅ Deployed Functions:

- `awardPointsForPhoto` - Awards points for sending photos
- `awardPointsForPairing` - Awards points and updates streaks for pairing
- `getLeaderboard` - HTTP endpoint for leaderboards
- `notifyPhotoReceived` - Sends push notifications when photo received

### ✅ Updated Screens:

- `HomeScreen.tsx` - Shows real streak and points
- `PointsScreen.tsx` - Shows real leaderboards and stats
- All data is fetched from Firestore in real-time

## 🔍 How It Works

### When a User Gets Paired:

1. Pool closes (e.g., at 10:00 UTC)
2. `closeHourlyPool()` function pairs users
3. Creates pair document in `pairs` collection
4. **Trigger**: `awardPointsForPairing` Cloud Function fires
5. For each user in the pair:
   - Fetches current streak and lastPairedDate
   - Calculates new streak:
     - If yesterday: `streak + 1`
     - If today (already paired): keep current
     - Otherwise: reset to `1`
   - Calculates points: `20 + min(newStreak × 5, 50)`
   - Updates user document with new points, streak, and lastPairedDate

### When a User Sends a Photo:

1. User takes photo and submits via app
2. `sendPhotoChallenge()` creates document in `photoChallenge` collection
3. **Trigger**: `awardPointsForPhoto` Cloud Function fires
4. Awards 10 points to sender
5. **Also triggers**: `notifyPhotoReceived` sends push notification to receiver

### When Viewing Leaderboards:

1. User opens PointsScreen
2. Parallel requests to:
   - `getFriendsLeaderboard()` - Fetches friends from user doc
   - `getCountryLeaderboard()` - Queries users by country and sorts by points
3. Data displayed with user's rank highlighted

## 🎨 UI Updates

### HomeScreen

```tsx
<Text style={styles.metaValue}>{streak} days 🔥</Text>
<Text style={styles.metaValue}>{points} pts</Text>
```

### PointsScreen

- Shows level based on points: `level = floor(points / 50) + 1`
- Level names: Beginner → Advanced → Epic → Legendary → Radiant
- Real-time leaderboards for friends and country
- Weekly progress tracking
- Insights: Daily streak, Weekly points, Hearts remaining

## 🔐 Security & Performance

### Firestore Security Rules

Ensure these rules are set in Firebase Console:

```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;

  // Allow Cloud Functions to update points/streak
  allow update: if request.auth.uid == userId
    || request.auth.token.firebase.identities["serviceAccount"] != null;
}
```

### Indexes Required

Create these composite indexes in Firestore:

1. **Country Leaderboard**:

   - Collection: `users`
   - Fields: `country` (Ascending), `points` (Descending)

2. **Global Leaderboard**:
   - Collection: `users`
   - Fields: `points` (Descending)

## 🐛 Troubleshooting

### Points Not Awarded

- Check Cloud Function logs in Firebase Console
- Verify user document exists in `users` collection
- Ensure `points` and `streak` fields are initialized (default: 0)

### Streak Not Incrementing

- Check `lastPairedDate` field in user document
- Verify date format is `YYYY-MM-DD`
- Check server time vs device time (uses UTC)

### Leaderboard Not Loading

- Check Firestore indexes are created
- Verify user has `country` field set
- Check console for error messages
- Fallback: Returns empty leaderboard on error

## 📱 Testing

### Test Points System:

1. Get paired in a pool → Should award 20 points (first time)
2. Send a photo → Should award 10 points
3. Check HomeScreen → Should show updated points and streak
4. Get paired next day → Should increment streak and award bonus points

### Test Leaderboards:

1. Open PointsScreen
2. Check Friends section (empty if no friends)
3. Check Country section (shows users from same country)
4. Verify "You" is highlighted when in top 3

## 🎉 Summary

The points and streaks system is now fully functional with:

✅ Automatic point awards for pairing and photos  
✅ Daily streak tracking with bonus points  
✅ Real-time leaderboards (friends & country)  
✅ Live data display on HomeScreen and PointsScreen  
✅ Push notifications when photos are received  
✅ Proper error handling and fallbacks

Users are now incentivized to:

- Get paired daily (maintain streak)
- Send photos consistently (earn points)
- Compete on leaderboards with friends and country

**All data is stored in Firestore and updates in real-time!** 🚀
