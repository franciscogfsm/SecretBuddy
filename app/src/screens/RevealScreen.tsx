import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Alert,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../navigation/types";
import { useAppState } from "../store/AppStateContext";
import { colors, typography } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as chatService from "../services/chatService";
import * as poolService from "../services/poolService";
import { getUserProfile } from "../services/userService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Pair } from "../services/poolService";

const { width, height } = Dimensions.get("window");
const TAP_PROGRESS_WIDTH = 76;

type Props = NativeStackScreenProps<RootStackParamList, "Reveal">;

export const RevealScreen = ({ navigation, route }: Props) => {
  const { buddy } = useAppState();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [decision, setDecision] = useState<"continue" | "pass" | null>(null);

  // Real pair system
  const [pair, setPair] = useState<Pair | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load pair and partner info
  useEffect(() => {
    const loadPairData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get my current pair
        const currentPair = await poolService.getMyCurrentPair(user.uid);

        if (!currentPair) {
          setError("No active pair found. Join a pool first!");
          setLoading(false);
          return;
        }

        // Check if it's reveal time
        if (!poolService.isRevealTime(currentPair)) {
          const timeUntil = poolService.getTimeUntilReveal(currentPair);
          setError(
            `Reveal opens in ${poolService.formatTimeRemaining(timeUntil)}`
          );
          setLoading(false);
          return;
        }

        // Check if I can reveal (sent at least 1 photo)
        if (!poolService.canIReveal(currentPair, user.uid)) {
          setError("You must send at least 1 photo to unlock reveal!");
          setLoading(false);
          return;
        }

        setPair(currentPair);

        // Load partner's profile
        const partnerId = poolService.getPartnerIdFromPair(
          currentPair,
          user.uid
        );
        const profile = await getUserProfile(partnerId);
        setPartnerProfile(profile);

        setLoading(false);
      } catch (err: any) {
        console.error("Error loading pair data:", err);
        setError(err.message || "Failed to load reveal data");
        setLoading(false);
      }
    };

    loadPairData();
  }, [user]);

  // Check if both people can reveal (both sent >= 1 photo)
  const bothCanReveal = pair ? pair.canRevealA && pair.canRevealB : false;

  // Check if current user has already revealed this pair
  const hasAlreadyRevealed =
    pair && user
      ? pair.userA === user.uid
        ? pair.revealedA
        : pair.revealedB
      : false;

  // Professional reveal animation system
  const [animationStage, setAnimationStage] = useState<
    "preparing" | "building" | "waitingTap" | "complete"
  >("preparing");

  // Interactive tap-to-reveal system
  const [tapCount, setTapCount] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const totalTapsNeeded = 1; // Single tap to reveal with suspense animation

  // Core animations - Initialize with visible values for debugging
  const backgroundFade = useRef(new Animated.Value(0)).current;
  const titleReveal = useRef(new Animated.Value(0)).current;
  const cardReveal = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const actionButtonsReveal = useRef(new Animated.Value(0)).current;
  const statusReveal = useRef(new Animated.Value(0)).current;
  const sparkleEffect = useRef(new Animated.Value(0)).current;

  // Progressive reveal animations
  const tapIndicatorPulse = useRef(new Animated.Value(1)).current;

  // Suspense building animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowIntensity = useRef(new Animated.Value(0)).current;
  const tapRingScale = useRef(new Animated.Value(0)).current;
  const buttonGlow = useRef(new Animated.Value(0)).current;
  const tapHintBounce = useRef(new Animated.Value(0)).current;

  // Epic reveal animations
  const cardFlip = useRef(new Animated.Value(0)).current; // For 3D flip effect
  const contentReveal = useRef(new Animated.Value(0)).current; // For content fade-in

  const sparkleLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const tapIndicatorLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const tapHintLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const createSuspensefulReveal = () => {
      setAnimationStage("building");

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      pulseLoopRef.current = pulseLoop;
      pulseLoop.start();

      // Stage 1: More dramatic entrance - Background and initial setup
      const entrySequence = Animated.sequence([
        // Longer, more dramatic background fade
        Animated.timing(backgroundFade, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),

        // Add dramatic pause before title
        Animated.delay(300),

        // Stage 2: Enhanced title reveal with more suspense
        Animated.parallel([
          Animated.timing(titleReveal, {
            toValue: 1,
            duration: 1100,
            easing: Easing.out(Easing.back(1.8)),
            useNativeDriver: true,
          }),
          Animated.timing(statusReveal, {
            toValue: 1,
            duration: 900,
            delay: 200,
            easing: Easing.out(Easing.back(1.3)),
            useNativeDriver: true,
          }),
        ]),

        // Add another dramatic pause
        Animated.delay(400),

        // Stage 3: More dramatic card entrance with tap-to-reveal
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.back(1.4)),
            useNativeDriver: true,
          }),
          Animated.spring(cardScale, {
            toValue: 1,
            tension: 30,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(cardReveal, {
            toValue: 1,
            duration: 1000,
            easing: Easing.out(Easing.back(1.3)),
            useNativeDriver: true,
          }),
          Animated.timing(glowIntensity, {
            toValue: 0.4,
            duration: 1300,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
        ]),
      ]);

      entrySequence.start(() => {
        setAnimationStage("waitingTap");
      });

      // Continuous sparkle effect
      const sparkleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleEffect, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(sparkleEffect, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      sparkleLoopRef.current = sparkleLoop;
      sparkleLoop.start();

      return () => {
        entrySequence.stop();
      };
    };

    // Strong haptic feedback for dramatic effect
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const stopEntry = createSuspensefulReveal();

    return () => {
      stopEntry?.();
      pulseLoopRef.current?.stop();
      sparkleLoopRef.current?.stop();
      tapIndicatorLoopRef.current?.stop();
      tapHintLoopRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (animationStage === "waitingTap" && !isRevealed) {
      const tapLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(tapIndicatorPulse, {
            toValue: 1.1,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(tapIndicatorPulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      tapIndicatorLoopRef.current = tapLoop;
      tapLoop.start();

      const bounceLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(tapHintBounce, {
            toValue: -8,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(tapHintBounce, {
            toValue: 0,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      tapHintLoopRef.current = bounceLoop;
      bounceLoop.start();

      return () => {
        tapIndicatorLoopRef.current?.stop();
        tapIndicatorPulse.setValue(1);
        tapHintLoopRef.current?.stop();
        tapHintBounce.setValue(0);
      };
    }

    if (animationStage === "complete") {
      tapIndicatorLoopRef.current?.stop();
      tapIndicatorPulse.setValue(1);
      tapHintLoopRef.current?.stop();
      tapHintBounce.setValue(0);
    }
  }, [animationStage, isRevealed, tapIndicatorPulse, tapHintBounce]);

  // Compute reveal progress and derived values here so hooks (useMemo) are
  // always executed regardless of early returns below. This prevents the
  // "Rendered more hooks than during the previous render" error.
  const tapRemaining = Math.max(totalTapsNeeded - tapCount, 0);
  const revealProgress = Math.min(tapCount / totalTapsNeeded, 1);

  const cardBorderColors = useMemo<[string, string]>(
    () =>
      revealProgress >= 1
        ? ["#FF6B9D", "#C084FC"] // Pink to purple when revealed
        : ["#60A5FA", "#A78BFA"], // Blue to purple while tapping
    [revealProgress]
  );

  const cardSurfaceColors = useMemo<[string, string]>(
    () =>
      revealProgress >= 1
        ? ["rgba(17, 24, 39, 0.95)", "rgba(55, 65, 81, 0.85)"] // Dark elegant when revealed
        : ["rgba(15, 23, 42, 0.92)", "rgba(30, 41, 59, 0.88)"], // Dark blue while tapping
    [revealProgress]
  );

  // Professional animation interpolations (keep here so they're always
  // defined before conditional returns)
  const sparkleScale = sparkleEffect.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });

  const sparkleOpacity = sparkleEffect.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  // Interactive tap-to-reveal handler with epic unveiling animation
  const handleTapToReveal = () => {
    if (animationStage !== "waitingTap" || isRevealed) return;

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    // Initial tap haptic - Medium to start the suspense
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Epic suspense build-up and reveal sequence with progressive haptics
    Animated.sequence([
      // Phase 1: Quick shrink for tension
      Animated.spring(cardScale, {
        toValue: 0.82,
        tension: 140,
        friction: 9,
        useNativeDriver: true,
      }),
      // Phase 2: Longer hold for dramatic suspense
      Animated.delay(400),
      // Phase 3: Dramatic pulse with glow
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1.15,
          tension: 30,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(glowIntensity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Phase 4: Extended hold at peak for maximum suspense
      Animated.delay(300),
      // Phase 5: Settle with bounce
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After suspense animation completes, trigger the reveal!
      if (newTapCount >= totalTapsNeeded) {
        // Success haptic for reveal moment
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setIsRevealed(true);
        setAnimationStage("complete");

        // Epic reveal with 3D flip and staggered animations
        Animated.sequence([
          // Phase 1: Flip the card (like revealing a mystery)
          Animated.timing(cardFlip, {
            toValue: 1,
            duration: 1000,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]).start();

        // Parallel effects during flip
        Animated.parallel([
          // Maintain intense glow
          Animated.timing(glowIntensity, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.back(1.7)),
            useNativeDriver: true,
          }),
          // Fade in content with delay
          Animated.timing(contentReveal, {
            toValue: 1,
            duration: 700,
            delay: 500, // Start halfway through flip
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // Reveal action buttons
          Animated.timing(actionButtonsReveal, {
            toValue: 1,
            duration: 700,
            delay: 600,
            easing: Easing.out(Easing.back(1.6)),
            useNativeDriver: true,
          }),
          Animated.timing(buttonGlow, {
            toValue: 1,
            duration: 800,
            delay: 400,
            easing: Easing.out(Easing.back(1.3)),
            useNativeDriver: true,
          }),
        ]).start();

        // Progressive haptic feedback during reveal
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 200);

        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 500);

        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 800);
      }
    });

    // Add suspenseful haptics during the sequence
    setTimeout(() => {
      // Light haptic during hold phase
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 450);

    setTimeout(() => {
      // Heavy haptic when it pulses big
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 900);

    // Dramatic ripple effect
    tapRingScale.setValue(0);
    Animated.timing(tapRingScale, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.circle),
      useNativeDriver: true,
    }).start();
  };

  const handleDecision = async (choice: "continue" | "pass") => {
    setDecision(choice);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (choice === "continue" && pair && partnerProfile && user) {
      try {
        console.log("🚀 Starting conversation creation...");

        // Create conversation when user chooses to continue chatting
        const partnerId = poolService.getPartnerIdFromPair(pair, user.uid);
        const matchId = pair.id;

        console.log("📝 Partner ID:", partnerId, "Match ID:", matchId);

        // Wrap createConversation with a timeout so UI doesn't stay stuck
        const createConversationWithTimeout = (
          timeoutMs: number
        ): Promise<string> => {
          const timeoutPromise = new Promise<string>((_, reject) => {
            const id = setTimeout(() => {
              clearTimeout(id);
              reject(new Error("createConversation timeout"));
            }, timeoutMs);
          });

          return Promise.race([
            chatService.createConversation(user.uid, partnerId, matchId),
            timeoutPromise,
          ]);
        };

        const conversationId = await createConversationWithTimeout(10000); // 10s

        console.log("✅ Conversation created:", conversationId);

        // Update pair with conversationId
        const pairRef = doc(db, "pairs", pair.id);
        await updateDoc(pairRef, {
          conversationId,
          [pair.userA === user.uid ? "revealedA" : "revealedB"]: true,
        });

        console.log("✅ Pair updated with conversation ID");

        // Close the modal first, then navigate to Chat
        // Since Reveal is a transparentModal, we need to go back first
        console.log("🧭 Closing modal and navigating to Chat screen...");

        // Use replace to close modal and open chat in one action
        navigation.replace("Chat", {
          conversationId,
          matchedUserId: partnerId,
          matchedUserName:
            partnerProfile.username ||
            partnerProfile.displayName ||
            "Anonymous",
        });

        console.log("✅ Navigation command sent");

        // Reset decision state after navigation
        setDecision(null);
      } catch (error) {
        // If a timeout or other error happened, show friendly message and clear state
        const errAny: any = error;
        console.error(
          "❌ Error creating conversation:",
          errAny?.message || errAny
        );
        Alert.alert(
          "Error",
          errAny?.message === "createConversation timeout"
            ? "Server is taking too long to respond. Please try again in a moment."
            : "Failed to start chat. Please try again.",
          [{ text: "OK" }]
        );
        setDecision(null);
      }
    } else {
      // Pass - show confirmation and go back
      setTimeout(() => {
        Alert.alert(
          "Connection Passed",
          "The connection has been closed. You'll be matched with someone new soon!",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }, 300);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accentPurple} />
        <Text style={[styles.statusText, { marginTop: 20 }]}>
          Loading reveal...
        </Text>
      </View>
    );
  }

  // Show error state
  if (error || !pair || !partnerProfile) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center", padding: 20 },
        ]}
      >
        <Ionicons name="alert-circle" size={64} color={colors.textSecondary} />
        <Text style={[styles.errorTitle, { marginTop: 20 }]}>
          {error || "No pair found"}
        </Text>
        <View style={{ marginTop: 20 }}>
          <PrimaryButton label="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  // If user has already revealed, show simple "Continue to Chat" screen
  if (hasAlreadyRevealed && pair.conversationId) {
    const partnerId = poolService.getPartnerIdFromPair(pair, user!.uid);

    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center", padding: 20 },
        ]}
      >
        <LinearGradient
          colors={["#0A0A0A", "#1A1A2E", "#16213E", "#1A237E"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={{ alignItems: "center" }}>
          {partnerProfile.profilePhotoUrl ? (
            <Image
              source={{ uri: partnerProfile.profilePhotoUrl }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                marginBottom: 20,
              }}
            />
          ) : (
            <View style={[styles.profileAvatar, { marginBottom: 20 }]}>
              <Text style={styles.profileAvatarText}>
                {(partnerProfile.username || partnerProfile.displayName || "U")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={[styles.profileName, { marginBottom: 8 }]}>
            {partnerProfile.username ||
              partnerProfile.displayName ||
              "Anonymous"}
          </Text>

          <Text style={[styles.profileDetail, { marginBottom: 24 }]}>
            Age: {partnerProfile.age || "??"} • Location:{" "}
            {partnerProfile.country || "???"}
          </Text>

          <PrimaryButton
            label="Continue to Chat"
            onPress={() => {
              navigation.replace("Chat", {
                conversationId: pair.conversationId,
                matchedUserId: partnerId,
                matchedUserName:
                  partnerProfile.username ||
                  partnerProfile.displayName ||
                  "Anonymous",
              });
            }}
            leadingIcon={
              <Ionicons
                name="chatbubbles"
                size={20}
                color={colors.textPrimary}
              />
            }
          />

          <Pressable
            onPress={() => navigation.goBack()}
            style={{ marginTop: 16, padding: 8 }}
          >
            <Text
              style={[
                styles.profileDetail,
                { textDecorationLine: "underline" },
              ]}
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // (Deduped) derived values, color memos, and sparkle interpolations are
  // declared earlier in the component to guarantee a stable hooks order.

  return (
    <View
      style={[styles.container, { paddingTop: Math.max(28, insets.top + 30) }]}
    >
      {/* Professional gradient background */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: backgroundFade }]}
      >
        <LinearGradient
          colors={["#0A0A0A", "#1A1A2E", "#16213E", "#1A237E"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Subtle sparkle effects */}
      <Animated.View
        style={[
          styles.sparkleContainer,
          {
            opacity: sparkleOpacity,
            transform: [{ scale: sparkleScale }],
          },
        ]}
      >
        <View style={[styles.sparkle, { top: "20%", right: "15%" }]} />
        <View style={[styles.sparkle, { top: "60%", left: "10%" }]} />
        <View style={[styles.sparkle, { bottom: "25%", right: "25%" }]} />
      </Animated.View>

      {/* Professional main content */}
      <View style={styles.mainContent}>
        {bothCanReveal ? (
          <>
            {/* Professional reveal header */}
            <Animated.View
              style={[
                styles.headerContainer,
                {
                  opacity: titleReveal,
                  transform: [
                    { scale: pulseAnim },
                    {
                      translateY: titleReveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="eye" size={24} color="#4F46E5" />
              </View>
              <Text style={styles.revealTitle}>Identity Revealed</Text>
              <Text style={styles.revealSubtitle}>
                Meet your secret connection
              </Text>
            </Animated.View>

            {/* Connection Status - Now Visible */}
            <Animated.View
              style={[
                styles.statusBanner,
                {
                  opacity: statusReveal,
                  transform: [
                    {
                      translateY: statusReveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.statusText}>Connection Established</Text>
            </Animated.View>

            {/* Interactive Tap-to-Reveal Profile Card */}
            <Pressable
              onPress={handleTapToReveal}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.profileCardContainer,
                  {
                    opacity: cardOpacity,
                    transform: [
                      {
                        perspective: 1000, // Enable 3D perspective
                      },
                      { scale: cardScale },
                      {
                        translateY: cardReveal.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                      {
                        rotateY: cardFlip.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"], // Full rotation reveal
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Glow effect */}
                <Animated.View
                  style={[
                    styles.cardGlow,
                    {
                      opacity: glowIntensity,
                    },
                  ]}
                />

                <LinearGradient
                  colors={cardBorderColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.profileCardBorder}
                >
                  <View style={styles.profileCard}>
                    <LinearGradient
                      colors={cardSurfaceColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.profileCardSurface}
                    />

                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.tapRipple,
                        {
                          opacity: tapRingScale.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.45, 0],
                          }),
                          transform: [
                            {
                              scale: tapRingScale.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.6],
                              }),
                            },
                          ],
                        },
                      ]}
                    />

                    {/* Epic instant reveal with animated content */}
                    <Animated.View
                      style={[
                        styles.profileHeader,
                        {
                          opacity: contentReveal,
                          transform: [
                            {
                              scale: contentReveal.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.9, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <View style={styles.profileAvatar}>
                        {isRevealed && partnerProfile.profilePhotoUrl ? (
                          <Animated.View
                            style={{
                              opacity: isRevealed ? 1 : 0.4,
                              transform: [
                                {
                                  scale: isRevealed ? 1 : 0.9,
                                },
                              ],
                            }}
                          >
                            <Image
                              source={{ uri: partnerProfile.profilePhotoUrl }}
                              style={{
                                width: 70,
                                height: 70,
                                borderRadius: 35,
                              }}
                            />
                          </Animated.View>
                        ) : (
                          <Animated.Text
                            style={[
                              styles.profileAvatarText,
                              {
                                opacity: isRevealed ? 1 : 0.4,
                                transform: [
                                  {
                                    scale: isRevealed ? 1 : 0.9,
                                  },
                                ],
                              },
                            ]}
                          >
                            {isRevealed
                              ? (
                                  partnerProfile.username ||
                                  partnerProfile.displayName ||
                                  "User"
                                )
                                  .charAt(0)
                                  .toUpperCase()
                              : "?"}
                          </Animated.Text>
                        )}
                      </View>
                      <View style={styles.profileInfo}>
                        <Animated.Text
                          numberOfLines={2}
                          ellipsizeMode="tail"
                          style={[
                            styles.profileName,
                            {
                              opacity: isRevealed ? 1 : 0.4,
                              transform: [
                                {
                                  translateY: isRevealed ? 0 : 5,
                                },
                              ],
                            },
                          ]}
                        >
                          {isRevealed
                            ? partnerProfile.username ||
                              partnerProfile.displayName ||
                              "Anonymous"
                            : "???"}
                        </Animated.Text>
                        <Animated.Text
                          style={[
                            styles.profileDetail,
                            {
                              opacity: isRevealed ? 1 : 0.4,
                              transform: [
                                {
                                  translateY: isRevealed ? 0 : 5,
                                },
                              ],
                            },
                          ]}
                        >
                          {isRevealed
                            ? `Age: ${partnerProfile.age || "??"} • Location: ${
                                partnerProfile.country || "???"
                              }`
                            : "Age: ?? • Location: ???"}
                        </Animated.Text>
                      </View>
                    </Animated.View>

                    {animationStage === "waitingTap" && (
                      <View style={styles.tapTokenRow}>
                        {Array.from({ length: totalTapsNeeded }).map(
                          (_, index) => {
                            const isFilled = index < tapCount;
                            const isNext = index === tapCount && !isRevealed;

                            if (isFilled) {
                              return (
                                <LinearGradient
                                  key={`tap-token-${index}`}
                                  colors={["#60A5FA", "#8B5CF6"]}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={[
                                    styles.tapToken,
                                    styles.tapTokenFilled,
                                  ]}
                                >
                                  <Ionicons
                                    name="sparkles"
                                    size={12}
                                    color="#F8FAFF"
                                  />
                                </LinearGradient>
                              );
                            }

                            return (
                              <View
                                key={`tap-token-${index}`}
                                style={[
                                  styles.tapToken,
                                  isNext && styles.tapTokenNext,
                                ]}
                              >
                                {isNext && (
                                  <Ionicons
                                    name="hand-left"
                                    size={12}
                                    color="#60A5FA"
                                  />
                                )}
                              </View>
                            );
                          }
                        )}
                      </View>
                    )}

                    <View style={styles.tapMessageWrapper}>
                      {animationStage === "waitingTap" && !isRevealed ? (
                        <LinearGradient
                          colors={[
                            "rgba(96, 165, 250, 0.95)",
                            "rgba(168, 85, 247, 0.85)",
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.tapMessage}
                        >
                          <View style={styles.tapMessageIcon}>
                            <Ionicons
                              name="sparkles"
                              size={18}
                              color="#F9FAFF"
                            />
                          </View>
                          <View style={styles.tapMessageText}>
                            <Text style={styles.tapMessageTitle}>
                              Tap to unveil
                            </Text>
                            <Text style={styles.tapMessageSubtitle}>
                              {tapRemaining > 0
                                ? `${tapRemaining} more ${
                                    tapRemaining === 1 ? "tap" : "taps"
                                  } to unlock`
                                : "You're almost there"}
                            </Text>
                            <View style={styles.tapMessageTrack}>
                              <View
                                style={[
                                  styles.tapMessageFill,
                                  {
                                    width: `${
                                      Math.max(revealProgress, 0.08) * 100
                                    }%`,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        </LinearGradient>
                      ) : null}
                    </View>

                    {/* Bio section - reveals with content animation */}
                    <Animated.View
                      style={[
                        styles.profileBio,
                        {
                          opacity: contentReveal.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.4, 0.6, 1],
                          }),
                          transform: [
                            {
                              translateY: contentReveal.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0],
                              }),
                            },
                            {
                              scale: contentReveal.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.95, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <ScrollView
                        style={{ maxHeight: 160 }}
                        contentContainerStyle={{ paddingRight: 6 }}
                        showsVerticalScrollIndicator={false}
                      >
                        <Text style={styles.profileBioText}>
                          {isRevealed && partnerProfile.bio
                            ? `"${partnerProfile.bio}"`
                            : isRevealed
                            ? '"No bio yet"'
                            : '"????? ????? ??????? ??? ??????? ??? ??????. ?????? ?? ??? ?? ???????!"'}
                        </Text>
                      </ScrollView>
                    </Animated.View>

                    {/* Internal connection message */}
                    {isRevealed && (
                      <Pressable
                        style={styles.internalMessage}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                          navigation.navigate("Chat", { isTimed: false });
                        }}
                      >
                        <View style={styles.internalMessageContent}>
                          <Ionicons
                            name="chatbubbles"
                            size={16}
                            color="#10B981"
                          />
                          <Text style={styles.internalMessageText}>
                            Send your first message!
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={14}
                            color="#10B981"
                            style={{ marginLeft: 4 }}
                          />
                        </View>
                      </Pressable>
                    )}
                  </View>
                </LinearGradient>
              </Animated.View>
            </Pressable>

            {/* Professional Action Button */}
            <Animated.View
              style={[
                styles.actionContainer,
                {
                  opacity: actionButtonsReveal,
                  marginBottom: insets.bottom ? insets.bottom + 18 : 24,
                  transform: [
                    {
                      translateY: actionButtonsReveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.buttonHalo,
                  {
                    opacity: 0, // Hide the halo completely to prevent the pink box
                    backgroundColor: "transparent",
                    shadowColor: "transparent",
                    transform: [
                      {
                        scale: buttonGlow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.4],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <PrimaryButton
                label={
                  decision === "continue" ? "Opening Chat..." : "Start Chatting"
                }
                onPress={() => handleDecision("continue")}
                disabled={decision === "continue"}
                loading={decision === "continue"}
                leadingIcon={
                  decision === "continue" ? undefined : (
                    <Ionicons
                      name="chatbubbles"
                      size={20}
                      color={colors.textPrimary}
                    />
                  )
                }
              />
            </Animated.View>
          </>
        ) : (
          // Ghosting protection - show different messages based on participation
          <>
            <View style={styles.noRevealIcon}>
              <Text style={styles.noRevealEmoji}>👻</Text>
            </View>

            {/* Default ghosting protection message */}
            <Text style={styles.noRevealTitle}>No Messages, No Reveal</Text>
            <Text style={styles.noRevealSubtitle}>
              Neither you nor your buddy sent enough messages during the day.
              Stay active to unlock reveal time tomorrow!
            </Text>
            <View style={styles.ghostingProtectionInfo}>
              <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
              <Text style={styles.ghostingProtectionText}>
                Ghosting Protection: Send at least 1 message to unlock reveals
              </Text>
            </View>

            <View style={styles.noRevealActions}>
              <PrimaryButton
                label="Send Reminder"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(
                    "Reminder Sent",
                    `A gentle reminder has been sent to ${
                      partnerProfile.username ||
                      partnerProfile.displayName ||
                      "your buddy"
                    }.`,
                    [{ text: "OK" }]
                  );
                }}
              />
              <PrimaryButton
                label="Find New Buddy"
                variant="ghost"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(
                    "Finding New Connection",
                    "We'll help you find someone new to connect with.",
                    [
                      {
                        text: "OK",
                        onPress: () => navigation.goBack(),
                      },
                    ]
                  );
                }}
              />
            </View>
          </>
        )}
      </View>

      {/* Professional close button */}
      <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
        <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.9)" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Floating orbs for dynamic background
  floatingOrb1: {
    position: "absolute",
    top: "20%",
    right: "10%",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(156, 107, 255, 0.3)",
    shadowColor: "#9C6BFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  floatingOrb2: {
    position: "absolute",
    bottom: "25%",
    left: "5%",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 79, 183, 0.25)",
    shadowColor: "#FF4FB7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  floatingOrb3: {
    position: "absolute",
    top: "60%",
    right: "25%",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(46, 230, 169, 0.2)",
    shadowColor: "#2EE6A9",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  // Full screen content instead of modal
  fullScreenContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  sparkleField: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  patternCircle: {
    position: "absolute",
    borderRadius: 150,
    opacity: 0.05,
  },
  patternCircle1: {
    width: 300,
    height: 300,
    backgroundColor: "#9C6BFF",
    top: -150,
    right: -100,
  },
  patternCircle2: {
    width: 200,
    height: 200,
    backgroundColor: "#FF4FB7",
    bottom: -100,
    left: -50,
  },
  patternCircle3: {
    width: 250,
    height: 250,
    backgroundColor: "#2EE6A9",
    top: "50%",
    left: "60%",
    marginTop: -125,
    marginLeft: -125,
  },
  geometricContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  geometricShape: {
    position: "absolute",
    borderRadius: 120,
    opacity: 0.1,
  },
  shape1: {
    width: width * 1.2,
    height: width * 1.2,
    top: -width * 0.6,
    right: -width * 0.4,
  },
  shape2: {
    width: width * 0.9,
    height: width * 0.9,
    bottom: -width * 0.3,
    left: -width * 0.3,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 32,
    padding: 32,
    backgroundColor: "rgba(11, 5, 32, 0.95)",
    gap: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
  },
  revealGlow: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 52,
    overflow: "hidden",
  },
  sparkleOverlay: {
    position: "absolute",
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    pointerEvents: "none",
  },
  sparkle1: {
    top: "10%",
    right: "15%",
    width: 6,
    height: 6,
    backgroundColor: "#FF4FB7",
    shadowColor: "#FF4FB7",
  },
  sparkle2: {
    top: "25%",
    left: "20%",
    width: 4,
    height: 4,
    backgroundColor: "#9C6BFF",
    shadowColor: "#9C6BFF",
  },
  sparkle3: {
    bottom: "30%",
    right: "25%",
    width: 8,
    height: 8,
    backgroundColor: "#2EE6A9",
    shadowColor: "#2EE6A9",
  },
  sparkle4: {
    bottom: "15%",
    left: "18%",
    width: 5,
    height: 5,
    backgroundColor: "#FFD700",
    shadowColor: "#FFD700",
  },
  sparkle5: {
    top: "45%",
    right: "8%",
    width: 7,
    height: 7,
    backgroundColor: "#FF6B9D",
    shadowColor: "#FF6B9D",
  },
  sparkle6: {
    top: "70%",
    left: "12%",
    width: 6,
    height: 6,
    backgroundColor: "#A78BFA",
    shadowColor: "#A78BFA",
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
  },
  content: {
    alignItems: "center",
    gap: 24,
    width: "100%",
  },
  revealText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 3,
    textShadowColor: colors.accentPurple,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    marginBottom: 8,
  },
  title: {
    ...typography.display,
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1.5,
    textShadowColor: "rgba(255, 79, 183, 0.6)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
    marginBottom: 16,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  countdownWrapper: {
    alignItems: "center",
    marginTop: 8,
  },
  statusContainer: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "rgba(156, 107, 255, 0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.4)",
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  actions: {
    width: "100%",
    maxWidth: 380,
    gap: 18,
    marginTop: 32,
    paddingHorizontal: 16,
  },

  // Ghosted state styles
  ghostIcon: {
    alignItems: "center",
    marginBottom: 8,
  },
  ghostEmoji: {
    fontSize: 48,
    opacity: 0.8,
  },
  ghostTitle: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  ghostSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  ghostStatus: {
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 79, 183, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 79, 183, 0.3)",
  },
  ghostStatusText: {
    ...typography.caption,
    color: colors.accentPink,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  ghostActions: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  // No reveal state styles
  noRevealIcon: {
    alignItems: "center",
    marginBottom: 8,
  },
  noRevealEmoji: {
    fontSize: 48,
    opacity: 0.8,
  },
  noRevealTitle: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  noRevealSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  noRevealStatus: {
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 165, 0, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 165, 0, 0.3)",
  },
  noRevealStatusText: {
    ...typography.caption,
    color: "#FFA500",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  noRevealActions: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  // Profile Card Styles - Modern glassmorphism design
  profileCardContainer: {
    width: width * 0.92,
    maxWidth: 600,
    marginHorizontal: "auto",
    marginVertical: 20,
    shadowColor: "rgba(99, 102, 241, 0.8)",
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.6,
    shadowRadius: 44,
    elevation: 22,
    alignSelf: "center",
  },
  profileCardBorder: {
    borderRadius: 38,
    padding: 2,
  },
  profileCard: {
    position: "relative",
    borderRadius: 36,
    padding: 20,
    paddingVertical: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    backgroundColor: "rgba(6, 11, 38, 0.92)",
    minHeight: Math.max(260, height * 0.42),
  },
  profileCardSurface: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    opacity: 0.95,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  profileAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
    minHeight: 100,
  },
  profileName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.4,
    flexWrap: "wrap",
    flexShrink: 1,
  },
  profileDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 17,
    marginBottom: 4,
    fontWeight: "500",
    lineHeight: 24,
  },
  profileBio: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    maxHeight: 160,
    overflow: "hidden",
  },
  profileBioText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },

  // New Professional Styles
  sparkleContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  sparkle: {
    position: "absolute",
    width: 4,
    height: 4,
    backgroundColor: "#60A5FA",
    borderRadius: 2,
    shadowColor: "#60A5FA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Math.max(20, width * 0.05),
    paddingVertical: Math.max(40, height * 0.08),
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: Math.max(24, height * 0.03),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
  },
  revealTitle: {
    ...typography.display,
    fontSize: Math.max(20, width * 0.055),
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  revealSubtitle: {
    ...typography.body,
    fontSize: Math.max(14, width * 0.035),
    color: "rgba(255, 255, 255, 0.78)",
    textAlign: "center",
    lineHeight: 20,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: Math.max(32, height * 0.04),
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
  },
  statusText: {
    ...typography.caption,
    fontSize: Math.max(15, width * 0.038),
    fontWeight: "600",
    color: "#10B981",
    marginLeft: 8,
  },
  cardGlow: {
    position: "absolute",
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    borderRadius: 35,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  actionContainer: {
    width: "100%",
    maxWidth: 320,
    marginTop: Math.max(12, height * 0.02),
    // pull the action slightly higher so the button sits closer to the card
    transform: [{ translateY: -8 }],
  },
  buttonHalo: {
    position: "absolute",
    top: -35,
    left: -35,
    right: -35,
    bottom: -35,
    borderRadius: 40,
    backgroundColor: "rgba(79, 70, 229, 0.25)",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 12,
  },

  // Tap-to-reveal styles
  tapRipple: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    bottom: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(96, 165, 250, 0.45)",
  },
  tapTokenRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  tapToken: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.22)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
  },
  tapTokenFilled: {
    borderWidth: 0,
    shadowColor: "rgba(129, 140, 248, 0.9)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  tapTokenNext: {
    borderColor: "rgba(129, 140, 248, 0.95)",
    backgroundColor: "rgba(129, 140, 248, 0.18)",
  },
  tapMessageWrapper: {
    marginTop: 16,
  },
  tapMessage: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(250, 210, 255, 0.4)",
    shadowColor: "rgba(168, 85, 247, 0.7)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  tapMessageIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(250, 210, 255, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(250, 210, 255, 0.4)",
    marginRight: 14,
  },
  tapMessageText: {
    flex: 1,
  },
  tapMessageTitle: {
    color: "#F9FBFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  tapMessageSubtitle: {
    color: "rgba(249, 251, 255, 0.88)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tapMessageTrack: {
    width: TAP_PROGRESS_WIDTH,
    height: 6,
    backgroundColor: "rgba(249, 250, 255, 0.24)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 10,
  },
  tapMessageFill: {
    height: "100%",
    backgroundColor: "#FDEEF9",
    borderRadius: 3,
  },
  tapMessageComplete: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: "rgba(236, 72, 153, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.45)",
    shadowColor: "rgba(236, 72, 153, 0.6)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  tapMessageCompleteText: {
    color: "rgba(236, 253, 245, 0.95)",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Internal message styles
  internalMessage: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    shadowColor: "rgba(16, 185, 129, 0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  internalMessageContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  internalMessageText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
    flex: 1,
  },

  // Ghosting protection styles
  ghostingProtectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    gap: 12,
  },
  ghostingProtectionText: {
    color: "#F59E0B",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },

  // Error state styles
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
});
