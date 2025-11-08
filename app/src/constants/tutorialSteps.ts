import { TutorialStep } from "../components/OnboardingTutorial";
import {
  EyeSlashIcon,
  CameraIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  EyeIcon,
  FireIcon,
  HeartIcon,
  UserCircleIcon,
  UserPlusIcon,
  CheckCircleIcon,
} from "react-native-heroicons/outline";

/**
 * Onboarding tutorial steps for first-time users
 * Each step explains a key feature of the app with smooth card transitions
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to SecretBuddy",
    description:
      "Share photos anonymously with mystery buddies worldwide. Get a daily prompt, snap a photo, and exchange it with someone random.",
    icon: EyeSlashIcon,
    iconType: "heroicon",
  },
  {
    id: "mystery-pairing",
    title: "Match with a Mystery Buddy",
    description:
      "Tap 'Join Pool' to get paired with someone from anywhere in the world. Stay completely anonymous until you both choose to reveal.",
    icon: UserGroupIcon,
    iconType: "heroicon",
  },
  {
    id: "reveal-time",
    title: "Exchange and Reveal Photos",
    description:
      "Once both of you submit your photos, they unlock instantly. React, chat, and see their creative take on the daily prompt.",
    icon: EyeIcon,
    iconType: "heroicon",
  },
  {
    id: "points-streak",
    title: "Build Streaks and Earn Points",
    description:
      "Complete daily prompts to grow your streak and earn points. Climb the leaderboard, unlock rewards, and keep your momentum going.",
    icon: FireIcon,
    iconType: "heroicon",
  },
  {
    id: "ready",
    title: "Ready to Start",
    description:
      "You're all set. Be creative, respectful, and have fun sharing moments with people from around the world.",
    icon: CheckCircleIcon,
    iconType: "heroicon",
  },
];
