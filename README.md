# SecretBuddy - Anonymous Mystery Chat App

## 🎭 Overview

SecretBuddy is a React Native mobile application that connects users anonymously for mystery conversations and photo sharing. Users are paired in time-based pools, share photos throughout the day, and can reveal their identities during designated reveal windows.

## 🏗️ Architecture

- **Frontend**: React Native with Expo
- **State Management**: React Context API
- **Navigation**: React Navigation (Stack & Tab)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Styling**: StyleSheet with custom theme system

## 📱 Core Features

### 🕒 Pool System

- **Pool A**: 8:00 AM - 1:00 PM (Morning Pool)
- **Pool B**: 1:00 PM - 4:00 PM (Afternoon Pool)
- **Reveal Window**: 9:00 PM - 10:00 PM (Daily Identity Reveal)
- **Waiting Periods**: Between pools and overnight

### 🎯 Game Modes

1. **Friends Mode**: Pair only with added friends
2. **Country Mode**: Pair with users from selected country
3. **World Mode**: Pair with anyone globally

### 👥 User Management

- **Profile System**: Name, username, age, country, bio (100 char limit)
- **Privacy Controls**: Age visibility toggle
- **Authentication**: Firebase Auth integration
- **Friend System**: Add, remove, accept/decline friend requests

## 🔄 App Flow & Functionality

### 1. Authentication & Onboarding

```typescript
// Auth Context manages user state
- Firebase Authentication
- Profile creation/editing
- Persistent login state
- Sign out functionality
```

### 2. Home Screen (`HomeScreen.tsx`)

**Current Phase Detection:**

```javascript
getCurrentPhase() {
  // Returns: "pool-a", "pool-b", "reveal-window", "waiting"
  // Based on current time (8-13, 13-16, 21-22)
}
```

**Key Features:**

- Real-time pool status display
- Game mode selection (Friends/Country/World)
- Pairing button with phase-appropriate actions
- Ghosting protection warning (dismissible)
- Photo challenge prompts with random timing
- Received photo notifications
- Stats display (streak, points)

**Pairing States:**

- `not-paired`: Initial state
- `searching`: Finding a match (3-4 second animation)
- `matched`: Successfully paired
- `reveal-ready`: Can access reveal screen

### 3. Photo System

**Photo Challenges:**

```javascript
// Random prompts appear during matched phase (12 PM - 9 PM)
const randomPrompts = [
  "Share the view from your window",
  "Show what you're currently looking at",
  "Take a photo of what you're drinking",
  // ... more prompts
];
```

**Photo Rules:**

- Back camera only (no selfies)
- Encrypted and anonymous until reveal
- Auto-delete after reveal window
- Required for reveal unlock (min 1 photo)

**Camera Integration:**

```javascript
// Uses expo-image-picker
- Permission handling
- Back camera enforcement
- Image quality: 0.8
- Aspect ratio: 1:1 (square)
```

### 4. Reveal System (`RevealScreen.tsx`)

**Interactive Reveal Animation:**

```javascript
// Tap-to-reveal mechanism
- 5 taps required for full reveal
- Dramatic timing with back easing
- Haptic feedback on each tap
- 3-stage bounce animation
```

**Demo Modes:**

- Ghost demo (bothRevealed: false)
- Full reveal demo (bothRevealed: true)
- Route params control demo behavior

**Reveal Logic:**

- Only users who shared ≥1 photo can access
- Individual qualification (not mutual punishment)
- Identity cards with profile information
- Decision system (continue/pass)

### 5. Friends Management (`FriendsScreen.tsx`)

**Friend States:**

```typescript
type Friend = {
  id: string;
  name: string;
  username: string;
  country: string;
  bio?: string;
  status: "friend" | "pending_sent" | "pending_received" | "none";
  initials: string;
  lastActive?: string;
};
```

**Features:**

- Friend search and discovery
- Request management (send/accept/decline)
- Profile viewing with bio display
- Contact import capability
- Statistics tracking (friends count, requests)

### 6. Profile System (`ProfileScreen.tsx`)

**User Profile:**

```typescript
type Profile = {
  name: string;
  username: string;
  age: number;
  ageVisible: boolean;
  country: string;
  mode: Mode;
  bio?: string; // Max 100 characters
};
```

**Bio Management:**

- Modal-based bio editor
- 100 character limit with live counter
- Auto-save functionality
- Placeholder prompts for empty bios

**Privacy Controls:**

- Age visibility toggle
- Profile information management
- Settings navigation

### 7. Safety & Moderation System

**User Blocking:**

```typescript
type BlockedUser = {
  id: string;
  blockedUserId: string;
  blockedAt: timestamp;
  reason?: string;
};
```

**Report System:**

