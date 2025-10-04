# 📸 Photo Challenge Card - Implementation Complete

## ✅ What Was Implemented

### **Problem Solved**

- ❌ OLD: Modal popup appeared after notification (wrong UX)
- ✅ NEW: **Photo Challenge Card** appears in HomeScreen (correct UX you requested)

---

## 🎯 Key Features

### 1. **Photo Challenge Card (Not Modal!)**

- **Visual Card in HomeScreen** with:
  - 📸 Camera icon with sparkle effect
  - ⏱️ **5-minute countdown timer** (changes color as time runs out)
  - 💡 Photo prompt display
  - 🎨 Beautiful purple glow design
  - 📷 "Open Camera" button

### 2. **Persistent Across Sessions**

- Card **persists even if you:**
  - ✅ Close the app
  - ✅ Logout and login again
  - ✅ Kill the app completely
- Saved to **AsyncStorage** (local storage)
- Auto-expires after **5 minutes**

### 3. **Automatic & Manual Triggers**

- **Automatic**: Cloud Functions send notification → Card appears
- **Manual**: Can be triggered via `manualTestPhotoNotification` endpoint
- **Both users in pair** receive challenge simultaneously

### 4. **Timer System**

- ⏱️ **5:00 minutes** countdown
- 🟣 Purple when > 2 minutes
- 🟣 Pink when 1-2 minutes
- 🔴 Red when < 1 minute
- Auto-hides when timer reaches 0:00

---

## 🔧 Technical Implementation

### **Frontend (HomeScreen.tsx)**

#### State Management

```typescript
const [showPhotoChallengeCard, setShowPhotoChallengeCard] = useState(false);
const [photoChallengeCreatedAt, setPhotoChallengeCreatedAt] = useState<
  number | null
>(null);
const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
const [photoPrompt, setPhotoPrompt] = useState("");
```

#### Notification Handler

```typescript
if (type === "photo_challenge") {
  const challengePrompt = prompt || randomPrompts[...];
  const timestamp = Date.now();

  setPhotoPrompt(challengePrompt);
  setPhotoChallengeCreatedAt(timestamp);
  setShowPhotoChallengeCard(true);

  // Save to AsyncStorage for persistence
  await AsyncStorage.setItem("photoChallengeData", JSON.stringify({
    prompt: challengePrompt,
    timestamp,
    poolId: data.poolId
  }));
}
```

#### Restore from Storage

```typescript
useEffect(() => {
  const restorePhotoChallenge = async () => {
    const savedData = await AsyncStorage.getItem("photoChallengeData");
    if (!savedData) return;

    const { prompt, timestamp } = JSON.parse(savedData);
    const elapsed = Date.now() - timestamp;
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (elapsed < FIVE_MINUTES) {
      setPhotoPrompt(prompt);
      setPhotoChallengeCreatedAt(timestamp);
      setShowPhotoChallengeCard(true);
    } else {
      await AsyncStorage.removeItem("photoChallengeData");
    }
  };

  restorePhotoChallenge();
}, [user?.uid]);
```

#### Countdown Timer

```typescript
useEffect(() => {
  if (!showPhotoChallengeCard || !photoChallengeCreatedAt) return;

  const interval = setInterval(() => {
    const elapsed = Date.now() - photoChallengeCreatedAt;
    const FIVE_MINUTES = 5 * 60 * 1000;
    const remaining = Math.max(0, FIVE_MINUTES - elapsed);
    const remainingSeconds = Math.floor(remaining / 1000);

    setTimeRemaining(remainingSeconds);

    if (remainingSeconds <= 0) {
      setShowPhotoChallengeCard(false);
      setPhotoChallengeCreatedAt(null);
      AsyncStorage.removeItem("photoChallengeData");
    }
  }, 1000);

  return () => clearInterval(interval);
}, [showPhotoChallengeCard, photoChallengeCreatedAt]);
```

#### Card UI

