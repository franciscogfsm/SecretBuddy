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
 * Each step explains a key feature of the app
 *
 * For interactive steps with highlighted UI elements, set:
 * - targetElement: "element-id" - ID of the UI element to highlight (must match key in elementRefs)
 * - placement: "top" | "bottom" | "center" - Where to show the tooltip relative to the element
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to SecretBuddy",
    description:
      "Your anonymous photo-sharing adventure starts here. Let's take a quick tour to show you how everything works.",
    icon: EyeSlashIcon,
    iconType: "heroicon",
    placement: "center",
  },
  {
    id: "daily-prompt",
    title: "Daily Photo Prompts",
    description:
      "Every day at 6 PM, you'll receive a new creative prompt. Take a photo based on the theme and share it with your mystery buddy.",
    icon: CameraIcon,
    iconType: "heroicon",
    placement: "center",
  },
  {
    id: "mystery-pairing",
    title: "Mystery Pairing",
    description:
      "Tap the button below to join a pool and get paired with a random buddy from around the world.",
    icon: UserGroupIcon,
    iconType: "heroicon",
    placement: "top",
    targetElement: "pool-button", // This will highlight the actual pool button
  },
  {
    id: "photo-submission",
    title: "Submit Your Photo",
    description:
      "Once you take or select a photo, submit it before the deadline. Your buddy will receive it, and you'll get theirs too.",
    icon: PaperAirplaneIcon,
    iconType: "heroicon",
    placement: "center",
  },
  {
    id: "reveal-time",
    title: "The Big Reveal",
    description:
      "After both submit, photos are revealed. React, chat with your buddy, and see their creative take on the prompt.",
    icon: EyeIcon,
    iconType: "heroicon",
    placement: "center",
  },
  {
    id: "points-streak",
    title: "Earn Points & Streaks",
    description:
      "Complete daily prompts to earn points, build your streak, and climb the leaderboard. Check your stats here!",
    icon: FireIcon,
    iconType: "heroicon",
    placement: "top",
    targetElement: "profile-button", // This will highlight the profile tab
  },
  {
    id: "hearts-system",
    title: "Hearts & Lives",
    description:
      "You have 5 hearts. Missing a prompt costs 1 heart. No hearts? You'll need to wait or earn more to continue playing.",
    icon: HeartIcon,
    iconType: "heroicon",
    placement: "center",
  },
  {
    id: "profile-customize",
    title: "Customize Your Profile",
    description:
      "Tap the profile button to add a photo, bio, and set your age visibility. Express yourself while staying anonymous.",
    icon: UserCircleIcon,
    iconType: "heroicon",
    placement: "top",
    targetElement: "profile-button", // This will highlight the profile tab
  },
  {
    id: "friends-feature",
    title: "Connect With Friends",
    description:
      "After revealing, you can add buddies as friends. Build your network and see their progress on the leaderboard.",
    icon: UserPlusIcon,
    iconType: "heroicon",
    placement: "center",
  },
  {
    id: "ready",
    title: "You're All Set",
    description:
      "That's everything you need to know. Remember to be creative, respectful, and have fun sharing moments with your mystery buddies.",
    icon: CheckCircleIcon,
    iconType: "heroicon",
    placement: "center",
  },
];