```typescript
type Report = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  matchId?: string;
  messageId?: string;
  photoId?: string;
  type:
    | "inappropriate_content"
    | "harassment"
    | "spam"
    | "fake_profile"
    | "other";
  description: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  createdAt: timestamp;
  reviewedAt?: timestamp;
  moderatorId?: string;
  moderatorNotes?: string;
};
```

**Features:**

- Block users from friends, chat, and future matching
- Report inappropriate content, harassment, or spam
- Report photos during reveal or chat
- Report fake profiles or suspicious behavior
- Admin moderation dashboard for reviewing reports
- Automatic content filtering and user safety measures

**UI Components:**

- Block/Report buttons in user profiles
- Report modal with category selection
- Blocked users list in settings
- Safety guidelines and community standards

### 8. Chat System (`ChatScreen.tsx`)

**Features:**

- Anonymous messaging during matched phase
- Message history preservation
- Real-time chat interface
- Photo sharing integration

### 8. Navigation (`RootNavigator.tsx`, `Tabs.tsx`)

**Structure:**

```
App
├── Onboarding/Auth Screens
└── Main Tab Navigator
    ├── Home (Pool & Pairing)
    ├── Chat (Messages)
    ├── Reveal (Identity Reveal)
    ├── Friends (Friend Management)
    └── Profile (User Settings)
```

## 🎨 UI/UX Design System

### Theme (`theme/`)

```javascript
// Color Palette
colors: {
  textPrimary: "#FFFFFF",
  textSecondary: "#A1A1AA",
  accentPurple: "#9C6BFF",
  accentPink: "#FF4FB7",
  accentTeal: "#2EE6A9",
  danger: "#FF6B8A",
}

// Gradients
gradients: {
  midnight: ["#0B0520", "#1A0B3A", "#2D1B69"],
  purplePink: ["#9C6BFF", "#FF4FB7"],
  tealBlue: ["#2EE6A9", "#4F46E5"],
}
```

### Responsive Design

```javascript
const isSmallScreen = width < 375 || height < 667;
// Adaptive sizing for different screen sizes
```

### Animations

- Entrance animations with staggered timing
- Pulse effects for active elements
- Floating animations for prompts
- Tap feedback with haptics
- Smooth transitions between states

## 🔥 Backend Integration Requirements

### Firebase Structure Needed

#### 1. Authentication

```javascript
// Firebase Auth
- Email/password authentication
- User profile creation
- Persistent sessions
```

#### 2. Firestore Collections

**Users Collection:**

```javascript
users/{userId} {
  name: string,
  username: string,
  age: number,
  ageVisible: boolean,
  country: string,
  mode: "friends" | "country" | "world",
  bio?: string,
  createdAt: timestamp,
  lastActive: timestamp,
  stats: {
    streak: number,
    points: number,
    hearts: number
  }
}
```

**Friends Collection:**

```javascript
friends/{friendshipId} {
  user1: userId,
  user2: userId,
  status: "pending" | "accepted" | "declined",
  requestedBy: userId,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Pools Collection:**

```javascript
pools/{poolId} {
  type: "A" | "B",
  date: "2025-10-01",
  startTime: timestamp,
  endTime: timestamp,
  participants: [userId],
  matches: [{
    user1: userId,
    user2: userId,
    matchedAt: timestamp
  }]
}
```

**Matches Collection:**

```javascript
matches/{matchId} {
  participants: [userId1, userId2],
  pool: poolId,
  startedAt: timestamp,
  revealWindow: timestamp,
  photos: {
    [userId]: [{
      url: string,
      uploadedAt: timestamp,
      prompt: string
    }]
  },
  messages: [{
    senderId: userId,
    text: string,
    timestamp: timestamp,
    type: "text" | "photo"
  }],
  reveals: {
    [userId]: {
      hasAccess: boolean,
      revealedAt?: timestamp,
      photoCount: number
    }
  },
  status: "active" | "revealed" | "expired"
}
```

**Blocks Collection:**

```javascript
blocks/{blockId} {
  blockerId: userId,
  blockedUserId: userId,
  reason?: string,
  createdAt: timestamp,
  // Compound index: (blockerId, blockedUserId)
}
```

**Reports Collection:**

```javascript
reports/{reportId} {
  reporterId: userId,
  reportedUserId: userId,
  matchId?: string,
  messageId?: string,
  photoId?: string,
  type: "inappropriate_content" | "harassment" | "spam" | "fake_profile" | "nudity" | "violence" | "other",
  description: string,
  status: "pending" | "under_review" | "resolved" | "dismissed",
  severity: "low" | "medium" | "high" | "critical",
  createdAt: timestamp,
  reviewedAt?: timestamp,
  resolvedAt?: timestamp,
  moderatorId?: string,
  moderatorNotes?: string,
  actionTaken?: "warning" | "temporary_ban" | "permanent_ban" | "content_removed" | "no_action",
  evidence: {
    screenshots?: string[],
    messageText?: string,
    photoUrl?: string
  }
}
```

**Moderation Collection:**

```javascript
moderation/{userId} {
  userId: string,
  warningCount: number,
  banHistory: [{
    type: "temporary" | "permanent",
    reason: string,
    startDate: timestamp,
    endDate?: timestamp,
    moderatorId: string
  }],
  reportCount: number, // Reports against this user
  lastActionDate?: timestamp,
  riskScore: number, // 0-100, calculated by ML models
  status: "active" | "warned" | "temporarily_banned" | "permanently_banned"
}
```

#### 3. Storage Structure

```
/photos/{matchId}/{userId}/{photoId}.jpg
/avatars/{userId}/profile.jpg
```

#### 4. Cloud Functions Needed

**Pool Management:**

```javascript
// Scheduled functions
-createDailyPools() - // Create Pool A & B daily
  closePools() - // Close pools at designated times
  openRevealWindow() - // Enable reveals 9-10 PM
  cleanupExpiredMatches(); // Remove expired matches and associated photos older than 3 days