```tsx
{
  showPhotoChallengeCard && (
    <View style={styles.photoChallengeCard}>
      <View style={styles.photoChallengeGlowBorder} />

      {/* Header */}
      <View style={styles.photoChallengeHeader}>
        <View style={styles.photoChallengeIconContainer}>
          <Ionicons name="camera" size={32} color={colors.accentPurple} />
          <View style={styles.iconSparkle}>
            <Ionicons name="sparkles" size={12} color={colors.accentYellow} />
          </View>
        </View>
        <View>
          <Text style={styles.photoChallengeTitle}>📸 Send Photo</Text>
          <Text style={styles.photoChallengeSubtitle}>
            Time to capture the moment!
          </Text>
        </View>
      </View>

      {/* Timer Chip */}
      <View
        style={[
          styles.photoChallengeTimerChip,
          timeRemaining < 60 && styles.photoChallengeTimerCritical,
          timeRemaining >= 60 &&
            timeRemaining < 120 &&
            styles.photoChallengeTimerUrgent,
        ]}
      >
        <Ionicons name="time" size={16} />
        <Text style={styles.photoChallengeTimerText}>
          {Math.floor(timeRemaining / 60)}:
          {(timeRemaining % 60).toString().padStart(2, "0")}
        </Text>
      </View>

      {/* Prompt */}
      <View style={styles.photoChallengePromptContainer}>
        <View style={styles.promptLabelRow}>
          <Ionicons name="bulb" size={16} color={colors.accentYellow} />
          <Text style={styles.photoChallengePromptLabel}>Today's Prompt</Text>
        </View>
        <Text style={styles.photoChallengePromptText}>{photoPrompt}</Text>
        <View style={styles.promptAccentLine} />
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={styles.photoChallengeActionButton}
        onPress={takeBackPhoto}
      >
        <Ionicons name="camera" size={20} color="#FFFFFF" />
        <Text style={styles.photoChallengeActionText}>Open Camera</Text>
      </TouchableOpacity>

      <Text style={styles.photoChallengeHelperText}>
        💡 Use back camera only • No selfies allowed
      </Text>
    </View>
  );
}
```

### **Backend (Cloud Functions)**

#### Updated `sendPhotoNotificationToPool()`

```typescript
async function sendPhotoNotificationToPool(
  poolId: string,
  db: admin.firestore.Firestore
) {
  // ... existing code ...

  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
  const timestamp = Date.now();

  const batch = db.batch();

  userDocs.forEach((doc) => {
    const userData = doc.data();
    if (userData?.expoPushToken) {
      // Send push notification
      messages.push({
        to: userData.expoPushToken,
        sound: "default",
        title: "É hora da tua foto do dia 📸",
        body: "Toca para enviar a tua foto ao teu mystery buddy!",
        data: {
          type: "photo_challenge",
          poolId,
          userId: doc.id,
          prompt: randomPrompt,
        },
      });

      // AUTOMATIC: Create photo challenge in Firestore
      const challengeRef = db
        .collection("users")
        .doc(doc.id)
        .collection("photoChallenges")
        .doc(`${poolId}-${timestamp}`);

      batch.set(challengeRef, {
        prompt: randomPrompt,
        poolId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(timestamp + 5 * 60 * 1000), // 5 minutes
        status: "pending",
      });
    }
  });

  await batch.commit();
  console.log(`✅ Created ${userIdArray.length} photo challenges in Firestore`);

  // Send notifications...
}
```

---

## 🎨 Design Features

### Card Styling

- **Background**: Dark purple surface (`colors.surface`)
- **Border**: Glow effect with purple accent
- **Shadow**: Purple shadow with elevation
- **Rounded corners**: 24px border radius
- **Padding**: 20px all around

### Timer Colors

| Time Remaining | Color     | Style                         |
| -------------- | --------- | ----------------------------- |
| 5:00 - 2:01    | 🟣 Purple | `photoChallengeTimerChip`     |
| 2:00 - 1:01    | 🟣 Pink   | `photoChallengeTimerUrgent`   |
| 1:00 - 0:00    | 🔴 Red    | `photoChallengeTimerCritical` |

### Prompt Display

- **Label**: "TODAY'S PROMPT" in purple uppercase
- **Text**: Large, centered, white text
- **Accent line**: Pink underline (3px height, 60px width)
- **Icon**: Yellow bulb icon

---

## 🧪 Testing

### Manual Test Command

```powershell
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"
Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" `
  -Method Post `
  -Body '{"poolId":"morning-2025-10-04"}' `
  -ContentType "application/json"
