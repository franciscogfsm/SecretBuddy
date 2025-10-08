import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Modal,
  Image,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";

import { CountryDropdown } from "../components/CountryDropdown";
import { GradientBackground } from "../components/GradientBackground";
import { MysteryCard } from "../components/MysteryCard";
import { PhotoViewModal } from "../components/PhotoViewModal";
import { PrimaryButton } from "../components/PrimaryButton";
import { TopHeader } from "../components/TopHeader";
import { useAppState } from "../store/AppStateContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { useAuth } from "../context/AuthContext";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import * as photoService from "../services/photoService";
import * as poolService from "../services/poolService";
import * as notificationService from "../services/notificationService";
import { PillOption } from "../components/PillOption";

type PairingStatus =
  | "waiting"
  | "submitting"
  | "submitted"
  | "pairing"
  | "paired"
  | "revealing";

export const HomeScreen = () => {
  const { prompt, buddy, profile, pairing, setProfile, setPairing } =
    useAppState();
  const { user } = useAuth();

  // Pre-load user profile immediately when entering HomeScreen
  // This ensures profile data is ready when user navigates to ProfileScreen
  const {
    profile: firestoreProfile,
    loading: profileLoading,
    points,
    streak,
  } = useUserProfile();

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const scrollRef = useRef<ScrollView>(null);
  const wasFocusedRef = useRef(false);

  // ✅ TIMEZONE FIX: All time checks use getUTCHours() to match Cloud Functions
  // ✅ SECURITY: Critical operations use Firestore server time (protects against device time changes)
  // ✅ DISPLAY: Show local time to user, but use UTC internally

  // Server time state (cached for 1 hour to reduce Firestore reads)
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [timeOffset, setTimeOffset] = useState<number>(0); // Server time - Device time

  // ⚡ Fetch cached server time offset on mount (only fetches from Firestore once per hour)
  useEffect(() => {
    const fetchServerTimeOffset = async () => {
      try {
        // Use cached offset (only hits Firestore once per hour)
        const offset = await poolService.getServerTimeOffset();

        setTimeOffset(offset);
        setServerTime(new Date(Date.now() + offset));
      } catch (error) {
        console.error("❌ Failed to fetch server time offset:", error);
      }
    };

    fetchServerTimeOffset();
  }, []);

  /**
   * Get current time adjusted with server offset
   * Uses device time + server offset to avoid constant Firestore reads
   */
  const getAdjustedTime = (): Date => {
    if (timeOffset === 0) {
      // Fallback to device time if offset not available
      return new Date();
    }
    // Device time + offset = server time equivalent
    return new Date(Date.now() + timeOffset);
  };

  /**
   * Convert UTC hour to local hour for display
   * Example: Pool 14h UTC → 15h Portugal (UTC+1)
   */
  const utcToLocalHour = (utcHour: number): number => {
    const now = new Date();
    const utcDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        utcHour,
        0,
        0
      )
    );
    return utcDate.getHours(); // Gets local hour
  };

  const getCurrentPhase = () => {
    // Use server-adjusted time instead of device time
    const now = getAdjustedTime();
    const utcHour = now.getUTCHours(); // keep UTC-based checks
    const localHour = now.getHours(); // local hour for user-facing phase rules

    // If it's midday-to-evening in user's local time, show waiting phase (matched phase)
    // (User requested that after 12:00 PM local time the UI enter waiting mode)
    if (localHour >= 12 && localHour < 21) {
      return "waiting";
    }

    // Otherwise fall back to UTC-based pool/reveal windows
    // Hourly pools from 10:00 to 17:00 UTC
    if (utcHour >= 10 && utcHour < 18) {
      return "pool-open"; // Pool open (current hour's pool)
    } else if (utcHour >= 21 && utcHour < 22) {
      return "reveal-window"; // 21:00-22:00 UTC: Identity reveal window
    } else {
      return "waiting"; // Outside pool hours
    }
  };

  const getCurrentPool = () => {
    // Use server-adjusted time instead of device time
    const now = getAdjustedTime();
    const currentHour = now.getUTCHours(); // ✅ USE UTC TIME

    // Return current hour pool (10h, 11h, 12h, 13h, 14h, 15h, 16h, 17h)
    if (currentHour >= 10 && currentHour < 18) {
      // Convert UTC hour to local hour for display
      const localHour = utcToLocalHour(currentHour);
      return `${localHour}h`; // Show local time to user
    }
    return null;
  };

  const getStatusMessage = () => {
    const phase = getCurrentPhase();
    const currentPool = getCurrentPool(); // Already returns local hour (e.g., "16h")

    switch (phase) {
      case "pool-open":
        if (currentPool) {
          const currentLocalHour = parseInt(currentPool);
          const nextLocalHour = currentLocalHour + 1;
          return `Pool ${currentPool} is open! Join to find your match (closes at ${nextLocalHour}:00).`;
        }
        return "Join the current pool to find your match!";
      case "reveal-window":
        return "Identity reveal window is open! Discover your mystery buddy.";
      case "waiting":
        // Use server-adjusted time but evaluate user-facing phase by local hour
        const now = getAdjustedTime();
        const localHour = now.getHours(); // local hour for user-facing messages
        const localStartHour = utcToLocalHour(10);

        if (localHour < 12) {
          // Before local midday: show pairing start time
          return `Pools open at ${localStartHour}:00. Come back soon!`;
        } else if (localHour >= 12 && localHour < 21) {
          // After local noon and before evening: show next pairing time
          return `Pools open at ${localStartHour}:00. Come back soon!`;
        } else if (localHour >= 21 && localHour < 22) {
          const localRevealHour = utcToLocalHour(21);
          return `Reveal window is open! (${localRevealHour}:00-${(
            localRevealHour + 1
          )
            .toString()
            .padStart(2, "0")}:00)`;
        } else {
          return `Pools closed. Next pool opens at ${localStartHour}:00.`;
        }
      default:
        return "Welcome to SecretBuddy!";
    }
  };
  const [timeUntilWindow, setTimeUntilWindow] = useState<string>("");
  const [pulseAnim] = useState(new Animated.Value(1));
  const [timePulse] = useState(() => new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [floatAnim] = useState(new Animated.Value(0));
  const [glowAnim] = useState(new Animated.Value(0.7));
  const [receivedPhotoAnim] = useState(new Animated.Value(1)); // Animation for received photo card
  const [showPairingSuccess, setShowPairingSuccess] = useState(false);
  const [isPromptTime, setIsPromptTime] = useState(false);
  const [nextPromptTime, setNextPromptTime] = useState<Date | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  // Control photo state - will be connected to backend
  const [receivedPhotos, setReceivedPhotos] = useState<
    photoService.PhotoChallenge[]
  >([]);
  const [selectedPhoto, setSelectedPhoto] =
    useState<photoService.PhotoChallenge | null>(null);
  const [hasReceivedPhoto, setHasReceivedPhoto] = useState(true); // Will be dynamically set based on backend data
  const [hasViewedPhoto, setHasViewedPhoto] = useState(false); // Track if user viewed the received photo
  const [hasSentPhoto, setHasSentPhoto] = useState(false); // Track if user sent a photo

  // Demo photo URL - in production this will come from backend
  const receivedPhotoUrl =
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"; // Example mountain view

  // Ghosting warning state
  const [showGhostingWarning, setShowGhostingWarning] = useState(true);

  // Pool system state
  const [currentPool, setCurrentPool] = useState<poolService.Pool | null>(null);
  const [currentPair, setCurrentPair] = useState<poolService.Pair | null>(null);
  const [isInPool, setIsInPool] = useState(false);
  const [poolLoading, setPoolLoading] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<
    "friends" | "country" | "world" | null
  >(null);

  // Photo notification state
  const [photoPrompt, setPhotoPrompt] = useState("");
  const [showPairedModal, setShowPairedModal] = useState(false);

  // Current photo prompt (stable - doesn't change on every render)
  const [currentPromptIndex] = useState(() => Math.floor(Math.random() * 8));

  // Skip tracking - only once per day
  const [hasSkippedToday, setHasSkippedToday] = useState(false);
  const [lastSkipDate, setLastSkipDate] = useState<string | null>(null);

  // Photo challenge timestamp - track when the challenge was created
  const [photoChallengeCreatedAt, setPhotoChallengeCreatedAt] = useState<
    number | null
  >(null);
  // Countdown timer state - calculated based on actual timestamp
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  // Show photo challenge card (appears after notification)
  const [showPhotoChallengeCard, setShowPhotoChallengeCard] = useState(false);

  // Random photo prompts that appear throughout the day
  const randomPrompts = [
    "Share the view from your window",
    "Show what you're currently looking at",
    "Show your current surroundings",
    "Take a photo of what you're drinking",
    "Snap your workspace or study area",
    "Photograph your favorite nearby object",
    "Share what you're having for your meal",
    "Show your pet or a plant in your space",
  ];

  // Camera function for back camera only (no selfies allowed)
  const takeBackPhoto = async () => {
    // Simple reminder modal instead of alert
    setShowCameraModal(true);
  };

  const handleCameraConfirm = async () => {
    try {
      setShowCameraModal(false);
      // Small delay to ensure modal closes before opening camera
      setTimeout(async () => {
        await openCamera();
      }, 200);
    } catch (error) {
      Alert.alert("Error", "Failed to open camera. Please try again.");
    }
  };

  const openCamera = async () => {
    try {
      // Check current camera permissions first
      let cameraPermission = await ImagePicker.getCameraPermissionsAsync();

      // Only request if not already granted
      if (cameraPermission.status !== "granted") {
        cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      }

      if (cameraPermission.status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "SecretBuddy needs camera access to share photos with your mystery buddy. Your photos are encrypted and kept anonymous until reveal time.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Go to Settings",
              onPress: () => {
                // On iOS, this would open settings - implementation depends on platform
              },
            },
          ]
        );
        return;
      }

      // Launch camera with back camera only (no selfie camera)
      let result;
      try {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          cameraType: ImagePicker.CameraType.back, // Force back camera
        });
      } catch (cameraError: any) {
        Alert.alert(
          "Camera Error",
          "Unable to access camera. Please check your permissions and try again."
        );
        return;
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const photoUri = result.assets[0].uri;

        try {
          console.log("📤 Starting photo upload...");

          // TESTING: Always use friend's UID for photo challenges
          // This overrides any buddy pairing to test photo sharing
          const buddyId = "u4FhcyXndsRiAjTK2VcC0dUhU643";

          console.log("🔍 Buddy state:", buddy);
          console.log("🎯 Sending photo to buddyId:", buddyId);
          if (!buddyId || !user) {
            Alert.alert(
              "Error",
              "No buddy found. Please pair with someone first."
            );
            return;
          }

          // Upload photo to Firebase Storage
          const { downloadURL, storagePath } = await photoService.uploadPhoto(
            photoUri,
            user.uid,
            buddyId
          );

          // Send photo challenge with current prompt
          const currentPrompt = randomPrompts[currentPromptIndex];
          await photoService.sendPhotoChallenge(
            user.uid,
            buddyId,
            downloadURL,
            currentPrompt,
            storagePath
          );

          setHasSentPhoto(true); // Mark photo as sent

          // Hide photo challenge card after sending
          setShowPhotoChallengeCard(false);
          setPhotoChallengeCreatedAt(null);

          // Clear the stored photo challenge data
          try {
            await AsyncStorage.removeItem("photoChallengeData");
            console.log("✅ Photo challenge cleared after sending");
          } catch (error) {
            console.error("Error clearing photo challenge:", error);
          }

          console.log("✅ Photo challenge sent successfully");

          // Success - card will disappear automatically
        } catch (error) {
          console.error("❌ Error sending photo:", error);
          Alert.alert(
            "Upload Failed",
            "Could not send photo. Please check your connection and try again.",
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Unable to access camera. Please check your permissions and try again."
      );
    }
  };

  // Send photo from notification modal
  const sendPhotoFromNotification = async () => {
    if (!user?.uid || !currentPair) {
      Alert.alert("Error", "No active pair found");
      return;
    }

    try {
      // Get camera permissions
      let cameraPermission = await ImagePicker.getCameraPermissionsAsync();
      if (cameraPermission.status !== "granted") {
        cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      }

      if (cameraPermission.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to send photos"
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        cameraType: ImagePicker.CameraType.back,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const photoUri = result.assets[0].uri;

        // Get partner ID
        const partnerId = poolService.getPartnerIdFromPair(
          currentPair,
          user.uid
        );

        if (!partnerId) {
          Alert.alert("Error", "Could not find partner");
          return;
        }

        // Upload and send photo
        console.log("📤 Uploading photo from notification...");
        const { downloadURL, storagePath } = await photoService.uploadPhoto(
          photoUri,
          user.uid,
          partnerId
        );

        // Send photo with bypass flag (notification already validated timing)
        await photoService.sendPhotoChallenge(
          user.uid,
          partnerId,
          downloadURL,
          photoPrompt,
          storagePath,
          currentPair.id,
          true // bypassPhotoWindow = true
        );

        // Hide photo challenge card after sending
        setShowPhotoChallengeCard(false);
        setPhotoChallengeCreatedAt(null);
        await AsyncStorage.removeItem("photoChallengeData");

        console.log("✅ Photo sent successfully from notification");
      }
    } catch (error) {
      console.error("❌ Error sending photo from notification:", error);
      Alert.alert("Error", "Failed to send photo. Please try again.");
    }
  };

  // Load received photos when screen loads
  useEffect(() => {
    if (!user) return;

    // Use real-time listener instead of polling
    const unsubscribe = photoService.subscribeToUnviewedPhotos(
      user.uid,
      (photos) => {
        setReceivedPhotos(photos);
        setHasReceivedPhoto(photos.length > 0);
      }
    );

    // Cleanup listener on unmount or user change
    return unsubscribe;
  }, [user]);

  // Load current pool and pair status
  useEffect(() => {
    const loadPoolStatus = async () => {
      if (!user) return;

      try {
        // Get current pool
        const pool = await poolService.getCurrentPool();
        setCurrentPool(pool);

        if (pool) {
          // Check if user is in this pool and get their game mode
          const poolUserData = await poolService.getUserPoolData(
            user.uid,
            pool.id
          );
          if (poolUserData) {
            setIsInPool(true);
            setSelectedPriority(poolUserData.gameMode);
          } else {
            setIsInPool(false);
            setSelectedPriority(null);
          }
        }

        // Get current pair (if any)
        const pair = await poolService.getMyCurrentPair(user.uid);
        setCurrentPair(pair);
      } catch (error) {
        console.error("Error loading pool status:", error);
      }
    };

    loadPoolStatus();

    // Poll for pool updates every 2 minutes (reduced from 30s to save reads)
    const interval = setInterval(loadPoolStatus, 120000);
    return () => clearInterval(interval);
  }, [user, isFocused]);

  // Handlers for photo viewing
  const handleViewPhoto = async (photoId: string) => {
    try {
      console.log("📸 User clicked 'Got it' - Deleting photo:", photoId);

      // Mark as viewed
      await photoService.markPhotoAsViewed(photoId);

      // Delete the photo immediately
      await photoService.deletePhotoChallenge(photoId);

      console.log("✅ Photo viewed and deleted:", photoId);

      setHasViewedPhoto(true);

      // Close modal immediately
      handleClosePhotoModal();

      // Reload photos to update the list (will show remaining photos if any)
      if (user) {
        const photos = await photoService.getUnviewedPhotos(user.uid);

        // Filter for 4-hour window
        const now = Date.now();
        const FOUR_HOURS = 4 * 60 * 60 * 1000;
        const recentPhotos = photos.filter((photo) => {
          if (photo.timestamp) {
            const photoTime = photo.timestamp.toMillis
              ? photo.timestamp.toMillis()
              : photo.timestamp;
            const age = now - photoTime;
            return age < FOUR_HOURS;
          }
          return true;
        });

        setReceivedPhotos(recentPhotos);
        setHasReceivedPhoto(recentPhotos.length > 0);

        console.log(
          `📊 Photos remaining after deletion: ${recentPhotos.length}`
        );
      }
    } catch (error) {
      console.error("❌ Error viewing/deleting photo:", error);
      // Close modal even on error
      handleClosePhotoModal();
    }
  };

  const handleOpenPhotoModal = (photo: photoService.PhotoChallenge) => {
    setSelectedPhoto(photo);
    setShowPhotoViewer(true);
  };

  const handleClosePhotoModal = () => {
    setShowPhotoViewer(false);
    setSelectedPhoto(null);
  };

  useEffect(() => {
    const checkPromptTime = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Only show prompts during matched phase (12 PM - 9 PM)
      const isMatchedPhase = currentHour >= 12 && currentHour < 21;

      if (
        (isMatchedPhase && pairing.phase === "matched") ||
        currentHour === 2
      ) {
        // Simulate random prompt times (for demo, let's say every hour at random minutes)
        const promptTimes = [2, 13, 15, 17, 19]; // 2 AM (temp), 1 PM, 3 PM, 5 PM, 7 PM
        const isPromptHour = promptTimes.includes(currentHour);
        const isPromptMinute = currentMinute >= 0 && currentMinute <= 30; // 30-minute window

        setIsPromptTime(isPromptHour && isPromptMinute);

        if (isPromptHour && isPromptMinute) {
          const nextPrompt = new Date(now);
          nextPrompt.setMinutes(30); // Prompt ends after 30 minutes
          setNextPromptTime(nextPrompt);
        }
      } else {
        setIsPromptTime(false);
        setNextPromptTime(null);
      }
    };

    const checkDailyWindow = () => {
      const now = new Date();
      const currentHour = now.getHours();

      // Pairing pool: 9 AM - 12 PM
      const isPairingTime = currentHour >= 9 && currentHour < 12;

      // Reveal window: 9 PM - 10 PM
      const isRevealTime = currentHour >= 21 && currentHour < 22;

      // Calculate time until next window
      let nextWindow = new Date();
      let timeText = "";

      if (currentHour < 9) {
        // Before pairing window (9:00 UTC = 10:00 Portugal)
        nextWindow.setHours(9, 0, 0, 0);
        const localPairingHour = utcToLocalHour(9);
        timeText = `Pairing opens at ${localPairingHour
          .toString()
          .padStart(2, "0")}:00`;
      } else if (currentHour >= 9 && currentHour < 12) {
        // During pairing window
        timeText = "Pairing pool is open!";
      } else if (currentHour >= 12 && currentHour < 21) {
        // After pairing, before reveal (21:00 UTC = 22:00 Portugal)
        nextWindow.setHours(21, 0, 0, 0);
        const localRevealHour = utcToLocalHour(21);
        timeText = `Reveal opens at ${localRevealHour
          .toString()
          .padStart(2, "0")}:00`;
      } else if (currentHour >= 21 && currentHour < 22) {
        // During reveal window (21:00-22:00 UTC = 22:00-23:00 Portugal)
        const localRevealHour = utcToLocalHour(21);
        timeText = `Reveal window is open! (${localRevealHour
          .toString()
          .padStart(2, "0")}:00-${(localRevealHour + 1)
          .toString()
          .padStart(2, "0")}:00)`;
      } else {
        // After reveal, next day pairing (9:00 UTC next day)
        nextWindow.setDate(nextWindow.getDate() + 1);
        nextWindow.setHours(9, 0, 0, 0);
        const localPairingHour = utcToLocalHour(9);
        timeText = `Next pairing at ${localPairingHour
          .toString()
          .padStart(2, "0")}:00`;
      }

      setTimeUntilWindow(timeText);
    };

    checkDailyWindow();
    checkPromptTime();

    // ⚡ Check every 10 minutes to reduce Firestore reads (windows change every hour, so 10min is safe)
    const interval = setInterval(() => {
      checkDailyWindow();
      checkPromptTime();
    }, 600000); // Check every 10 minutes (600000ms = 10min)

    return () => clearInterval(interval);
  }, [pairing]);

  useEffect(() => {
    if (pairing.phase === "searching") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }

    // Animate prompt card when submission is open
    if (pairing.phase === "submission-open") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [pairing.phase, pulseAnim, scaleAnim]);

  // Add floating animation for prompt box
  useEffect(() => {
    if (isPromptTime) {
      // Floating animation - slower and less frequent
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -6,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow animation - slower
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.7,
            duration: 3000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      floatAnim.setValue(0);
      glowAnim.setValue(0.7);
    }
  }, [isPromptTime, floatAnim, glowAnim]);

  // Pulsate the reveal countdown when the user has sent all photos and is waiting for reveal
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;

    const photosRemaining =
      currentPair && poolService.isInPhotoWindow(currentPair, timeOffset)
        ? currentPair.maxPhotos -
          poolService.getMyPhotoCount(currentPair, user?.uid || "")
        : 1;

    if (currentPair && photosRemaining <= 0) {
      // Very subtle pulse on the time text (almost imperceptible)
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(timePulse, {
            toValue: 1.01,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(timePulse, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      // Reset
      timePulse.setValue(1);
    }

    return () => {
      if (anim) anim.stop();
      timePulse.setValue(1);
    };
  }, [currentPair, user?.uid, timePulse]);

  // Register for push notifications and setup listeners
  useEffect(() => {
    // Register for push tokens ONLY if user is logged in
    if (user?.uid) {
      notificationService.registerForPushNotifications(user.uid);
    }

    // Listen for notifications ALWAYS (even without login) - will save to AsyncStorage
    const notificationListener =
      notificationService.addNotificationReceivedListener(
        async (notification) => {
          console.log("📩 Notification received:", notification);
          const data = notification.request.content.data || {};
          const type = data.type as string | undefined;
          const prompt = data.prompt as string | undefined;

          // AUTO-SHOW: Photo challenge card appears automatically when notification arrives
          if (type === "photo_challenge") {
            console.log(
              "📬 Notification received in foreground - AUTO-SHOWING card!"
            );

            // Use prompt from notification or fallback to random
            const challengePrompt =
              prompt ||
              randomPrompts[Math.floor(Math.random() * randomPrompts.length)];

            // IMPORTANT: Use timestamp from notification (sent by Cloud Functions)
            const timestamp = data.timestamp
              ? Number(data.timestamp)
              : Date.now();
            console.log("⏰ Using timestamp from notification:", timestamp);

            // Set prompt and timestamp (will work even without login)
            setPhotoPrompt(challengePrompt);
            setPhotoChallengeCreatedAt(timestamp);
            setShowPhotoChallengeCard(true);

            // Save to AsyncStorage (persist across logout/login)
            try {
              await AsyncStorage.setItem(
                "photoChallengeData",
                JSON.stringify({
                  prompt: challengePrompt,
                  timestamp,
                  poolId: data.poolId || "",
                })
              );
              console.log(
                "✅ Photo challenge saved to AsyncStorage (will show after login if not logged in)"
              );
            } catch (error) {
              console.error("❌ Failed to save photo challenge:", error);
            }
          }
        }
      );

    // Listen for notification taps (when app is in background) - ALWAYS active
    const responseListener =
      notificationService.addNotificationResponseReceivedListener(
        async (response) => {
          console.log("👆 Notification tapped:", response);
          const data = response.notification.request.content.data || {};
          const type = data.type as string | undefined;
          const prompt = data.prompt as string | undefined;
          const photoId = data.photoId as string | undefined;

          // Photo challenge notification - show Photo Challenge Card
          if (type === "photo_challenge") {
            // Use prompt from notification or fallback to random
            const challengePrompt =
              prompt ||
              randomPrompts[Math.floor(Math.random() * randomPrompts.length)];

            console.log(
              "🔔 NOTIFICATION TAPPED - Showing Photo Challenge Card"
            );
            console.log("  Type:", type);
            console.log("  Prompt from notification:", prompt);
            console.log("  Final prompt:", challengePrompt);

            // IMPORTANT: Use timestamp from notification (sent by Cloud Functions)
            const timestamp = data.timestamp
              ? Number(data.timestamp)
              : Date.now();
            console.log("⏰ Using timestamp from notification:", timestamp);

            // Set prompt and timestamp (will work even without login)
            setPhotoPrompt(challengePrompt);
            setPhotoChallengeCreatedAt(timestamp);
            setShowPhotoChallengeCard(true);

            // Save to AsyncStorage (persist across logout/login)
            try {
              await AsyncStorage.setItem(
                "photoChallengeData",
                JSON.stringify({
                  prompt: challengePrompt,
                  timestamp,
                  poolId: data.poolId || "",
                })
              );
              console.log("✅ Photo challenge saved to AsyncStorage");
            } catch (error) {
              console.error("❌ Failed to save photo challenge:", error);
            }
          }

          // Photo received notification - open PhotoViewModal
          if (type === "photo_received" && photoId) {
            try {
              console.log("📬 Loading received photo:", photoId);
              const photo = await photoService.getPhotoById(photoId);
              if (photo) {
                setSelectedPhoto(photo);
                setShowPhotoViewer(true);
              }
            } catch (error) {
              console.error("❌ Error loading photo:", error);
              Alert.alert("Error", "Could not load photo");
            }
          }
        }
      );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [user?.uid]);

  // Check if pair was created (for showing "Paired!" modal)
  useEffect(() => {
    if (!user?.uid) return;

    let checkInterval: NodeJS.Timeout;
    if (isInPool && !currentPair) {
      // Poll every 15 seconds to check if pairing happened (reduced from 5s to save reads)
      checkInterval = setInterval(async () => {
        const pair = await poolService.getMyCurrentPair(user.uid);
        if (pair) {
          setCurrentPair(pair);
          setShowPairedModal(true);
          // Auto-hide modal after 3 seconds
          setTimeout(() => setShowPairedModal(false), 3000);
        }
      }, 5000);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [isInPool, currentPair, user?.uid]);

  // Auto-leave pool if past pool hours (after 17h Portugal time) and not paired
  useEffect(() => {
    if (!user?.uid || !isInPool || currentPair) return;

    const checkPoolHours = async () => {
      try {
        const now = getAdjustedTime();
        const portugalTime = new Date(now.getTime() + 1 * 60 * 60 * 1000);
        const hour = portugalTime.getUTCHours();

        // If past pool hours (17h or later) and still in pool without pair
        if (hour >= 17 && isInPool && !currentPair && currentPool) {
          console.log("⏰ Past pool hours - auto-leaving pool");
          await poolService.leavePool(user.uid, currentPool.id);
          setIsInPool(false);
          setSelectedPriority(null);
          setCurrentPool(null);
        }
      } catch (error) {
        console.error("❌ Error checking pool hours:", error);
      }
    };

    // Check immediately
    checkPoolHours();

    // Check every minute
    const interval = setInterval(checkPoolHours, 60000);

    return () => clearInterval(interval);
  }, [user?.uid, isInPool, currentPair, currentPool, getAdjustedTime]);

  // Restore photo challenge from AsyncStorage on mount (ALWAYS, even without login)
  useEffect(() => {
    const restorePhotoChallenge = async () => {
      try {
        const savedData = await AsyncStorage.getItem("photoChallengeData");
        if (!savedData) return;

        const { prompt, timestamp, poolId } = JSON.parse(savedData);
        const elapsed = Date.now() - timestamp;
        const FIVE_MINUTES = 5 * 60 * 1000;

        // If less than 5 minutes elapsed, restore the challenge
        if (elapsed < FIVE_MINUTES) {
          console.log(
            "📸 Restoring photo challenge from storage (user logged in:",
            !!user?.uid,
            ")"
          );
          setPhotoPrompt(prompt);
          setPhotoChallengeCreatedAt(timestamp);
          setShowPhotoChallengeCard(true);
        } else {
          // Clean up expired challenge
          await AsyncStorage.removeItem("photoChallengeData");
          console.log("🧹 Removed expired photo challenge");
        }
      } catch (error) {
        console.error("❌ Failed to restore photo challenge:", error);
      }
    };

    restorePhotoChallenge();
  }, [user?.uid]); // Re-run when user logs in to show saved challenge

  // Countdown timer for photo challenge card
  useEffect(() => {
    if (!showPhotoChallengeCard || !photoChallengeCreatedAt) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - photoChallengeCreatedAt;
      const FIVE_MINUTES = 5 * 60 * 1000;
      const remaining = Math.max(0, FIVE_MINUTES - elapsed);
      const remainingSeconds = Math.floor(remaining / 1000);

      setTimeRemaining(remainingSeconds);

      // Hide card when time expires
      if (remainingSeconds <= 0) {
        setShowPhotoChallengeCard(false);
        setPhotoChallengeCreatedAt(null);
        AsyncStorage.removeItem("photoChallengeData");
        console.log("⏰ Photo challenge expired");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showPhotoChallengeCard, photoChallengeCreatedAt]);

  // Auto-scroll to top when tab is tapped again
  useFocusEffect(
    React.useCallback(() => {
      if (wasFocusedRef.current && isFocused) {
        // User tapped the same tab again, scroll to top
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
      wasFocusedRef.current = isFocused;
    }, [isFocused])
  );

  const handleStartPairing = () => {
    if (!currentPool) {
      Alert.alert(
        "No Pool Available",
        "Please wait for the next pool window to open."
      );
      return;
    }

    if (isInPool) {
      Alert.alert("Already Joined", "You're already in this pool!");
      return;
    }

    // Show priority selection modal
    setShowPriorityModal(true);
  };

  const handlePrioritySelect = (priority: "friends" | "country" | "world") => {
    setSelectedPriority(priority);
  };

  const handleContinueWithPriority = async () => {
    if (!user || !currentPool || !selectedPriority) return;

    setShowPriorityModal(false);
    setPoolLoading(true);

    try {
      await poolService.joinPool(user.uid, currentPool.id, selectedPriority);
      setIsInPool(true);
    } catch (error) {
      console.error("Error joining pool:", error);
      Alert.alert("Error", "Failed to join pool. Please try again.");
    } finally {
      setPoolLoading(false);
    }
  };

  const handleLeavePool = async () => {
    if (!user || !currentPool) return;

    Alert.alert("Leave Pool?", "Are you sure you want to leave this pool?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setPoolLoading(true);
          try {
            await poolService.leavePool(user.uid, currentPool.id);
            setIsInPool(false);
            setSelectedPriority(null);
          } catch (error) {
            console.error("Error leaving pool:", error);
            Alert.alert("Error", "Failed to leave pool. Please try again.");
          } finally {
            setPoolLoading(false);
          }
        },
      },
    ]);
  };

  const handlePairingPress = () => {
    console.log(
      "🔘 Button pressed! isInPool:",
      isInPool,
      "currentPair:",
      !!currentPair,
      "poolLoading:",
      poolLoading
    );

    if (currentPair && poolService.isRevealTime(currentPair)) {
      // Navigate to reveal screen
      navigation.navigate("Reveal" as never);
      return;
    }

    // If user already has a pair, don't allow leaving pool
    if (currentPair) {
      // Just show a message - they're already paired
      Alert.alert(
        "Already Paired! 🎉",
        "You're already matched with a mystery buddy. Wait for the reveal time!",
        [{ text: "OK" }]
      );
      return;
    }

    if (isInPool) {
      // Show option to leave pool (only if not paired yet)
      console.log("📤 Calling handleLeavePool");
      handleLeavePool();
    } else {
      // Show option to join pool
      console.log("📥 Calling handleStartPairing");
      handleStartPairing();
    }
  };

  const getStatusText = () => {
    // Server-adjusted time
    const now = getAdjustedTime();
    const portugalTime = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const hour = portugalTime.getUTCHours();
    const localStartHour = 9; // Pools start at 9h Portugal time

    // Check if past pool hours (after 17h)
    if (hour >= 17 && !currentPair) {
      return "Pools closed for today. Come back tomorrow at 9:00!";
    }

    if (currentPair) {
      if (poolService.isRevealTime(currentPair)) {
        return "🎉 Reveal time! See who your buddy is.";
      }
      if (poolService.isInPhotoWindow(currentPair, timeOffset)) {
        const photosRemaining =
          currentPair.maxPhotos -
          poolService.getMyPhotoCount(currentPair, user?.uid || "");
        if (photosRemaining <= 0) {
          return "Wait for the reveal";
        }
        return `Send ${photosRemaining} more photo${
          photosRemaining !== 1 ? "s" : ""
        } during photo window.`;
      }

      // If pair exists but we're after reveal window (waiting for next day)
      if (hour >= 12) {
        return `Pools open at ${localStartHour}:00. Come back soon!`;
      }

      // Before photo window
      return "Paired! Photo window opens soon.";
    }

    if (isInPool && currentPool) {
      // Calculate time until pairing (next hour)
      const currentHour = hour;
      const nextHour = currentHour + 1;

      // If next hour would be past pool hours, show different message
      if (nextHour > 17) {
        return "Pairing window closing soon...";
      }

      // Create date for next hour
      const nextPairingTime = new Date(portugalTime);
      nextPairingTime.setUTCHours(nextHour, 0, 0, 0);

      const timeUntilPairing =
        nextPairingTime.getTime() - portugalTime.getTime();
      const formattedTime = poolService.formatTimeRemaining(timeUntilPairing);

      return `Pairing in ${formattedTime}. Relax—we'll notify you!`;
    }

    if (currentPool) {
      return "Ready to find your mystery buddy?";
    }

    // Default waiting message after hours or before start
    if (hour >= 17 || hour < 9) {
      return `Pools open at ${localStartHour}:00. Come back tomorrow!`;
    }

    return "Pools open 9AM-5PM daily.";
  };

  const getButtonText = () => {
    if (poolLoading) {
      return "Loading...";
    }

    // Only show "Reveal Identity" during actual reveal window (21:00-22:00 UTC)
    if (currentPair && poolService.isRevealTime(currentPair, timeOffset)) {
      // Only if reveal window is actually open
      if (poolService.isRevealWindowOpen(timeOffset)) {
        return "Reveal Identity";
      }
    }

    // If user has a pair, show waiting message (don't show "Leave Pool")
    if (currentPair) {
      return "Paired - Waiting for Reveal";
    }

    // Only show "Leave Pool" if in pool but NOT paired yet
    if (isInPool) {
      return "Leave Pool";
    }

    if (currentPool) {
      return "Join Pool";
    }

    return "No Pool Available";
  };

  // Determine if user has sent all photos and is waiting for reveal
  let excitedForReveal = false;
  let statusMessage = getStatusText();
  if (currentPair && poolService.isInPhotoWindow(currentPair, timeOffset)) {
    const photosRemaining =
      currentPair.maxPhotos -
      poolService.getMyPhotoCount(currentPair, user?.uid || "");
    if (photosRemaining <= 0) {
      excitedForReveal = true;
    }
  }

  // Detect if current time is after today's reveal window (UTC)
  const isAfterReveal = (() => {
    try {
      const now = getAdjustedTime();
      const hour = now.getUTCHours();
      // Reveal window is 21:00-22:00 UTC; after reveal = >=22 or before pairing next day (<9)
      return hour >= 22 || hour < 9;
    } catch (e) {
      return false;
    }
  })();

  return (
    <GradientBackground gradient="midnight">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Received Photo from Mystery Buddy - TOP PRIORITY */}
        {hasReceivedPhoto && receivedPhotos.length > 0 && (
          <Animated.View
            style={[
              styles.receivedPhotoCard,
              {
                opacity: receivedPhotoAnim,
                transform: [
                  {
                    scale: receivedPhotoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                  {
                    translateY: receivedPhotoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.receivedPhotoHeader}>
              <View style={styles.receivedPhotoIcon}>
                <Ionicons name="images" size={24} color="#F97316" />
              </View>
              <View style={styles.receivedPhotoHeaderText}>
                <Text style={styles.receivedPhotoTitle}>
                  📸 Photo Received!
                </Text>
                <Text style={styles.receivedPhotoSubtitle}>
                  Your mystery buddy shared something!
                </Text>
              </View>
            </View>

            <View style={styles.receivedPhotoContent}>
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image" size={64} color="#6B7280" />
                <Text style={styles.photoPlaceholderText}>
                  Tap below to reveal mystery photo
                </Text>
                {/* Show remaining time */}
                {receivedPhotos.length > 0 && receivedPhotos[0].timestamp && (
                  <Text style={styles.photoTimeRemaining}>
                    {(() => {
                      const photoTime = receivedPhotos[0].timestamp.toMillis
                        ? receivedPhotos[0].timestamp.toMillis()
                        : receivedPhotos[0].timestamp;
                      const FOUR_HOURS = 4 * 60 * 60 * 1000;
                      const elapsed = Date.now() - photoTime;
                      const remaining = FOUR_HOURS - elapsed;

                      if (remaining <= 0) return "Expired";

                      const hours = Math.floor(remaining / (60 * 60 * 1000));
                      const minutes = Math.floor(
                        (remaining % (60 * 60 * 1000)) / (60 * 1000)
                      );

                      if (hours > 0) {
                        return `${hours}h ${minutes}m remaining`;
                      }
                      return `${minutes}m remaining`;
                    })()}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.viewPhotoButton}
                onPress={() => {
                  if (receivedPhotos.length > 0) {
                    handleOpenPhotoModal(receivedPhotos[0]);
                  }
                }}
              >
                <Ionicons name="eye" size={20} color="#FFFFFF" />
                <Text style={styles.viewPhotoButtonText}>Tap to View</Text>
                {receivedPhotos.length > 1 && (
                  <View style={styles.photoBadge}>
                    <Text style={styles.photoBadgeText}>
                      {receivedPhotos.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.receivedPhotoInfo}>
                <Text style={styles.receivedPhotoInfoText}>
                  📸 {receivedPhotos.length}{" "}
                  {receivedPhotos.length === 1 ? "photo" : "photos"} waiting •
                  ⏱️ 4 hours to view
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Photo Challenge Card - Shows after notification for 5 minutes */}
        {/* Always show if timer is active, regardless of received photos */}
        {showPhotoChallengeCard && (
          <View style={styles.photoChallengeCard}>
            {/* Glow border effect */}
            <View style={styles.photoChallengeGlowBorder} />

            {/* Header */}
            <View style={styles.photoChallengeHeader}>
              <View style={styles.photoChallengeHeaderLeft}>
                <View style={styles.photoChallengeIconContainer}>
                  <Ionicons
                    name="camera"
                    size={32}
                    color={colors.accentPurple}
                  />
                  <View style={styles.iconSparkle}>
                    <Ionicons
                      name="sparkles"
                      size={12}
                      color={colors.accentYellow}
                    />
                  </View>
                </View>
                <View>
                  <Text style={styles.photoChallengeTitle}>📸 Send Photo</Text>
                  <Text style={styles.photoChallengeSubtitle}>
                    Time to capture the moment!
                  </Text>
                </View>
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
              <Ionicons
                name="time"
                size={16}
                color={
                  timeRemaining < 60
                    ? colors.danger
                    : timeRemaining < 120
                    ? colors.accentPink
                    : colors.accentPurple
                }
              />
              <Text
                style={[
                  styles.photoChallengeTimerText,
                  {
                    color:
                      timeRemaining < 60
                        ? colors.danger
                        : timeRemaining < 120
                        ? colors.accentPink
                        : colors.accentPurple,
                  },
                ]}
              >
                {Math.floor(timeRemaining / 60)}:
                {(timeRemaining % 60).toString().padStart(2, "0")}
              </Text>
            </View>

            {/* Prompt Container */}
            <View style={styles.photoChallengePromptContainer}>
              <View style={styles.promptLabelRow}>
                <Text style={styles.photoChallengePromptLabel}>
                  Today's Prompt
                </Text>
              </View>
              <Text style={styles.photoChallengePromptText}>{photoPrompt}</Text>
              <View style={styles.promptAccentLine} />
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={styles.photoChallengeActionButton}
              onPress={sendPhotoFromNotification}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.photoChallengeActionText}>Open Camera</Text>
            </TouchableOpacity>

            {/* Helper text */}
            <Text style={styles.photoChallengeHelperText}>
              Use back camera only • No selfies allowed
            </Text>
          </View>
        )}

        {/* Reveal Time Card - Shows from reveal time (21:00 UTC / 22:00 PT) until midnight */}
        {/* ✅ Card persists until midnight (doesn't disappear after reveal window closes) */}
        {/* ✅ Button only active during reveal window (21:00-22:00 UTC / 22:00-23:00 PT) */}
        {currentPair &&
          poolService.isRevealTime(currentPair, timeOffset) &&
          poolService.canIReveal(currentPair, user?.uid || "") && (
            <Animated.View
              style={[
                styles.revealTimeCard,
                {
                  opacity: pulseAnim,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.revealTimeHeader}>
                <View style={styles.revealTimeIcon}>
                  <Ionicons name="eye" size={32} color="#FF4FB7" />
                </View>
                <View style={styles.revealTimeHeaderText}>
                  <Text style={styles.revealTimeTitle}>🎭 Reveal Time!</Text>
                  <Text style={styles.revealTimeSubtitle}>
                    Discover your mystery buddy's identity
                  </Text>
                </View>
              </View>

              <View style={styles.revealTimeContent}>
                {poolService.isRevealWindowOpen(timeOffset) ? (
                  <>
                    <Text style={styles.revealTimeMessage}>
                      The moment you've been waiting for! Discover who your
                      SecretBuddy really is and start chatting.
                    </Text>

                    <TouchableOpacity
                      style={styles.revealTimeButton}
                      onPress={() => navigation.navigate("Reveal" as never)}
                    >
                      <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                      <Text style={styles.revealTimeButtonText}>
                        Reveal & Chat
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.revealTimeMessage}>
                      Reveal window has closed for today, but you can still chat
                      with your buddy!
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.revealTimeButton,
                        { backgroundColor: colors.accentPink },
                      ]}
                      onPress={() =>
                        (navigation as any).navigate("MainTabs", {
                          screen: "Matches",
                        })
                      }
                    >
                      <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                      <Text style={styles.revealTimeButtonText}>Open Chat</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </Animated.View>
          )}

        {/* Pairing Status Card */}
        <Animated.View
          style={[
            styles.pairingCard,
            poolLoading && {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>
              {currentPair
                ? "Paired"
                : isInPool
                ? "In Pool"
                : "Daily Connection"}
            </Text>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: currentPair
                    ? colors.accentPink
                    : isInPool
                    ? colors.accentTeal
                    : colors.textSecondary,
                },
              ]}
            />
          </View>
          {!excitedForReveal && (
            <>
              <Text style={styles.statusText}>
                {isAfterReveal && currentPair ? timeUntilWindow : statusMessage}
              </Text>
              {/* Show selected mode when in pool */}
              {isInPool && selectedPriority && !currentPair && (
                <View style={styles.selectedModeContainer}>
                  <Ionicons
                    name={
                      selectedPriority === "friends"
                        ? "people"
                        : selectedPriority === "country"
                        ? "flag"
                        : "globe"
                    }
                    size={16}
                    color={colors.accentPurple}
                  />
                  <Text style={styles.selectedModeText}>
                    Mode:{" "}
                    {selectedPriority.charAt(0).toUpperCase() +
                      selectedPriority.slice(1)}
                  </Text>
                </View>
              )}
            </>
          )}

          {excitedForReveal && currentPair && (
            <Animated.View
              style={[
                styles.revealWaitingContainer,
                {
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [1, 1.1],
                        outputRange: [1, 1.02],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.Text
                style={[
                  styles.revealCountdownText,
                  { transform: [{ scale: timePulse }] },
                ]}
              >
                {poolService.formatTimeRemaining(
                  poolService.getTimeUntilReveal(currentPair)
                )}
              </Animated.Text>
              <Text style={styles.revealLabel}>Reveal</Text>
            </Animated.View>
          )}

          {/* Show countdown timer when in pool waiting for pairing (only during pool hours) */}
          {isInPool &&
            !currentPair &&
            (() => {
              const now = getAdjustedTime();
              const portugalTime = new Date(now.getTime() + 1 * 60 * 60 * 1000);
              const hour = portugalTime.getUTCHours();

              // Don't show countdown if past pool hours
              if (hour >= 17) return null;

              return (
                <View style={styles.timersContainer}>
                  <View style={styles.timerCard}>
                    <Text style={styles.timerLabel}>Pairing In:</Text>
                    <Text style={styles.timerValue}>
                      {(() => {
                        const currentHour = hour;
                        const nextHour = currentHour + 1;

                        // Create date for next hour
                        const nextPairingTime = new Date(portugalTime);
                        nextPairingTime.setUTCHours(nextHour, 0, 0, 0);

                        const timeUntilPairing =
                          nextPairingTime.getTime() - portugalTime.getTime();
                        return poolService.formatTimeRemaining(
                          timeUntilPairing
                        );
                      })()}
                    </Text>
                  </View>
                </View>
              );
            })()}

          {/* Show only reveal time countdown if paired (simplified) */}
          {currentPair &&
            !excitedForReveal &&
            !poolService.isRevealTime(currentPair, timeOffset) && (
              <View style={styles.timersContainer}>
                <View style={styles.timerCard}>
                  <Text style={styles.timerLabel}>Reveal Time In:</Text>
                  <Text style={styles.timerValue}>
                    {poolService.formatTimeRemaining(
                      poolService.getTimeUntilReveal(currentPair)
                    )}
                  </Text>
                </View>
              </View>
            )}

          {/* Hide the pairing CTA when reveal window is open - reveal interaction is handled by the Reveal Time card above */}
          {/* Only show pairing CTA when the user is NOT currently paired */}
          {!currentPair && !excitedForReveal && (
            <>
              <PrimaryButton
                label={getButtonText()}
                onPress={() => {
                  console.log("🖱️ Button onPress called");
                  handlePairingPress();
                }}
                variant={isInPool ? "ghost" : currentPool ? "primary" : "ghost"}
                disabled={poolLoading}
              />

              {/* Modern button styling indicator */}
              {isInPool && (
                <View style={styles.buttonHintContainer}>
                  <Ionicons
                    name="exit-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.buttonHintText}>
                    Tap to leave the pool anytime
                  </Text>
                </View>
              )}
            </>
          )}

          {poolLoading && (
            <View style={styles.searchingIndicator}>
              <View style={styles.searchingContent}>
                <Animated.View
                  style={[
                    styles.searchingIcon,
                    { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  <Ionicons
                    name="search"
                    size={20}
                    color={colors.accentPurple}
                  />
                </Animated.View>
                <Text style={styles.searchingText}>
                  {isInPool ? "Leaving pool..." : "Joining pool..."}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Info Card - How Photo Challenges Work */}
        {currentPair &&
          poolService.isInPhotoWindow(currentPair, timeOffset) &&
          !excitedForReveal && (
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="camera" size={20} color={colors.accentTeal} />
                <Text style={styles.infoCardTitle}>Photo Window Active</Text>
              </View>
              <Text style={styles.infoCardText}>
                You'll receive notifications to send photos. Check your
                notifications to participate!
              </Text>
            </View>
          )}

        {/* Country Selection for Country Mode */}
        {profile?.mode === "country" && (
          <View style={styles.countryCard}>
            <CountryDropdown
              label="Select Country"
              value={profile?.country || ""}
              onSelect={(country) => {
                if (profile) {
                  setProfile({ ...profile, country });
                }
              }}
              placeholder="Choose your pairing country"
            />
          </View>
        )}

        {/* Friends Management for Friends Mode */}
        {profile?.mode === "friends" && (
          <View style={styles.friendsCard}>
            <TouchableOpacity
              style={styles.manageFriendsButton}
              onPress={() => navigation.navigate("Friends")}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.accentPurple}
              />
              <Text style={styles.manageFriendsText}>Manage Friends</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={styles.metaSection}>
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Streak</Text>
            <Text style={styles.metaValue}>{streak} days 🔥</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Points</Text>
            <Text style={styles.metaValue}>{points} pts</Text>
          </View>
        </View>

        {/* Notification Reminder - Show when in pool waiting for pairing */}
        {isInPool && !currentPair && (
          <View style={styles.notificationReminderCard}>
            <View style={styles.notificationReminderHeader}>
              <View style={styles.notificationReminderIconContainer}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={colors.accentTeal}
                />
              </View>
              <Text style={styles.notificationReminderTitle}>
                We'll Notify You
              </Text>
            </View>
            <Text style={styles.notificationReminderText}>
              Feel free to leave the app. You'll receive a notification when
              pairing happens at {getCurrentPool()}, and throughout the day when
              it's time to send photos to your mystery buddy.
            </Text>
          </View>
        )}

        {/* Engaging Content Cards - Show when NOT in pool or paired */}
        {!isInPool && !currentPair && (
          <>
            {/* How It Works Card - Interactive */}
            <TouchableOpacity
              style={styles.engagingCard}
              activeOpacity={0.7}
              onPress={() => {
                // Could expand to show more details or link to help
              }}
            >
              <View style={styles.engagingCardHeader}>
                <View style={styles.engagingCardIconContainer}>
                  <Ionicons
                    name="help-circle-outline"
                    size={22}
                    color={colors.accentPurple}
                  />
                </View>
                <Text style={styles.engagingCardTitle}>How It Works</Text>
              </View>
              <View style={styles.engagingCardContent}>
                <View style={styles.engagingCardStep}>
                  <View style={styles.engagingCardStepNumber}>
                    <Text style={styles.engagingCardStepNumberText}>1</Text>
                  </View>
                  <Text style={styles.engagingCardStepText}>
                    Join a pool and get paired with a mystery buddy
                  </Text>
                </View>
                <View style={styles.engagingCardStep}>
                  <View style={styles.engagingCardStepNumber}>
                    <Text style={styles.engagingCardStepNumberText}>2</Text>
                  </View>
                  <Text style={styles.engagingCardStepText}>
                    Exchange anonymous photos throughout the day
                  </Text>
                </View>
                <View style={styles.engagingCardStep}>
                  <View style={styles.engagingCardStepNumber}>
                    <Text style={styles.engagingCardStepNumberText}>3</Text>
                  </View>
                  <Text style={styles.engagingCardStepText}>
                    Reveal identities and chat with your buddy
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Pro Tips Card - Interactive */}
            <TouchableOpacity
              style={[
                styles.engagingCard,
                { backgroundColor: "rgba(139, 92, 246, 0.08)" },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                // Could expand to show more tips
              }}
            >
              <View style={styles.engagingCardHeader}>
                <View style={styles.engagingCardIconContainer}>
                  <Ionicons
                    name="star-outline"
                    size={22}
                    color={colors.accentPink}
                  />
                </View>
                <Text style={styles.engagingCardTitle}>Tips for Success</Text>
              </View>
              <View style={styles.engagingCardContent}>
                <View style={styles.tipRow}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.engagingCardTip}>
                    Send creative photos to keep your buddy engaged
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.engagingCardTip}>
                    Keep your streak going by participating daily
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.engagingCardTip}>
                    Earn points by completing challenges
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Quick Actions Card - Always visible */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.7}
              onPress={() =>
                (navigation as any).navigate("MainTabs", {
                  screen: "Leaderboard",
                })
              }
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons
                  name="trophy-outline"
                  size={24}
                  color={colors.accentPurple}
                />
              </View>
              <Text style={styles.quickActionText}>Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Friends")}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons
                  name="people-outline"
                  size={24}
                  color={colors.accentTeal}
                />
              </View>
              <Text style={styles.quickActionText}>Friends</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.7}
              onPress={() =>
                (navigation as any).navigate("MainTabs", {
                  screen: "Matches",
                })
              }
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={24}
                  color={colors.accentPink}
                />
              </View>
              <Text style={styles.quickActionText}>Chats</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.7}
              onPress={() =>
                (navigation as any).navigate("MainTabs", {
                  screen: "Profile",
                })
              }
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="person-outline" size={24} color="#F97316" />
              </View>
              <Text style={styles.quickActionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Photo View Modal - Show received photos */}
      <PhotoViewModal
        visible={showPhotoViewer}
        photo={selectedPhoto}
        onClose={handleClosePhotoModal}
        onView={handleViewPhoto}
        currentUserId={user?.uid || ""}
      />

      {/* Simple Camera Reminder Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPriorityModal}
        onRequestClose={() => {
          // Only allow closing if a priority is selected
          if (selectedPriority) {
            setShowPriorityModal(false);
          }
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            // Only allow closing by tapping outside if priority is selected
            if (selectedPriority) {
              setShowPriorityModal(false);
            }
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Choose Priority</Text>
                <Pressable
                  hitSlop={12}
                  onPress={() => {
                    // Only allow closing with X if priority is selected
                    if (selectedPriority) {
                      setShowPriorityModal(false);
                    }
                  }}
                >
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </Pressable>
              </View>

              <Text style={styles.modalDescription}>
                Select how you'd like to be matched with your mystery buddy
              </Text>

              <View style={styles.priorityOptions}>
                <PillOption
                  label="Friends"
                  description="Pair with your friends first"
                  selected={selectedPriority === "friends"}
                  onPress={() => handlePrioritySelect("friends")}
                />
                <PillOption
                  label="Country"
                  description="Match with people from your country"
                  selected={selectedPriority === "country"}
                  onPress={() => handlePrioritySelect("country")}
                />
                <PillOption
                  label="World"
                  description="Connect with anyone globally"
                  selected={selectedPriority === "world"}
                  onPress={() => handlePrioritySelect("world")}
                />
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  !selectedPriority && styles.continueButtonDisabled,
                ]}
                onPress={handleContinueWithPriority}
                disabled={!selectedPriority}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Paired Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPairedModal}
        onRequestClose={() => setShowPairedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pairedModalContainer}>
            <Ionicons
              name="people"
              size={64}
              color={colors.accentTeal}
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.pairedModalTitle}>Paired! 🎉</Text>
            <Text style={styles.pairedModalText}>
              You've been matched with your mystery buddy!
            </Text>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
};

const getStatusColor = (phase: string) => {
  switch (phase) {
    case "not-paired":
      return colors.textSecondary;
    case "searching":
      return colors.accentPurple;
    case "paired-waiting":
      return colors.accentTeal;
    case "submission-open":
      return colors.accentTeal;
    case "submitted":
      return colors.accentPink;
    case "matched":
      return colors.accentPink;
    case "reveal-ready":
      return colors.danger;
    default:
      return colors.textSecondary;
  }
};

const { width, height } = Dimensions.get("window");
const isSmallScreen = width < 375 || height < 667;

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: isSmallScreen ? 100 : 120, // Increased to prevent overlap with close button
    paddingBottom: 140,
    gap: isSmallScreen ? 20 : 28,
  },
  // Photo Challenge Card (integrated in HomeScreen)
  photoChallengeCard: {
    backgroundColor: colors.surface,
    borderRadius: isSmallScreen ? 20 : 24,
    marginHorizontal: isSmallScreen ? 12 : 8,
    marginVertical: isSmallScreen ? 8 : 12,
    padding: isSmallScreen ? 16 : 20,
    borderWidth: 2,
    borderColor: colors.accentPurple + "30",
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    position: "relative",
    overflow: "visible",
  },

  photoChallengeGlowBorder: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.accentPurple + "50",
    opacity: 0.5,
  },

  photoChallengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: isSmallScreen ? 16 : 20,
  },

  photoChallengeHeaderLeft: {
    flexDirection: isSmallScreen ? "column" : "row",
    alignItems: "center",
    marginBottom: isSmallScreen ? 16 : 20,
    gap: isSmallScreen ? 12 : 0,
  },

  photoChallengeIconContainer: {
    width: isSmallScreen ? 50 : 60,
    height: isSmallScreen ? 50 : 60,
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: colors.accentPurple + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: isSmallScreen ? 0 : 16,
    borderWidth: 2,
    borderColor: colors.accentPurple + "40",
    position: "relative",
  },

  iconSparkle: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 2,
  },

  photoChallengeTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 18 : 22,
    fontWeight: "700",
    marginBottom: 2,
    textAlign: "center",
  },

  photoChallengeSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
  },

  photoChallengeTimerChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: isSmallScreen ? 12 : 14,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: colors.accentPurple + "20",
    borderColor: colors.accentPurple + "50",
    gap: 6,
    marginBottom: isSmallScreen ? 20 : 24,
  },

  photoChallengeTimerUrgent: {
    backgroundColor: colors.accentPink + "20",
    borderColor: colors.accentPink + "40",
  },

  photoChallengeTimerCritical: {
    backgroundColor: colors.danger + "20",
    borderColor: colors.danger + "40",
  },

  photoChallengeTimerText: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  photoChallengePromptContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: isSmallScreen ? 16 : 20,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: isSmallScreen ? 16 : 20,
    borderWidth: 1,
    borderColor: colors.accentPurple + "20",
  },

  promptLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },

  photoChallengePromptLabel: {
    ...typography.caption,
    color: colors.accentPurple,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },

  photoChallengePromptText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 16 : 18,
    lineHeight: isSmallScreen ? 24 : 26,
    textAlign: "center",
    fontWeight: "600",
  },

  promptAccentLine: {
    height: 3,
    width: 60,
    backgroundColor: colors.accentPink,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 16,
  },

  photoChallengeActionContainer: {
    gap: 12,
    marginBottom: 20,
  },

  photoChallengePrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentPurple,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  photoChallengeButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  photoChallengePrimaryButtonText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },

  photoChallengeSecondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },

  photoChallengeActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentPurple,
    borderRadius: isSmallScreen ? 14 : 16,
    paddingVertical: isSmallScreen ? 14 : 16,
    paddingHorizontal: isSmallScreen ? 20 : 24,
    gap: 12,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: isSmallScreen ? 14 : 16,
  },

  photoChallengeActionText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "700",
  },

  photoChallengeHelperText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 12 : 13,
    textAlign: "center",
    lineHeight: isSmallScreen ? 16 : 18,
  },

  photoChallengeSecondaryButtonText: {
    ...typography.subtitle,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },

  photoChallengeRulesContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },

  photoChallengeRuleItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },

  ruleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accentTeal + "20",
    alignItems: "center",
    justifyContent: "center",
  },

  photoChallengeRuleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  photoChallengeHintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.accentTeal + "15",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.accentTeal + "30",
  },

  photoChallengeHintText: {
    ...typography.caption,
    color: colors.accentTeal,
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 17,
    flex: 1,
  },

  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  promptTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  promptSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  promptText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 26,
    textAlign: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  promptTime: {
    ...typography.caption,
    color: "#6366F1",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  promptIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accentPink + "20",
    alignItems: "center",
    justifyContent: "center",
  },

  promptHeaderText: {
    flex: 1,
    marginLeft: 16,
  },

  promptTimer: {
    flexDirection: "row",
    alignItems: "center",
  },

  promptTimerChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentPurple + "20",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.accentPurple + "40",
    gap: 6,
  },

  promptTimerUrgent: {
    backgroundColor: colors.danger + "20",
    borderColor: colors.danger + "40",
  },

  promptTimeText: {
    ...typography.subtitle,
    color: colors.accentPurple,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  promptContent: {
    gap: 24,
  },

  promptActions: {
    flexDirection: "row",
    gap: 12,
  },

  promptActionButton: {
    flex: 1,
    backgroundColor: "rgba(255, 79, 183, 0.15)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 79, 183, 0.3)",
  },

  promptActionText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },

  promptSecondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },

  promptSecondaryText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },

  promptHint: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    opacity: 0.8,
    fontStyle: "italic",
    marginTop: 8,
  },
  pairingCard: {
    borderRadius: isSmallScreen ? 20 : 24,
    backgroundColor: "rgba(6, 0, 18, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: isSmallScreen ? 18 : 22,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  selectedModeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  selectedModeText: {
    ...typography.caption,
    color: colors.accentPurple,
    fontSize: 13,
    fontWeight: "600",
  },
  searchingIndicator: {
    alignItems: "center",
    marginTop: 12,
  },
  searchingText: {
    ...typography.caption,
    color: colors.accentPurple,
    fontWeight: "600",
  },

  searchingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  searchingIcon: {
    backgroundColor: "rgba(156, 107, 255, 0.1)",
    borderRadius: 15,
    padding: 8,
  },

  // Game Mode Card Styles
  gameModeCard: {
    borderRadius: isSmallScreen ? 20 : 24,
    backgroundColor: "rgba(6, 0, 18, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.3)",
    padding: isSmallScreen ? 18 : 24,
    shadowColor: "rgba(156, 107, 255, 0.4)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },

  gameModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  gameModeTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 18 : 22,
    fontWeight: "800",
    lineHeight: isSmallScreen ? 24 : 28,
  },

  gameModeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: isSmallScreen ? 16 : 20,
    fontSize: isSmallScreen ? 14 : 16,
    lineHeight: isSmallScreen ? 20 : 22,
  },

  modeOptionContent: {
    flex: 1,
  },
  headerTitle: {
    ...typography.display,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
  },
  modeCard: {
    borderRadius: 24,
    backgroundColor: "rgba(6, 0, 18, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 22,
    gap: 14,
  },
  modeTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  modeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  metaSection: {
    flexDirection: "row",
    gap: 16,
  },
  revealWaitingContainer: {
    marginTop: 12,
    alignItems: "center",
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: isSmallScreen ? 28 : 36,
    borderRadius: 24,
    backgroundColor: "rgba(11,7,24,0.8)",
    borderWidth: 2,
    borderColor: "rgba(139,92,246,0.25)",
    width: "100%",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    position: "relative",
    overflow: "hidden",
  },
  revealWaitingText: {
    ...typography.title,
    color: colors.accentPurple,
    fontSize: isSmallScreen ? 18 : 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  revealWaitingSubtext: {
    ...typography.subtitle,
    color: colors.textPrimary,
    opacity: 0.9,
    fontSize: isSmallScreen ? 13 : 15,
    textAlign: "center",
  },
  revealCountdownText: {
    ...typography.display,
    color: colors.accentPurple,
    fontSize: isSmallScreen ? 44 : 56,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -1,
    textShadowColor: "rgba(139,92,246,0.28)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  revealLabel: {
    ...typography.subtitle,
    color: colors.accentPink,
    fontSize: isSmallScreen ? 18 : 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 2,
    textTransform: "uppercase",
    textShadowColor: "rgba(244,71,183,0.28)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metaCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    backgroundColor: "rgba(11, 5, 32, 0.7)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  metaValue: {
    ...typography.title,
    color: colors.accentPurple,
    marginTop: 8,
  },
  modeOptions: {
    gap: 12,
  },
  modeOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: isSmallScreen ? 16 : 20,
    padding: isSmallScreen ? 16 : 20,
    backgroundColor: "rgba(11, 5, 32, 0.5)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: isSmallScreen ? 10 : 12,
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modeOptionSelected: {
    backgroundColor: "rgba(156, 107, 255, 0.15)",
    borderColor: colors.accentPurple,
    shadowColor: "rgba(156, 107, 255, 0.4)",
    shadowOpacity: 0.6,
  },
  modeOptionLabel: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  modeOptionLabelSelected: {
    color: colors.accentPurple,
  },
  modeOptionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modeOptionDescSelected: {
    color: colors.textPrimary,
  },
  manageFriendsButton: {
    borderRadius: 16,
    backgroundColor: "rgba(156, 107, 255, 0.15)",
    borderWidth: 1,
    borderColor: colors.accentPurple,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  manageFriendsText: {
    ...typography.subtitle,
    color: colors.accentPurple,
    marginLeft: 8,
    fontWeight: "600",
  },

  // Additional Cards
  countryCard: {
    backgroundColor: "rgba(6, 0, 18, 0.8)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.2)",
    shadowColor: "rgba(156, 107, 255, 0.3)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  friendsCard: {
    backgroundColor: "rgba(6, 0, 18, 0.8)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.2)",
    shadowColor: "rgba(156, 107, 255, 0.3)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "rgba(6, 0, 18, 0.9)",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    width: "90%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.3)",
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  successInfoBox: {
    backgroundColor: "rgba(156, 107, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.2)",
  },
  successInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  successButton: {
    backgroundColor: colors.accentTeal,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
  },
  successButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  // Camera Button Styles
  cameraButton: {
    backgroundColor: colors.accentPink,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    flex: 1,
    shadowColor: colors.accentPink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cameraButtonIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraButtonText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  emojiButton: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  emojiButtonText: {
    ...typography.subtitle,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },

  // New Prompt Rules Styles
  promptRules: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginTop: 4,
  },
  promptRuleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  promptHintText: {
    ...typography.caption,
    color: colors.accentTeal,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 8,
    lineHeight: 16,
    textAlign: "center",
  },

  // No Selfies Warning Styles
  noSelfiesWarning: {
    backgroundColor: "rgba(255, 71, 87, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.3)",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 12,
  },
  warningIconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  slashOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 71, 87, 0.9)",
    borderRadius: 8,
    padding: 1,
  },
  warningText: {
    ...typography.subtitle,
    color: "#FF4757",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  warningSubtext: {
    ...typography.caption,
    color: "#FF8A95",
    fontSize: 12,
    fontWeight: "500",
  },

  // Simple prompt instruction styles
  promptInstruction: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#6366F1",
  },
  instructionText: {
    ...typography.body,
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 22,
  },

  // Simple Camera Modal Styles - Modern & Clean
  simpleModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  simpleCameraModal: {
    backgroundColor: "#1E1B4B",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "85%",
    maxWidth: 320,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
  },
  simpleCameraTitle: {
    ...typography.title,
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "left",
  },
  simpleCameraButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    alignItems: "center",
  },
  simpleCameraCancel: {
    backgroundColor: "rgba(71, 85, 105, 0.3)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  simpleCameraCancelText: {
    ...typography.caption,
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  simpleCameraConfirm: {
    flex: 1,
    backgroundColor: "#8B5CF6",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: "rgba(139, 92, 246, 0.4)",
    transform: [{ scale: 1.02 }],
  },
  simpleCameraConfirmText: {
    ...typography.subtitle,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  // New professional styles
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(71, 85, 105, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  modalContent: {
    paddingTop: 16,
    alignItems: "center",
    width: "100%",
  },
  simpleCameraSubtitle: {
    ...typography.body,
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "400",
    marginBottom: 0,
    textAlign: "left",
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    width: "100%",
  },
  continueButtonText: {
    ...typography.subtitle,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  continueButtonDisabled: {
    backgroundColor: "rgba(99, 102, 241, 0.3)",
    shadowOpacity: 0,
  },

  // Modal header with anonymity icon
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 24,
    paddingTop: 8,
  },
  anonymityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  modalHeaderText: {
    flex: 1,
    paddingTop: 4,
  },

  // Received Photo Card Styles
  receivedPhotoCard: {
    borderRadius: 20,
    backgroundColor: "rgba(6, 0, 18, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.4)",
    padding: 20,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  receivedPhotoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  receivedPhotoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.3)",
  },
  receivedPhotoHeaderText: {
    flex: 1,
  },
  receivedPhotoTitle: {
    ...typography.subtitle,
    color: "#F97316",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  receivedPhotoSubtitle: {
    ...typography.body,
    color: "#FED7AA",
    fontSize: 14,
    fontWeight: "500",
  },
  receivedPhotoContent: {
    gap: 16,
  },
  photoPlaceholder: {
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(75, 85, 99, 0.3)",
    borderStyle: "dashed",
  },
  photoPlaceholderText: {
    ...typography.body,
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
  photoTimeRemaining: {
    ...typography.caption,
    color: "#F97316",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  viewPhotoButton: {
    backgroundColor: "#F97316",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    position: "relative",
  },
  viewPhotoButtonText: {
    ...typography.subtitle,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  photoBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: colors.accentPink,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  photoBadgeText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  receivedPhotoInfo: {
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    borderRadius: 8,
    padding: 12,
  },
  receivedPhotoInfoText: {
    ...typography.caption,
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 16,
  },

  // Demo Button Styles
  demoSection: {
    marginTop: 16,
    alignItems: "center",
  },
  demoButton: {
    backgroundColor: "rgba(156, 107, 255, 0.2)",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.4)",
    shadowColor: "rgba(156, 107, 255, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  demoButtonText: {
    ...typography.subtitle,
    color: "#9C6BFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Reveal Time Card Styles - Responsive for smaller phones
  revealTimeCard: {
    borderRadius: isSmallScreen ? 20 : 24,
    backgroundColor: "rgba(255, 79, 183, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(255, 79, 183, 0.4)",
    padding: isSmallScreen ? 18 : 24,
    shadowColor: "#FF4FB7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: isSmallScreen ? 12 : 16,
  },
  revealTimeHeader: {
    flexDirection: isSmallScreen ? "column" : "row",
    alignItems: "center",
    marginBottom: isSmallScreen ? 16 : 20,
    gap: isSmallScreen ? 12 : 0,
  },
  revealTimeIcon: {
    width: isSmallScreen ? 56 : 64,
    height: isSmallScreen ? 56 : 64,
    borderRadius: isSmallScreen ? 28 : 32,
    backgroundColor: "rgba(255, 79, 183, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: isSmallScreen ? 0 : 16,
    borderWidth: 2,
    borderColor: "rgba(255, 79, 183, 0.3)",
  },
  revealTimeHeaderText: {
    flex: 1,
    alignItems: isSmallScreen ? "center" : "flex-start",
  },
  revealTimeTitle: {
    ...typography.display,
    color: "#FF4FB7",
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: isSmallScreen ? "center" : "left",
  },
  revealTimeSubtitle: {
    ...typography.body,
    color: "#FFB3D9",
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: "500",
    textAlign: isSmallScreen ? "center" : "left",
    lineHeight: isSmallScreen ? 20 : 22,
  },
  revealTimeContent: {
    gap: isSmallScreen ? 16 : 20,
  },
  revealTimeMessage: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 14 : 16,
    lineHeight: isSmallScreen ? 20 : 24,
    textAlign: "center",
    paddingHorizontal: isSmallScreen ? 4 : 0,
  },
  revealTimeButton: {
    backgroundColor: "#FF4FB7",
    borderRadius: isSmallScreen ? 14 : 16,
    paddingVertical: isSmallScreen ? 14 : 16,
    paddingHorizontal: isSmallScreen ? 24 : 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isSmallScreen ? 8 : 12,
    shadowColor: "#FF4FB7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 52,
  },
  revealTimeButtonText: {
    ...typography.subtitle,
    color: "#FFFFFF",
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "700",
  },
  revealTimeButtons: {
    gap: isSmallScreen ? 10 : 12,
  },
  revealTimeDemoButton: {
    backgroundColor: "rgba(255, 79, 183, 0.1)",
    borderRadius: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 8 : 10,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isSmallScreen ? 4 : 6,
    borderWidth: 1,
    borderColor: "rgba(255, 79, 183, 0.3)",
    minHeight: 40,
  },
  revealTimeDemoButtonText: {
    ...typography.caption,
    color: "#FF4FB7",
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: "600",
  },

  // Ghosting Protection Info Card Styles
  ghostingInfoCard: {
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    padding: isSmallScreen ? 12 : 16,
    marginBottom: isSmallScreen ? 12 : 16,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  ghostingInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallScreen ? 8 : 10,
    marginBottom: isSmallScreen ? 8 : 10,
    paddingRight: isSmallScreen ? 40 : 45, // Less space needed for smaller button
  },
  ghostingInfoTitle: {
    ...typography.subtitle,
    color: "#F59E0B",
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: "700",
    lineHeight: isSmallScreen ? 18 : 20,
    flex: 1,
  },
  ghostingInfoText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 13 : 14,
    lineHeight: isSmallScreen ? 18 : 20,
    marginBottom: isSmallScreen ? 10 : 14,
    textAlign: isSmallScreen ? "center" : "left",
  },
  ghostingInfoStats: {
    flexDirection: isSmallScreen ? "column" : "row",
    gap: isSmallScreen ? 8 : 12,
    alignItems: "stretch",
  },
  ghostingInfoStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: isSmallScreen ? "center" : "flex-start",
    gap: isSmallScreen ? 4 : 6,
    backgroundColor: "rgba(245, 158, 11, 0.05)",
    borderRadius: isSmallScreen ? 6 : 8,
    padding: isSmallScreen ? 8 : 10,
  },
  ghostingInfoStatNumber: {
    fontSize: 18,
  },
  ghostingInfoStatText: {
    ...typography.caption,
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "600",
  },

  // Dismiss Button Styles - Compact and non-overlapping
  dismissButton: {
    position: "absolute",
    top: isSmallScreen ? 6 : 8,
    right: isSmallScreen ? 6 : 8,
    alignItems: "center",
    justifyContent: "center",
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: "rgba(245, 158, 11, 0.3)",
    zIndex: 1000,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.8)",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 10,
  },
  dismissButtonContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  dismissButtonText: {
    display: "none", // Hide the text to make button smaller
  },

  // Photo Viewer Modal Styles - Modern & Rounded
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  photoViewerContainer: {
    width: "100%",
    maxWidth: isSmallScreen ? "100%" : 500,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 25,
  },
  photoViewerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingVertical: isSmallScreen ? 14 : 18,
    backgroundColor: "rgba(15, 23, 42, 0.98)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(99, 102, 241, 0.2)",
  },
  photoViewerHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallScreen ? 10 : 14,
    flex: 1,
  },
  photoViewerIconWrapper: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: isSmallScreen ? 20 : 24,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(16, 185, 129, 0.4)",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  photoViewerTitle: {
    ...typography.subtitle,
    color: "#FFFFFF",
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  photoViewerSubtitle: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: "500",
  },
  photoViewerClose: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  photoContainer: {
    position: "relative",
    backgroundColor: "#000000",
    aspectRatio: 3 / 4,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoInfoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: isSmallScreen ? 16 : 20,
    paddingBottom: isSmallScreen ? 20 : 24,
  },
  photoInfoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallScreen ? 6 : 8,
    backgroundColor: "rgba(245, 158, 11, 0.25)",
    paddingVertical: isSmallScreen ? 10 : 12,
    paddingHorizontal: isSmallScreen ? 14 : 18,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.5)",
    alignSelf: "flex-start",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  photoInfoText: {
    ...typography.caption,
    color: "#FCD34D",
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  photoViewerActions: {
    flexDirection: "row",
    gap: isSmallScreen ? 10 : 14,
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: isSmallScreen ? 18 : 22,
    paddingBottom: isSmallScreen ? 20 : 24,
    backgroundColor: "rgba(15, 23, 42, 0.98)",
    borderTopWidth: 1,
    borderTopColor: "rgba(99, 102, 241, 0.2)",
  },
  photoActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isSmallScreen ? 6 : 8,
    paddingVertical: isSmallScreen ? 14 : 16,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.4)",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  photoActionButtonPrimary: {
    backgroundColor: "rgba(16, 185, 129, 0.95)",
    borderColor: "rgba(16, 185, 129, 1)",
    shadowColor: "#10B981",
    shadowOpacity: 0.4,
    elevation: 6,
  },
  photoActionButtonText: {
    ...typography.subtitle,
    color: "#EF4444",
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  photoViewerHint: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: isSmallScreen ? 11 : 12,
    textAlign: "center",
    marginTop: isSmallScreen ? 14 : 18,
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  // Timer styles for pool countdown
  timersContainer: {
    marginVertical: 16,
    gap: 12,
  },
  timerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  timerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  timerValue: {
    ...typography.title,
    color: colors.accentPurple,
    fontSize: 24,
    fontWeight: "700",
  },
  // Priority modal styles
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  modalDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  // Info card styles
  infoCard: {
    backgroundColor: "rgba(46, 230, 169, 0.1)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46, 230, 169, 0.3)",
    marginBottom: 20,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoCardTitle: {
    ...typography.subtitle,
    color: colors.accentTeal,
    fontSize: 16,
    fontWeight: "600",
  },
  infoCardText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  priorityOptions: {
    gap: 12,
  },
  // Paired modal styles
  pairedModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    maxWidth: 340,
    borderWidth: 2,
    borderColor: colors.accentTeal + "50",
  },
  pairedModalTitle: {
    ...typography.title,
    color: colors.accentTeal,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  pairedModalText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  // Photo modal styles
  photoModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    borderWidth: 2,
    borderColor: colors.accentPurple + "50",
  },
  photoPromptBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.accentPink + "30",
  },
  photoPromptText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 26,
  },
  photoModalDescription: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  photoModalButtonText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  photoModalSkipButton: {
    marginTop: 16,
    padding: 12,
    alignItems: "center",
  },
  photoModalSkipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  // Notification reminder card styles
  notificationReminderCard: {
    backgroundColor: "rgba(46, 230, 169, 0.08)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(46, 230, 169, 0.2)",
    marginBottom: 20,
  },
  notificationReminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  notificationReminderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(46, 230, 169, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationReminderTitle: {
    ...typography.subtitle,
    color: colors.accentTeal,
    fontSize: 18,
    fontWeight: "700",
  },
  notificationReminderText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  // Engaging content card styles
  engagingCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 16,
  },
  engagingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  engagingCardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  engagingCardTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  engagingCardContent: {
    gap: 16,
  },
  engagingCardStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  engagingCardStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
  },
  engagingCardStepNumberText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  engagingCardStepText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentPink,
    marginTop: 8,
  },
  engagingCardTip: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  // Quick actions card styles
  quickActionsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 16,
  },
  quickActionsTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  // Button hint styles
  buttonHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  buttonHintText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "400",
  },
});