```

**Matching Algorithm:**

```javascript
matchUsers(poolId, gameMode) {
  // Logic based on mode:
  // - friends: match with friend list
  // - country: match within same country
  // - world: match globally
  // - Ensure no repeat matches within week
}
```

**Photo Management:**

```javascript
uploadPhoto(matchId, userId, photoData) {
  // Upload to Storage (photos are stored just-in-time)
  // Update match document
  // Check if user qualifies for reveal
  // Notes: photos are ephemeral — after the reveal window ends the photo must be deleted,
  // and the cleanup job should delete any photos/files associated with matches older than 3 days.
}
```

**Reveal Logic:**

```javascript
checkRevealAccess(matchId, userId) {
  // Verify photo count >= 1
  // Check time window (9-10 PM)
  // Return access permission
}
```

**Safety & Moderation:**

```javascript
blockUser(blockerId, blockedUserId, reason) {
  // Add to blocks collection
  // Remove from friends if applicable
  // End current match if active
  // Prevent future matching
}

submitReport(reportData) {
  // Create report document
  // Trigger content moderation check
  // Notify moderation team for manual review
  // Auto-action for high-severity reports
}

moderateContent(reportId, actionData) {
  // Admin function to review reports
  // Apply moderation actions (warn/ban/remove)
  // Update user moderation status
  // Send notifications to involved users
}

checkUserSafety(userId) {
  // Calculate user risk score
  // Check for blocked users in matching
  // Verify user status before actions
}

autoModerationTrigger() {
  // AI/ML content scanning
  // Automatic flagging of inappropriate content
  // Photo content analysis for NSFW
  // Text analysis for harassment/spam
}
```

#### 5. Real-time Listeners Needed

**Home Screen:**

```javascript
// Listen to current user's match status
// Listen to pool state changes
// Listen to photo prompts
```

**Chat Screen:**

```javascript
// Real-time message updates
// Photo sharing notifications
```

**Reveal Screen:**

```javascript
// Match reveal status
// Partner reveal decisions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Firebase project with Authentication, Firestore, Storage, and Functions enabled
- Xcode (for iOS simulator) or Android Studio (for Android emulator)
- Expo CLI (`npm install -g expo-cli`)
- Firebase CLI (`npm install -g firebase-tools`)

### Firebase Configuration

#### 1. Firebase Project Setup

```powershell
# Login and initialize project
firebase login
firebase init
```

#### 2. Firestore Database Setup

Create the following composite indexes in Firestore Console:

```javascript
// Collection: matches
// Fields: participants (array), createdAt (descending)

// Collection: messages
// Fields: matchId (ascending), createdAt (ascending)

// Collection: userPools
// Fields: userId (ascending), poolType (ascending), createdAt (descending)
```

