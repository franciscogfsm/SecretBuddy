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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { CountdownChip } from "../components/CountdownChip";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../navigation/types";
import { useAppState } from "../store/AppStateContext";
import { colors, typography } from "../theme";

const { width, height } = Dimensions.get("window");
const revealWindowSeconds = 60;

type Props = NativeStackScreenProps<RootStackParamList, "Reveal">;

export const RevealScreen = ({ navigation, route }: Props) => {
  const { buddy } = useAppState();
  const [decision, setDecision] = useState<"continue" | "pass" | null>(null);
  const [revealState, setRevealState] = useState<
    "waiting" | "ready" | "revealed"
  >("ready");

  // Check if we're in demo mode
  const isDemoMode = route.params?.demo === true;

  // Demo buddy data - simulate different scenarios
  const demoBuddy = {
    codename: "MysticShadow",
    id: "demo-user",
    hasRevealed: route.params?.bothRevealed !== false, // Allow demo to show one-sided reveal
  };

  // Use demo buddy if in demo mode, otherwise use real buddy
  const currentBuddy = isDemoMode ? demoBuddy : buddy;

  // Check if both people have revealed (in demo mode, this comes from route params)
  const bothHaveRevealed = isDemoMode ? demoBuddy.hasRevealed : true; // In real app, this would come from backend

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const textGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Dramatic entrance animation sequence
    Animated.sequence([
      // Initial fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Scale up with bounce
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      // Start glow and sparkle effects
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.timing(textGlowAnim, {
          toValue: 1,
          duration: 800,
          delay: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Haptic feedback for reveal
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 200);
  }, []);

  const handleDecision = (choice: "continue" | "pass") => {
    setDecision(choice);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // In a real app, this would send the decision to the backend
    // For now, we'll just show the decision was made
    if (currentBuddy) {
      setTimeout(() => {
        Alert.alert(
          choice === "continue" ? "Chat Unlocked! 🎉" : "Connection Passed",
          choice === "continue"
            ? `You can now chat with ${currentBuddy.codename}!`
            : "The connection has been closed.",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }, 500);
    }
  };

  if (!currentBuddy) {
    navigation.goBack();
    return null;
  }

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const sparkleScale = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={["#05030C", "#0B0520", "#140A35", "#1A0F45"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Geometric Elements */}
      <View style={styles.geometricContainer}>
        <Animated.View
          style={[
            styles.geometricShape,
            styles.shape1,
            { opacity: glowOpacity, transform: [{ scale: sparkleScale }] },
          ]}
        >
          <LinearGradient
            colors={["#FF4FB7", "#9C6BFF"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.geometricShape,
            styles.shape2,
            { opacity: glowOpacity, transform: [{ scale: sparkleScale }] },
          ]}
        >
          <LinearGradient
            colors={["#2EE6A9", "#1FC7B4"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.modal}>
          {/* Reveal Glow Effect */}
          <Animated.View
            style={[
              styles.revealGlow,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 0.9],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={["rgba(156, 107, 255, 0.3)", "rgba(255, 79, 183, 0.3)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          {/* Main Content */}
          <View style={styles.content}>
            {bothHaveRevealed ? (
              // Both have revealed - show full reveal experience
              <>
                <Animated.Text
                  style={[
                    styles.revealText,
                    {
                      opacity: textGlowAnim,
                    },
                  ]}
                >
                  ✨ REVEAL ✨
                </Animated.Text>

                <Animated.Text
                  style={[
                    styles.title,
                    {
                      opacity: textGlowAnim,
                      transform: [
                        {
                          scale: textGlowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  It&apos;s {currentBuddy.codename}!
                </Animated.Text>

                <Text style={styles.subtitle}>
                  The mystery is revealed! You can now choose to connect and
                  start chatting, or pass if you're not interested.
                </Text>

                <View style={styles.statusContainer}>
                  <Text style={styles.statusText}>
                    💫 Connection Status: Revealed
                  </Text>
                </View>

                <View style={styles.actions}>
                  <PrimaryButton
                    label={
                      decision === "continue"
                        ? "✨ Selected ✨"
                        : "Continue Chatting"
                    }
                    onPress={() => handleDecision("continue")}
                    disabled={decision === "continue"}
                  />
                  <PrimaryButton
                    label={decision === "pass" ? "Selected" : "Pass"}
                    variant="ghost"
                    onPress={() => handleDecision("pass")}
                    disabled={decision === "pass"}
                  />
                </View>
              </>
            ) : (
              // Only one person has revealed - show ghosted message
              <>
                <View style={styles.ghostIcon}>
                  <Text style={styles.ghostEmoji}>👻</Text>
                </View>

                <Text style={styles.ghostTitle}>You Ghosted Your Buddy</Text>

                <Text style={styles.ghostSubtitle}>
                  You revealed your identity, but {currentBuddy.codename} hasn't
                  responded yet. They may not be ready to connect, or they might
                  have moved on.
                </Text>

                <View style={styles.ghostStatus}>
                  <Text style={styles.ghostStatusText}>
                    🕐 Waiting for their response...
                  </Text>
                </View>

                <View style={styles.ghostActions}>
                  <PrimaryButton
                    label="Send Reminder"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert(
                        "Reminder Sent",
                        `A gentle reminder has been sent to ${currentBuddy.codename}.`,
                        [{ text: "OK" }]
                      );
                    }}
                  />
                  <PrimaryButton
                    label="Move On"
                    variant="ghost"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert(
                        "Connection Closed",
                        "You've chosen to move on. This connection is now closed.",
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

          <Pressable onPress={() => navigation.goBack()} style={styles.dismiss}>
            <Text style={styles.dismissText}>Close</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  content: {
    alignItems: "center",
    gap: 16,
  },
  revealText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.accentPurple,
    textAlign: "center",
    letterSpacing: 2,
    textShadowColor: colors.accentPurple,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: "center",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    textShadowColor: "rgba(255, 79, 183, 0.4)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
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
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(156, 107, 255, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.3)",
  },
  statusText: {
    ...typography.caption,
    color: colors.accentPurple,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  actions: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  dismiss: {
    alignItems: "center",
    marginTop: 16,
  },
  dismissText: {
    ...typography.caption,
    color: colors.textSecondary,
    opacity: 0.7,
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
});
