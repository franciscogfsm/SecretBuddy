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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";

import { CountryDropdown } from "../components/CountryDropdown";
import { GradientBackground } from "../components/GradientBackground";
import { MysteryCard } from "../components/MysteryCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { TopHeader } from "../components/TopHeader";
import { useAppState } from "../store/AppStateContext";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

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
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const scrollRef = useRef<ScrollView>(null);
  const wasFocusedRef = useRef(false);

  const getCurrentPhase = () => {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= 9 && currentHour < 12) {
      return "pairing-pool"; // 9 AM - 12 PM: Pairing pool open
    } else if (currentHour >= 12 && currentHour < 21) {
      return "matched"; // 12 PM - 9 PM: Matched and receiving prompts
    } else if (currentHour >= 21 && currentHour < 22) {
      return "reveal-window"; // 9 PM - 10 PM: Identity reveal window
    } else {
      return "waiting"; // 10 PM - 9 AM: Waiting for next pairing
    }
  };

  const getStatusMessage = () => {
    const phase = getCurrentPhase();
    switch (phase) {
      case "pairing-pool":
        return "Pairing pool is open! Join now to get matched.";
      case "matched":
        return "You're matched! Wait for random prompts throughout the day.";
      case "reveal-window":
        return "Identity reveal window is open! Discover your mystery buddy.";
      case "waiting":
        return "Next pairing opens tomorrow at 9:00 AM.";
      default:
        return "Welcome to SecretBuddy!";
    }
  };
  const [timeUntilWindow, setTimeUntilWindow] = useState<string>("");
  const [pulseAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [floatAnim] = useState(new Animated.Value(0));
  const [glowAnim] = useState(new Animated.Value(0.7));
  const [receivedPhotoAnim] = useState(new Animated.Value(1)); // Animation for received photo card
  const [isGameModeSelected, setIsGameModeSelected] = useState(false);
  const [showPairingSuccess, setShowPairingSuccess] = useState(false);
  const [isPromptTime, setIsPromptTime] = useState(false);
  const [nextPromptTime, setNextPromptTime] = useState<Date | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Control photo state - will be connected to backend
  const [hasReceivedPhoto, setHasReceivedPhoto] = useState(true); // Will be dynamically set based on backend data
  const [hasViewedPhoto, setHasViewedPhoto] = useState(false); // Track if user viewed the received photo
  const [hasSentPhoto, setHasSentPhoto] = useState(false); // Track if user sent a photo

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
    // Simple reminder alert that doesn't block camera
    Alert.alert(
      "Camera Guidelines",
      "IMPORTANT: Use back camera only!\n\n• Do NOT flip to front camera\n• No selfies allowed\n• Keep your identity hidden\n\nViolating these rules may result in removal from the game.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "I understand",
          style: "default",
          onPress: async () => {
            await openCamera();
          },
        },
      ]
    );
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

  const oldTakeBackPhoto = async () => {
    try {
      // Show appealing reminder before opening camera
      Alert.alert(
        "� Ready to Share?",
        "🎭 Keep it mysterious!\n\n✅ Use BACK camera only\n❌ No selfies please\n\n🔮 Your mystery buddy can't wait to see what you're up to!",
        [
          { text: "Not now", style: "cancel" },
          { text: "Let's do this! 🚀", onPress: openCamera },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to take photo. Please try again.");
      console.error("Camera error:", error);
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

      if (!result.canceled) {
        setHasSentPhoto(true); // Mark photo as sent
        Alert.alert(
          "Photo Sent!",
          "Your photo has been shared with your mystery buddy. Photos are encrypted and automatically deleted after the reveal window."
        );
        // Here you would upload the photo and handle the submission
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Unable to access camera. Please check your permissions and try again."
      );
    }
  };

  useEffect(() => {
    // Check if game mode is selected
    setIsGameModeSelected(!!profile?.mode);

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
        // Before pairing window
        nextWindow.setHours(9, 0, 0, 0);
        timeText = "Pairing opens at 09:00";
      } else if (currentHour >= 9 && currentHour < 12) {
        // During pairing window
        timeText = "Pairing pool is open!";
      } else if (currentHour >= 12 && currentHour < 21) {
        // After pairing, before reveal
        nextWindow.setHours(21, 0, 0, 0);
        timeText = "Reveal opens at 21:00";
      } else if (currentHour >= 21 && currentHour < 22) {
        // During reveal window
        timeText = "Reveal window is open!";
      } else {
        // After reveal, next day pairing
        nextWindow.setDate(nextWindow.getDate() + 1);
        nextWindow.setHours(9, 0, 0, 0);
        timeText = "Next pairing at 09:00";
      }

      setTimeUntilWindow(timeText);
    };

    checkDailyWindow();
    checkPromptTime();

    const interval = setInterval(() => {
      checkDailyWindow();
      checkPromptTime();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [pairing, profile?.mode]);

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
      // Floating animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -8,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.7,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      floatAnim.setValue(0);
      glowAnim.setValue(0.7);
    }
  }, [isPromptTime, floatAnim, glowAnim]);

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
    if (!profile?.mode) {
      Alert.alert("Select Game Mode", "Please choose a game mode first!");
      return;
    }

    // Start the pairing process
    setPairing({
      ...pairing,
      phase: "searching",
    });

    // Simulate finding a match after 3 seconds
    setTimeout(() => {
      setPairing({
        ...pairing,
        phase: "paired-waiting",
      });
      Alert.alert(
        "Match Found! 🎉",
        "Great news! We found your perfect SecretBuddy. The submission window will open soon!"
      );
    }, 3000);
  };

  const handlePairingPress = () => {
    const phase = getCurrentPhase();

    if (!isGameModeSelected) {
      Alert.alert("Select Game Mode", "Please choose a game mode first!");
      return;
    }

    switch (phase) {
      case "pairing-pool":
        // Start the searching animation
        setPairing({
          ...pairing,
          phase: "searching",
        });

        // Simulate finding a match after 3-5 seconds
        setTimeout(() => {
          setPairing({
            ...pairing,
            phase: "matched",
          });
          Alert.alert(
            "Mystery Buddy Found! 🎉",
            "Great news! We found your perfect mystery buddy. You'll receive random photo prompts throughout the day and discover their identity during reveal time!"
          );
        }, 4000);
        break;
      case "matched":
        Alert.alert(
          "Check Your Prompts!",
          "You're matched! Random prompts will appear throughout the day. Film your surroundings and send them to your mystery buddy!"
        );
        break;
      case "reveal-window":
        navigation.navigate("Reveal");
        break;
      case "waiting":
        Alert.alert(
          "Pairing Pool Closed",
          "The pairing pool opens tomorrow at 9:00 AM. Come back then to get matched!"
        );
        break;
    }
  };

  const getStatusText = () => {
    switch (pairing.phase) {
      case "not-paired":
        return isGameModeSelected
          ? "Ready to find your SecretBuddy?"
          : "Select a game mode to begin";
      case "searching":
        return "Searching for your mystery buddy... We'll notify you when we find the perfect match!";
      case "paired-waiting":
        return "Matched! Waiting for submission window";
      case "submission-open":
        return "Submit your response now!";
      case "submitted":
        return "Response submitted ✓";
      case "matched":
        return "Both responses in! Reveal coming soon";
      case "reveal-ready":
        return "🎉 Identity reveal time!";
      default:
        return timeUntilWindow
          ? `Next window in ${timeUntilWindow}`
          : "Ready to connect!";
    }
  };

  const handleModeSelect = (mode: string) => {
    if (profile) {
      setProfile({ ...profile, mode: mode as any });
    }
  };

  const getModeOptions = () => [
    {
      label: "Friends",
      value: "friends",
      description: "Connect with your friends only",
    },
    {
      label: "Country",
      value: "country",
      description: "Pair with someone from your selected country",
    },
    {
      label: "World",
      value: "world",
      description: "Connect with anyone worldwide",
    },
  ];

  const getButtonText = () => {
    const phase = getCurrentPhase();

    if (!isGameModeSelected) {
      return "Choose Game Mode First";
    }

    switch (phase) {
      case "pairing-pool":
        return pairing.phase === "searching"
          ? "Finding your buddy..."
          : "Join Pairing Pool";
      case "matched":
        return "Check for New Prompts";
      case "reveal-window":
        return "Reveal Identity";
      case "waiting":
        return "Pool Opens at 9:00 AM";
      default:
        return "Start Pairing";
    }
  };

  return (
    <GradientBackground gradient="midnight">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Prompt - Show only when no received photo to avoid clutter */}
        {(() => {
          const now = new Date();
          const currentHour = now.getHours();
          // Show prompts during active hours (12 PM - 9 PM)
          const isValidTime = currentHour >= 12 && currentHour < 21;
          const isPaired =
            pairing.phase === "matched" || pairing.phase === "submission-open";
          // Only show photo challenge if no received photo (to avoid clutter) AND user hasn't sent photo yet
          return isValidTime && isPaired && !hasReceivedPhoto && !hasSentPhoto;
        })() && (
          <Animated.View
            style={[
              styles.promptCardContainer,
              {
                transform: [{ scale: scaleAnim }, { translateY: floatAnim }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.promptCard,
                {
                  shadowOpacity: glowAnim,
                },
              ]}
            >
              <View style={styles.promptHeader}>
                <View style={styles.promptIconContainer}>
                  <Ionicons name="camera" size={32} color="#ffffff" />
                </View>
                <View style={styles.promptHeaderText}>
                  <Text style={styles.promptTitle}>Photo Challenge</Text>
                  <View style={styles.promptTimer}>
                    <Ionicons name="timer-outline" size={18} color="#6366F1" />
                    <Text style={styles.promptTime}>
                      {nextPromptTime
                        ? `${Math.max(
                            0,
                            Math.floor(
                              (nextPromptTime.getTime() -
                                new Date().getTime()) /
                                (1000 * 60)
                            )
                          )} minutes left`
                        : "30 minutes remaining"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.promptContent}>
                <Text style={styles.promptText}>
                  {
                    randomPrompts[
                      Math.floor(Math.random() * randomPrompts.length)
                    ]
                  }
                </Text>

                <View style={styles.promptActions}>
                  <TouchableOpacity
                    style={styles.cameraButton}
                    onPress={takeBackPhoto}
                  >
                    <View style={styles.cameraButtonIcon}>
                      <Ionicons
                        name="camera"
                        size={24}
                        color={colors.textPrimary}
                      />
                    </View>
                    <Text style={styles.cameraButtonText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.emojiButton}
                    onPress={() =>
                      Alert.alert(
                        "Quick React",
                        "Send a reaction to your buddy!"
                      )
                    }
                  >
                    <Text style={styles.emojiButtonText}>Skip</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.promptRules}>
                  <Text style={styles.promptRuleText}>
                    • Keep your identity anonymous
                  </Text>
                  <Text style={styles.promptRuleText}>
                    • No selfies or personal photos allowed
                  </Text>
                  <Text style={styles.promptHintText}>
                    Your mystery buddy will see this photo but not know it's you
                    until reveal time
                  </Text>
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        )}

        {/* Received Photo from Mystery Buddy - Priority over photo challenge */}
        {(() => {
          const now = new Date();
          const currentHour = now.getHours();
          // Show received photo during active hours when user has received one
          const isActiveTime = currentHour >= 12 && currentHour < 21;
          //Change for seeing the card ->
          return isActiveTime && hasReceivedPhoto && !hasViewedPhoto;
        })() && (
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
                <Text style={styles.receivedPhotoTitle}>Photo Received</Text>
                <Text style={styles.receivedPhotoSubtitle}>
                  Your mystery buddy shared something!
                </Text>
              </View>
            </View>

            <View style={styles.receivedPhotoContent}>
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image" size={64} color="#6B7280" />
                <Text style={styles.photoPlaceholderText}>
                  Tap to view received photo
                </Text>
              </View>

              <TouchableOpacity
                style={styles.viewPhotoButton}
                onPress={() => {
                  Alert.alert(
                    "View Photo",
                    "Here you would see the photo from your mystery buddy!",
                    [
                      {
                        text: "OK",
                        onPress: () => {
                          // Start smooth fade out animation
                          Animated.timing(receivedPhotoAnim, {
                            toValue: 0,
                            duration: 600,
                            useNativeDriver: true,
                          }).start(() => {
                            // Mark as viewed after animation completes
                            setHasViewedPhoto(true);
                          });
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="eye" size={20} color="#FFFFFF" />
                <Text style={styles.viewPhotoButtonText}>View Photo</Text>
              </TouchableOpacity>

              <View style={styles.receivedPhotoInfo}>
                <Text style={styles.receivedPhotoInfoText}>
                  ⏰ Received 5 minutes ago • 👤 Identity hidden until reveal
                  time
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Game Mode Selection - Show first if not selected */}
        {!isGameModeSelected && (
          <View style={styles.gameModeCard}>
            <View style={styles.gameModeHeader}>
              <Ionicons
                name="location-outline"
                size={28}
                color={colors.accentPurple}
              />
              <Text style={styles.gameModeTitle}>
                Where should your buddy be from?
              </Text>
            </View>
            <Text style={styles.gameModeSubtitle}>
              Choose where you'd like to find your mystery buddy
            </Text>
            <View style={styles.modeOptions}>
              {getModeOptions().map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modeOption,
                    profile?.mode === option.value && styles.modeOptionSelected,
                  ]}
                  onPress={() => handleModeSelect(option.value)}
                >
                  <View style={styles.modeOptionContent}>
                    <Text
                      style={[
                        styles.modeOptionLabel,
                        profile?.mode === option.value &&
                          styles.modeOptionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.modeOptionDesc,
                        profile?.mode === option.value &&
                          styles.modeOptionDescSelected,
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>
                  {profile?.mode === option.value && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.accentPurple}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Pairing Status Card */}
        <Animated.View
          style={[
            styles.pairingCard,
            pairing.phase === "searching" && {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>
              {getCurrentPhase() === "pairing-pool"
                ? "Pairing Pool Open"
                : getCurrentPhase() === "matched"
                ? "You're Matched!"
                : getCurrentPhase() === "reveal-window"
                ? "Reveal Time"
                : "Daily Connection"}
            </Text>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor:
                    getCurrentPhase() === "pairing-pool" ||
                    getCurrentPhase() === "reveal-window"
                      ? colors.accentTeal
                      : getCurrentPhase() === "matched"
                      ? colors.accentPurple
                      : colors.textSecondary,
                },
              ]}
            />
          </View>
          <Text style={styles.statusText}>{getStatusMessage()}</Text>

          <PrimaryButton
            label={getButtonText()}
            onPress={handlePairingPress}
            variant={
              getCurrentPhase() === "pairing-pool" ||
              getCurrentPhase() === "reveal-window"
                ? "primary"
                : "ghost"
            }
            disabled={
              !isGameModeSelected ||
              getCurrentPhase() === "waiting" ||
              pairing.phase === "searching"
            }
          />

          {pairing.phase === "searching" && (
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
                  Finding your perfect match...
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Mystery Card - Temporarily disabled to use new prompt system */}
        {/* {(pairing.phase === "paired-waiting" ||
          pairing.phase === "submission-open" ||
          pairing.phase === "matched") &&
          prompt &&
          buddy && <MysteryCard prompt={prompt} buddy={buddy} />} */}

        {/* Country Selection for Country Mode */}
        {isGameModeSelected && profile?.mode === "country" && (
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
        {isGameModeSelected && profile?.mode === "friends" && (
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
            <Text style={styles.metaValue}>5 days 🔥</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Points</Text>
            <Text style={styles.metaValue}>420 pts</Text>
          </View>
        </View>
      </ScrollView>

      {/* Simple Camera Reminder Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCameraModal}
        onRequestClose={() => setShowCameraModal(false)}
      >
        <View style={styles.simpleModalOverlay}>
          <View style={styles.simpleCameraModal}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCameraModal(false)}
            >
              <Ionicons name="close" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Header with icon */}
            <View style={styles.modalHeader}>
              <View style={styles.anonymityIconContainer}>
                <Ionicons name="eye-off" size={24} color="#6366F1" />
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.simpleCameraTitle}>No selfies</Text>
                <Text style={styles.simpleCameraSubtitle}>
                  Please use back camera only to maintain anonymity
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleCameraConfirm}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pairing Success Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPairingSuccess}
        onRequestClose={() => setShowPairingSuccess(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.successIconContainer}>
              <Ionicons
                name="checkmark-circle"
                size={80}
                color={colors.accentTeal}
              />
            </View>
            <Text style={styles.successTitle}>🎉 Pairing Successful!</Text>
            <Text style={styles.successMessage}>
              You've been matched with a mystery buddy! Wait for random photo
              prompts throughout the day.
            </Text>
            <View style={styles.successInfoBox}>
              <Text style={styles.successInfo}>
                • Photo prompts will arrive randomly between 12 PM - 9 PM{"\n"}•
                No selfies allowed - keep it mysterious!{"\n"}• Identity reveals
                at 9 PM - 10 PM
              </Text>
            </View>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowPairingSuccess(false)}
            >
              <Text style={styles.successButtonText}>Got it!</Text>
            </TouchableOpacity>
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

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 140,
    gap: 28,
  },
  promptCardContainer: {
    // Container for transform animations (native driver)
  },
  promptCard: {
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderWidth: 1.5,
    borderColor: "rgba(99, 102, 241, 0.5)",
    padding: 24,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  promptTitle: {
    ...typography.subtitle,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  promptText: {
    ...typography.body,
    color: "#F0F0F0",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 20,
    lineHeight: 24,
    textAlign: "center",
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
    borderRadius: 28,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  promptHeaderText: {
    flex: 1,
    gap: 8,
  },

  promptTimer: {
    flexDirection: "row",
    alignItems: "center",
  },

  promptContent: {
    gap: 20,
    marginTop: 16,
  },

  promptActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
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
    borderRadius: 24,
    backgroundColor: "rgba(6, 0, 18, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 22,
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
    borderRadius: 24,
    backgroundColor: "rgba(6, 0, 18, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.3)",
    padding: 24,
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
    fontSize: 22,
    fontWeight: "800",
  },

  gameModeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 20,
    fontSize: 16,
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
    borderRadius: 20,
    padding: 20,
    backgroundColor: "rgba(11, 5, 32, 0.5)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 12,
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
    backgroundColor: "#6366F1",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flex: 1,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  cameraButtonIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    padding: 6,
  },
  cameraButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  emojiButton: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  emojiButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  // New Prompt Rules Styles
  promptRules: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#6366F1",
  },
  promptRuleText: {
    ...typography.caption,
    color: "#E0E0E0",
    fontSize: 13,
    fontWeight: "500",
  },
  promptHintText: {
    ...typography.caption,
    color: "#A0A0A0",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 16,
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
  },
  viewPhotoButtonText: {
    ...typography.subtitle,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
});