```

### Expected Response

```json
{
  "success": true,
  "message": "Sent notifications to 2 users",
  "sent": 2
}
```

### What to Verify

1. ✅ Both users receive push notification
2. ✅ Tap notification → Card appears in HomeScreen
3. ✅ Timer starts at 5:00 and counts down
4. ✅ Prompt displays correctly
5. ✅ Close app → Reopen → Card still there
6. ✅ Logout → Login → Card still there (if < 5 min)
7. ✅ Timer expires → Card disappears
8. ✅ Send photo → Card disappears
9. ✅ "Open Camera" button works

---

## 📊 System Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Cloud Functions: checkPhotoNotifications (every minute)     │
│ - Checks if current time matches photoTimes in pool         │
│ - Calls sendPhotoNotificationToPool()                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ sendPhotoNotificationToPool()                                │
│ 1. Get all paired users in pool                             │
│ 2. Generate random prompt                                    │
│ 3. Create photo challenge in Firestore (AUTOMATIC)          │
│ 4. Send push notification to all users                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ User receives notification                                   │
│ - Shows in notification tray                                │
│ - Title: "É hora da tua foto do dia 📸"                     │
│ - Body: "Toca para enviar a tua foto..."                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼ (User taps notification)
┌─────────────────────────────────────────────────────────────┐
│ HomeScreen: Notification Handler                            │
│ 1. Extract prompt from notification data                    │
│ 2. Set photoChallengeCreatedAt = Date.now()                 │
│ 3. Save to AsyncStorage                                     │
│ 4. setShowPhotoChallengeCard(true)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Photo Challenge Card Appears                                │
│ - Displays prompt                                           │
│ - Starts 5-minute countdown                                 │
│ - Shows "Open Camera" button                                │
│ - Persists across app restarts                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼ (User taps "Open Camera")
┌─────────────────────────────────────────────────────────────┐
│ takeBackPhoto()                                             │
│ 1. Opens camera (back camera only)                          │
│ 2. User takes photo                                         │
│ 3. Uploads to Firebase Storage                              │
│ 4. Creates photoChallenge document                          │
│ 5. Hides card                                               │
│ 6. Clears AsyncStorage                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔥 Files Changed

### Frontend

- ✅ **`app/src/screens/HomeScreen.tsx`**

  - Added `showPhotoChallengeCard` state
  - Added `photoChallengeCreatedAt` timestamp state
  - Added AsyncStorage persistence
  - Added countdown timer useEffect
  - Added restore from storage useEffect
  - Added Photo Challenge Card UI
  - Removed old modal completely
  - Fixed `sendPhotoFromNotification()` to hide card

- ✅ **`app/src/services/notificationService.ts`**
  - Added Platform check to skip web push registration
  - Prevents VAPID key error on web

### Backend

- ✅ **`functions/src/index.ts`**
  - Updated `sendPhotoNotificationToPool()` to create Firestore challenges
  - Added batch write for photo challenges
  - Creates challenge for BOTH users automatically

---

## 📝 Data Structure

### AsyncStorage

```json
{
  "photoChallengeData": {
    "prompt": "Share the view from your window",
    "timestamp": 1696412345678,
    "poolId": "morning-2025-10-04"
  }
}
```

### Firestore (Optional - for future sync)

```
users/{userId}/photoChallenges/{poolId}-{timestamp}
{
  prompt: "Share the view from your window",
  poolId: "morning-2025-10-04",
  timestamp: Timestamp,
  expiresAt: Timestamp (5 minutes later),
  status: "pending"
}
```

---

## ✅ Completed Requirements

1. ✅ **Card instead of modal** → Photo Challenge Card in HomeScreen
2. ✅ **5-minute timer** → Countdown with color coding
3. ✅ **Persist across logout/login** → AsyncStorage + restore useEffect
4. ✅ **Both users receive** → Cloud Functions send to all paired users
5. ✅ **Automatic trigger** → checkPhotoNotifications runs every minute
6. ✅ **Manual trigger** → manualTestPhotoNotification endpoint
7. ✅ **Show prompt** → Displayed in card with icon
8. ✅ **Open camera button** → Integrated takeBackPhoto()

---

## 🚀 Deployment Status

- ✅ Frontend: Running on Expo (Metro bundler)
- ✅ Backend: Deployed to Cloud Functions
- ✅ Notifications: Tested and working (sent: 2)
- ✅ Web platform: Fixed push token error

---

## 🎯 Next Steps (Optional Enhancements)

1. **Firestore Sync** (instead of AsyncStorage only)
   - Sync challenge state across devices
   - Query `photoChallenges` subcollection on mount
2. **Challenge History**
   - Show past challenges in profile
   - Track completion rate
3. **Notification Scheduling UI**
   - Let users set preferred photo times
   - Per-user notification preferences
4. **Analytics**
   - Track how many users tap notification
   - Track how many complete challenge
   - Average time to complete

---

## 📸 Summary

**BEFORE:**

- ❌ Modal popup (wrong UX)
- ❌ Disappeared on app close
- ❌ Only one user received notification

**AFTER:**

- ✅ Beautiful card in HomeScreen
- ✅ Persists across sessions (AsyncStorage)
- ✅ Both users receive notification
- ✅ 5-minute countdown timer
- ✅ Auto-expires when time runs out
- ✅ Works manually and automatically

**Result:** Complete photo challenge system as requested! 🎉