#### 3. Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null &&
                     exists(/databases/$(database)/documents/matches/$(userId + '_' + request.auth.uid)) ||
                     exists(/databases/$(database)/documents/matches/$(request.auth.uid + '_' + userId));
    }
  }
}
```

#### 4. Environment Configuration

Create environment files:

**app/.env:**

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**server/.env:**

```
OPENAI_API_KEY=your_openai_key_for_content_moderation
FIREBASE_SERVICE_ACCOUNT=path_to_service_account.json
```

### Mobile App (Expo)

```powershell
cd app
npm install
npm run start
# Press i for iOS simulator or scan the QR code with Expo Go.
```

### Backend Server (Cloud Functions)

```powershell
cd server
npm install
npm run build
firebase deploy --only functions
```

Additional scripts:

- `npm run typecheck` – TypeScript validation
- `npm run lint` – ESLint with Expo presets
- `npm run test` – Jest testing

### Backend Stub (Express + TypeScript)

```powershell
cd server
npm install
npm run dev
# API available at http://localhost:4000
```

### Environment Variables

```javascript
// .env file needed:
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```

## 📊 State Management

### AppStateContext

```javascript
// AppStateContext.tsx manages:
- User profile
- Current pairing status
- Prompt data
- Match information
```

### Navigation Props

```typescript
type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Chat: undefined;
  Reveal: { demo?: boolean; bothRevealed?: boolean };
  Friends: undefined;
  Profile: undefined;
  Settings: undefined;
};
```

## 🔐 Security & Safety Considerations

### Photo Privacy

- Photos encrypted in storage
- Auto-deletion after reveal window
- No access without photo sharing
- Back camera enforcement
- NSFW content detection and automatic removal

### User Safety & Moderation

**Blocking System:**

- Users can block others from all interactions
- Blocked users cannot match, message, or view profiles
- Blocks are persistent across app sessions
- Block list management in user settings

**Reporting System:**

- Report inappropriate content (photos, messages, profiles)
- Multiple report categories (harassment, spam, fake profiles, etc.)
- Evidence collection (screenshots, message text)
- Escalation system for severe violations

**Content Moderation:**

```javascript
// AI/ML Content Filtering
- Photo content analysis for NSFW/inappropriate content
- Text analysis for harassment, hate speech, spam
- Behavioral pattern detection for fake accounts
- Risk scoring system for user safety assessment
```

**Moderation Actions:**

- Warning system for minor violations
- Temporary bans (1-30 days) for moderate violations
- Permanent bans for severe violations
- Content removal and account suspension
- Appeals process for disputed actions

**Safety Features:**

- Real-time content scanning before message/photo delivery
- User verification to prevent fake accounts
- Rate limiting to prevent spam and abuse
- Emergency contact system for serious threats

### Data Protection & Privacy

- GDPR compliance with data export/deletion
- User data encryption at rest and in transit
- Anonymous matching algorithms
- Secure Firebase Authentication
- Minimal data collection principle
- Clear privacy policy and consent management

### Technical Security

```javascript
// Firestore Security Rules
- User can only read/write their own data
- Block checking before allowing interactions
- Report submission validation and rate limiting
- Photo access control based on reveal eligibility
- Admin-only access to moderation collections
```

**API Security:**

- Rate limiting on all endpoints
- Input validation and sanitization
- Authentication token verification
- SQL injection prevention
- XSS protection for user-generated content

## 🚀 Next Implementation Steps

### Pre-Backend Integration

- [ ] Firebase project setup

## 🗂️ Retention & Capacity Planning

Retention policy (explicit):

- Matches and their Firestore documents will be deleted automatically after 3 days.
- Photos are stored just-in-time for the match/reveal window and must be deleted immediately after the reveal window closes or when the match expires (3-day rule).

Capacity summary (quick reference):

- Firestore persistent storage: estimate ~0.5 MB/user (profile, avatar, message metadata) → ~2k users per 1 GiB Spark limit if you keep data long-term.
- Cloud Storage (photos): with 2 photos/day at ~500 KB/photo → ~1 MB/day/user → ~5k users for a 5 GB free Storage cap at a daily peak.
- Firestore operations (reads/writes): likely bottleneck — expect ~1k DAU before reads/writes become constrained without optimization.

Practical note: because matches are deleted after 3 days and photos are ephemeral, persistent storage pressure is dramatically reduced — this should increase the number of users you can support on the free tier as long as you enforce deletion and limit heavy realtime listeners.

Recommended cleanup function behavior:

- Run `cleanupExpiredMatches()` hourly to find matches older than 3 days, delete their Firestore documents, and remove associated photo files from Storage.
- Use batched deletes and monitor invocation costs if you move to Blaze.

Add these to your deployment checklist so the free-tier estimates hold in practice.

- [ ] Firestore security rules
- [ ] Cloud Storage rules
- [ ] Cloud Functions deployment
- [ ] Analytics configuration

### Core Features

- [ ] Real-time matching system
- [ ] Photo upload/storage
- [ ] Chat messaging
- [ ] Friend system backend
- [ ] Pool timing logic
- [ ] Reveal access control

### Testing Requirements

- [ ] Pool timing accuracy
- [ ] Photo upload/download
- [ ] Real-time messaging
- [ ] Reveal logic
- [ ] Friend system
- [ ] Cross-timezone handling

---

This documentation provides a complete overview of SecretBuddy's functionality and architecture. Use this as a reference when implementing the Firebase backend integration.

**Questions for Backend Implementation:**

- Timezone handling strategy (UTC vs local)
- Photo compression and storage limits
- Matching algorithm preferences
- Real-time vs batch processing for pools
- Offline functionality requirements
