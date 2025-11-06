# Onboarding Tutorial System

## Overview

A comprehensive first-time user experience with interactive tooltips and step-by-step guidance for new SecretBuddy users.

## Features

### 🎯 Automatic Detection

- Shows automatically for first-time users on HomeScreen
- Checks `hasCompletedOnboarding` flag in user profile
- Triggers after 1-second delay for smooth UI transition

### 🎨 Visual Components

- **Animated tooltips** with smooth fade-in/scale effects
- **Progress bar** showing current step
- **Step counter** (e.g., "3 / 10")
- **Icon indicators** for each tutorial step
- **Pulsing spotlight** effect (optional, for highlighting UI elements)
- **Blurred backdrop** for focus (iOS uses native blur, Android uses overlay)

### 📚 Tutorial Steps

Located in `app/src/constants/tutorialSteps.ts`:

1. **Welcome** - Introduction to the app
2. **Daily Photo Prompts** - Explains the daily prompt system
3. **Mystery Pairing** - How anonymous pairing works
4. **Photo Submission** - How to submit photos
5. **The Big Reveal** - Explaining the reveal process
6. **Points & Streaks** - Gamification system
7. **Hearts System** - Lives and consequences
8. **Profile Customization** - Profile setup
9. **Friends Feature** - Adding buddies as friends
10. **Ready to Start** - Final encouragement

### 🎮 User Controls

- **Next button** - Advances to the next step
- **Skip Tutorial** - Dismisses tutorial entirely (marks as completed)
- **Get Started** - Final button that completes onboarding

## Implementation

### Core Components

#### `OnboardingTutorial.tsx`

Main tutorial component with:

- Modal overlay with blur effect
- Animated tooltip cards
- Progress indicator
- Navigation controls

#### `tutorialSteps.ts`

Tutorial content configuration:

```typescript
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  targetPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  placement?: "top" | "bottom" | "center";
}
```

#### `HomeScreen.tsx` Integration

```typescript
// State management
const [showOnboarding, setShowOnboarding] = useState(false);
const [onboardingStep, setOnboardingStep] = useState(0);

// Auto-show for first-time users
useEffect(() => {
  const checkOnboarding = async () => {
    if (!user?.uid || !firestoreProfile) return;

    if (!firestoreProfile.hasCompletedOnboarding) {
      setTimeout(() => setShowOnboarding(true), 1000);
    }
  };
  checkOnboarding();
}, [user?.uid, firestoreProfile]);
```

### Database Schema

#### UserProfile Interface

Added field to track onboarding completion:

```typescript
interface UserProfile {
  // ... existing fields
  hasCompletedOnboarding?: boolean; // Default: undefined (treated as false)
}
```

### Service Functions

#### `userService.ts`

Two new functions added:

```typescript
// Mark tutorial as complete
export const completeOnboarding = async (uid: string): Promise<void>

// Allow user to replay tutorial
export const resetOnboarding = async (uid: string): Promise<void>
```

## User Flow

```
New User Signs Up
       ↓
Profile Created (hasCompletedOnboarding: undefined)
       ↓
Opens HomeScreen
       ↓
Tutorial Detected (1s delay)
       ↓
Tutorial Modal Shows
       ↓
User Goes Through Steps
       ↓
User Completes or Skips
       ↓
hasCompletedOnboarding → true
       ↓
Tutorial Won't Show Again
```

## Customization

### Adding New Steps

Edit `app/src/constants/tutorialSteps.ts`:

```typescript
{
  id: "new-feature",
  title: "New Feature Title",
  description: "Detailed explanation...",
  icon: "rocket", // Any Ionicons name
  placement: "center",
}
```

### Styling

Theme colors used:

- Primary accent: `colors.accentTeal` (#2EE6A9)
- Background: `colors.surface` (#0B0520)
- Text: `colors.textPrimary` (#F5F2FF)
- Secondary text: `colors.textSecondary` (#B9B1EA)

### Spotlight Targeting (Future Enhancement)

To highlight specific UI elements:

```typescript
{
  // ... step config
  targetPosition: {
    x: 20,
    y: 100,
    width: 200,
    height: 60,
  },
  placement: "bottom", // Show tooltip below highlighted element
}
```

## Best Practices

### ✅ Do's

- Keep steps concise (max 2-3 sentences per step)
- Use friendly, conversational tone
- Include relevant emojis for visual interest
- Test on various screen sizes
- Consider user attention span (keep it under 10 steps)

### ❌ Don'ts

- Don't make tutorial mandatory with no skip option
- Don't show tutorial on every screen
- Don't use technical jargon
- Don't make steps too long or overwhelming
- Don't forget to update tutorial when features change

## Testing

### Manual Testing

1. Create a new user account
2. Verify tutorial shows automatically
3. Test "Next" button progression
4. Test "Skip Tutorial" button
5. Verify completion saves to Firestore
6. Reload app - confirm tutorial doesn't show again

### Reset Tutorial (for testing)

```typescript
import * as userService from "../services/userService";

// In your component
await userService.resetOnboarding(user.uid);
// Reload screen - tutorial will show again
```

## Future Enhancements

### Potential Improvements

- [ ] Interactive elements (tap to try features)
- [ ] Video/GIF demonstrations
- [ ] Contextual tooltips (show on first interaction)
- [ ] Progress persistence (resume interrupted tutorial)
- [ ] Different tutorials for different user segments
- [ ] Analytics tracking (which steps users skip)
- [ ] Localization support
- [ ] Replay button in settings/profile

## Files Modified

```
app/src/
├── components/
│   └── OnboardingTutorial.tsx          # NEW - Main tutorial component
├── constants/
│   └── tutorialSteps.ts                # NEW - Tutorial content
├── screens/
│   └── HomeScreen.tsx                  # MODIFIED - Integration
└── services/
    └── userService.ts                  # MODIFIED - Completion tracking
```

## Dependencies

- `expo-blur` (already installed) - Native blur effects
- `@expo/vector-icons` - Icon library
- `react-native` - Core animations and modals

## Troubleshooting

### Tutorial Not Showing

1. Check user profile: `console.log(firestoreProfile.hasCompletedOnboarding)`
2. Verify user is logged in: `console.log(user?.uid)`
3. Check 1-second delay hasn't been skipped
4. Ensure Firestore profile loads successfully

### Blur Effect Not Working

- **iOS**: Should work automatically with BlurView
- **Android**: Falls back to semi-transparent overlay (no native blur)

### Tutorial Shows Every Time

- Check if `completeOnboarding()` is being called
- Verify Firestore write permissions
- Check for cache invalidation issues

## Performance Considerations

- Tutorial only loads when needed (conditional rendering)
- Animations use `useNativeDriver` when possible
- Firestore writes are batched with other profile updates
- Profile cache is invalidated after completion

---

**Created**: November 6, 2025  
**Last Updated**: November 6, 2025  
**Version**: 1.0.0
