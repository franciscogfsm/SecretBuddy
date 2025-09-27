import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { GradientBackground } from "../components/GradientBackground";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { colors, typography } from "../theme";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<RootStackParamList, "AuthOptions">;

export const AuthOptionsScreen = ({ navigation }: Props) => {
  const fadeAnim = useState(new Animated.Value(0))[0];
  const bubbleAnim1 = useState(new Animated.Value(0))[0];
  const bubbleAnim2 = useState(new Animated.Value(0))[0];
  const bubbleAnim3 = useState(new Animated.Value(0))[0];
  const bubbleAnim4 = useState(new Animated.Value(0))[0];
  const bubbleAnim5 = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];
  const shimmerAnim = useState(new Animated.Value(0))[0];
  const insets = useSafeAreaInsets();

  const { googleSignIn, user, loading } = useAuth();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const animateBubble = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000 + delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 3000 + delay,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateBubble(bubbleAnim1, 0);
    animateBubble(bubbleAnim2, 1000);
    animateBubble(bubbleAnim3, 2000);
    animateBubble(bubbleAnim4, 1500);
    animateBubble(bubbleAnim5, 2500);
  }, [bubbleAnim1, bubbleAnim2, bubbleAnim3, bubbleAnim4, bubbleAnim5]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);

  const handleGoogleSignIn = async () => {
    try {
      await googleSignIn();
      navigation.navigate({ name: "Onboarding", params: { mode: "signin" } });
    } catch (err) {
      Alert.alert(
        "Sign in failed",
        err instanceof Error ? err.message : "Please try again."
      );
    }
  };

  const handleAppleSignIn = () => {
    // Placeholder: Navigate to onboarding
    navigation.navigate({ name: "Onboarding", params: {} });
  };

  const handleEmailSignIn = () => {
    // Navigate to onboarding
    navigation.navigate({ name: "Onboarding", params: {} });
  };

  return (
    <GradientBackground gradient="midnight">
      <SafeAreaView style={styles.safeArea}>
        {/* Floating Bubbles */}
        <Animated.View
          style={[
            styles.floatingBubble,
            styles.bubble1,
            {
              transform: [
                {
                  translateY: bubbleAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -50],
                  }),
                },
                {
                  translateX: bubbleAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 30],
                  }),
                },
                {
                  rotate: bubbleAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "180deg"],
                  }),
                },
              ],
              opacity: bubbleAnim1.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 0.6, 0.3],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingBubble,
            styles.bubble2,
            {
              transform: [
                {
                  translateY: bubbleAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -40],
                  }),
                },
                {
                  translateX: bubbleAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -25],
                  }),
                },
                {
                  rotate: bubbleAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "-180deg"],
                  }),
                },
              ],
              opacity: bubbleAnim2.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.2, 0.5, 0.2],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingBubble,
            styles.bubble3,
            {
              transform: [
                {
                  translateY: bubbleAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -60],
                  }),
                },
                {
                  translateX: bubbleAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 20],
                  }),
                },
                {
                  rotate: bubbleAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
              opacity: bubbleAnim3.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.4, 0.7, 0.4],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingBubble,
            styles.bubble4,
            {
              transform: [
                {
                  translateY: bubbleAnim4.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -45],
                  }),
                },
                {
                  translateX: bubbleAnim4.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -35],
                  }),
                },
                {
                  rotate: bubbleAnim4.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "-90deg"],
                  }),
                },
              ],
              opacity: bubbleAnim4.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.25, 0.55, 0.25],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingBubble,
            styles.bubble5,
            {
              transform: [
                {
                  translateY: bubbleAnim5.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -70],
                  }),
                },
                {
                  translateX: bubbleAnim5.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 40],
                  }),
                },
                {
                  rotate: bubbleAnim5.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "270deg"],
                  }),
                },
              ],
              opacity: bubbleAnim5.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.35, 0.65, 0.35],
              }),
            },
          ]}
        />

        {/* Starfield effect */}
        {[...Array(8)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                top: `${10 + i * 10}%`,
                left: `${20 + (i % 3) * 25}%`,
                opacity: shimmerAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3 + i * 0.1, 0.8 + i * 0.05, 0.3 + i * 0.1],
                }),
                transform: [
                  {
                    scale: shimmerAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.5, 1.2, 0.5],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

        {/* Floating Mystery Icons */}
        <Animated.View
          style={[
            styles.mysteryIcon,
            styles.icon1,
            {
              transform: [
                {
                  translateY: bubbleAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -30],
                  }),
                },
                {
                  rotate: bubbleAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
              opacity: bubbleAnim1.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.4, 0.8, 0.4],
              }),
            },
          ]}
        >
          <FontAwesome
            name="question"
            size={24}
            color="rgba(138, 70, 255, 0.6)"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.mysteryIcon,
            styles.icon2,
            {
              transform: [
                {
                  translateY: bubbleAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -40],
                  }),
                },
                {
                  rotate: bubbleAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "-180deg"],
                  }),
                },
              ],
              opacity: bubbleAnim2.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 0.7, 0.3],
              }),
            },
          ]}
        >
          <FontAwesome
            name="eye-slash"
            size={20}
            color="rgba(255, 93, 162, 0.5)"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.mysteryIcon,
            styles.icon3,
            {
              transform: [
                {
                  translateY: bubbleAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -50],
                  }),
                },
                {
                  rotate: bubbleAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "270deg"],
                  }),
                },
              ],
              opacity: bubbleAnim3.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.5, 0.9, 0.5],
              }),
            },
          ]}
        >
          <FontAwesome
            name="user-secret"
            size={22}
            color="rgba(46, 238, 169, 0.4)"
          />
        </Animated.View>

        <Animated.View style={[{ opacity: fadeAnim, flex: 1 }]}>
          <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
            <View style={styles.hero}>
              <Animated.Text
                style={[
                  styles.heroTitle,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                Welcome to Secret Buddy
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.heroSubtitle,
                  {
                    opacity: shimmerAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.7, 1, 0.7],
                    }),
                  },
                ]}
              >
                Connect anonymously and share daily moods with friends.
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.mysteryTagline,
                  {
                    opacity: shimmerAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.5, 0.8, 0.5],
                    }),
                  },
                ]}
              >
                What secret connection will you uncover today?
              </Animated.Text>
              <Animated.View
                style={[
                  styles.heroGlow,
                  {
                    opacity: shimmerAnim.interpolate({
                      inputRange: [0, 0.3, 0.7, 1],
                      outputRange: [0.3, 0.6, 0.6, 0.3],
                    }),
                  },
                ]}
              />
            </View>

            <View style={styles.options}>
              <Animated.View
                style={{
                  shadowColor: colors.accentPurple,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.6, 0.3],
                  }),
                  shadowRadius: 10,
                  borderRadius: 12,
                }}
              >
                <PrimaryButton
                  label="Continue with Google"
                  onPress={handleGoogleSignIn}
                  leadingIcon={
                    <FontAwesome
                      name="google"
                      size={18}
                      color={colors.textSecondary}
                    />
                  }
                />
              </Animated.View>
              {Platform.OS === "ios" && (
                <Animated.View
                  style={{
                    shadowColor: colors.accentPurple,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: shimmerAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 0.6, 0.3],
                    }),
                    shadowRadius: 10,
                    borderRadius: 12,
                  }}
                >
                  <PrimaryButton
                    label="Continue with Apple"
                    onPress={handleAppleSignIn}
                    leadingIcon={
                      <FontAwesome
                        name="apple"
                        size={18}
                        color={colors.textPrimary}
                      />
                    }
                  />
                </Animated.View>
              )}

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Animated.View
                style={{
                  shadowColor: colors.accentTeal,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.2, 0.5, 0.2],
                  }),
                  shadowRadius: 8,
                  borderRadius: 12,
                }}
              >
                <PrimaryButton
                  label="Continue with Email"
                  variant="ghost"
                  onPress={handleEmailSignIn}
                />
              </Animated.View>
            </View>

            <Text style={styles.footer}>
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  floatingBubble: {
    position: "absolute",
    borderRadius: 50,
    backgroundColor: "rgba(138, 70, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(138, 70, 255, 0.2)",
  },
  bubble1: {
    width: 80,
    height: 80,
    top: "20%",
    left: "10%",
  },
  bubble2: {
    width: 60,
    height: 60,
    top: "60%",
    right: "15%",
  },
  bubble3: {
    width: 100,
    height: 100,
    top: "40%",
    left: "70%",
  },
  bubble4: {
    width: 50,
    height: 50,
    top: "70%",
    left: "20%",
  },
  bubble5: {
    width: 70,
    height: 70,
    top: "10%",
    right: "10%",
  },
  star: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(138, 70, 255, 0.8)",
    shadowColor: "rgba(138, 70, 255, 0.5)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  mysteryIcon: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  icon1: {
    top: "30%",
    right: "20%",
  },
  icon2: {
    top: "50%",
    left: "5%",
  },
  icon3: {
    top: "80%",
    right: "5%",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 40,
  },
  hero: {
    alignItems: "center",
    gap: 16,
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 50,
    backgroundColor: "rgba(138, 70, 255, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(138, 70, 255, 0.2)",
  },
  heroTitle: {
    ...typography.display,
    color: colors.accentPurple,
    textAlign: "center",
    fontSize: 28,
    lineHeight: 34,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 16,
  },
  mysteryTagline: {
    ...typography.caption,
    color: "rgba(201, 192, 255, 0.7)",
    textAlign: "center",
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 8,
  },
  options: {
    gap: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dividerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  footer: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
