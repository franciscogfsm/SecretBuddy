import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useEffect, useState, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  Easing,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import { colors, typography } from "../theme";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

export const useEntranceHaptics = () => {
  useEffect(() => {
    let cancelled = false;

    const runHaptics = async () => {
      try {
        // Sequence of vibrations: light → medium → heavy → stop
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (cancelled) return;

        setTimeout(async () => {
          if (cancelled) return;
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 200);

        setTimeout(async () => {
          if (cancelled) return;
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 400);
      } catch (e) {
        // Ignore if not supported
      }
    };

    runHaptics();

    return () => {
      cancelled = true;
    };
  }, []);
};

const { width, height } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export const SplashScreen = ({ navigation }: Props) => {
  const { user, initializing } = useAuth();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const logoAnim = useState(new Animated.Value(0))[0];
  const textAnim = useState(new Animated.Value(50))[0];
  const blinkAnim = useState(new Animated.Value(1))[0];
  const blinkScaleAnim = useState(new Animated.Value(1))[0];
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const orb3Anim = useRef(new Animated.Value(0)).current;
  const logoBob = useRef(new Animated.Value(0)).current;
  const [displayedText, setDisplayedText] = useState("");
  const [showTagline, setShowTagline] = useState(false);
  const glowAnim = useState(new Animated.Value(0))[0];
  const insets = useSafeAreaInsets();

  // Use entrance haptics
  useEntranceHaptics();

  useEffect(() => {
    // Simplified, smoother animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Smooth text slide-up
      Animated.spring(textAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start(() => {
        // Start typewriter effect for app name
        setTimeout(() => {
          const fullText = "SecretBuddy";
          let i = 0;
          const interval = setInterval(() => {
            setDisplayedText(fullText.slice(0, i + 1));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => {}
            );
            i++;
            if (i === fullText.length) {
              setShowTagline(true);
              clearInterval(interval);
              // Navigate after typing completes
              setTimeout(() => {
                // Check if user is authenticated
                if (!initializing) {
                  if (user) {
                    // User is logged in, go to MainTabs (Home)
                    navigation.replace("MainTabs");
                  } else {
                    // User not logged in, go to AuthOptions
                    navigation.replace("AuthOptions");
                  }
                }
              }, 800);
            }
          }, 60);
        }, 100);
      });

      // subtle continuous bob for the logo to make the scene feel alive
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoBob, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(logoBob, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Start more visible orb animations with staggered starts so they feel alive
    // Continuous, slightly faster orb motion with more visible oscillation
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(orb1Anim, {
            toValue: 1,
            duration: 3200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb1Anim, {
            toValue: 0,
            duration: 3200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 0);

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(orb2Anim, {
            toValue: 1,
            duration: 3800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb2Anim, {
            toValue: 0,
            duration: 3800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 200);

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(orb3Anim, {
            toValue: 1,
            duration: 4200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb3Anim, {
            toValue: 0,
            duration: 4200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 400);
  }, [initializing, user]);

  return (
    <View style={styles.container}>
      {/* Modern Minimal Background */}
      <LinearGradient
        colors={["#060318", "#0d0720", "#12092a"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Subtle Glow Effects */}
      <View style={styles.glowContainer} pointerEvents="none">
        <View style={[styles.glow, styles.glow1]} />
        <View style={[styles.glow, styles.glow2]} />

        {/* Animated floating orbs for continuous motion (smaller, pastel) */}
        <Animated.View
          style={[
            styles.orb,
            styles.orb1,
            {
              opacity: orb1Anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.18, 0.32],
              }),
              transform: [
                {
                  translateX: orb1Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -48, 18],
                  }),
                },
                {
                  translateY: orb1Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -28, 6],
                  }),
                },
                {
                  rotate: orb1Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: ["-6deg", "0deg", "8deg"],
                  }),
                },
                {
                  scale: orb1Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.96, 1.08, 0.98],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.orb,
            styles.orb2,
            {
              opacity: orb2Anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.12, 0.26],
              }),
              transform: [
                {
                  translateX: orb2Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 28, -36],
                  }),
                },
                {
                  translateY: orb2Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -12, 30],
                  }),
                },
                {
                  rotate: orb2Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: ["-4deg", "2deg", "6deg"],
                  }),
                },
                {
                  scale: orb2Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.94, 1.02, 0.9],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.orb,
            styles.orb3,
            {
              opacity: orb3Anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.22],
              }),
              transform: [
                {
                  translateX: orb3Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 42, -12],
                  }),
                },
                {
                  translateY: orb3Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 36, -18],
                  }),
                },
                {
                  rotate: orb3Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: ["-10deg", "4deg", "8deg"],
                  }),
                },
                {
                  scale: orb3Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.92, 1.14, 0.96],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  {
                    translateY: logoBob.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.logoWrapper}>
              {/* Frosted card behind the logo */}
              <View style={styles.frostCard}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.04)", "rgba(255,255,255,0.02)"]}
                  style={styles.frostOverlay}
                />
                <View style={styles.logoGradient}>
                  <View style={styles.logoInset}>
                    <Image
                      source={require("../../assets/icon.png")}
                      style={styles.logoImage}
                      resizeMode="cover"
                    />
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* App Name */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: logoAnim,
                transform: [{ translateY: textAnim }],
              },
            ]}
          >
            <Text style={styles.appName}>{displayedText}</Text>
            {showTagline && (
              <Text style={styles.tagline}>
                Where anonymity meets connection
              </Text>
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    borderRadius: 300,
    opacity: 0.15,
  },
  glow1: {
    width: width * 1.5,
    height: width * 1.5,
    top: height * 0.2,
    left: -width * 0.3,
    backgroundColor: "#9C6BFF",
  },
  glow2: {
    width: width * 1.2,
    height: width * 1.2,
    bottom: -width * 0.2,
    right: -width * 0.4,
    backgroundColor: "#FF4FB7",
  },
  // Animated orb base style
  orb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  orb1: {
    width: width * 0.44,
    height: width * 0.44,
    left: -width * 0.18,
    top: height * 0.12,
    backgroundColor: "#7C4DFF",
  },
  orb2: {
    width: width * 0.36,
    height: width * 0.36,
    right: -width * 0.2,
    top: height * 0.06,
    backgroundColor: "#FF6BAC",
  },
  orb3: {
    width: width * 0.32,
    height: width * 0.32,
    left: width * 0.12,
    bottom: -width * 0.18,
    backgroundColor: "#3B82F6",
  },
  frostCard: {
    width: 168,
    height: 168,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 18,
    overflow: "hidden",
  },
  frostOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
    borderRadius: 36,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    marginBottom: 48,
  },
  logoWrapper: {
    padding: 0,
    borderRadius: 36,
    backgroundColor: "transparent",
  },
  logoGradient: {
    width: 140,
    height: 140,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#9C6BFF",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
    padding: 8,
    backgroundColor: "transparent",
  },
  logoInset: {
    position: "absolute",
    top: 8,
    right: 8,
    bottom: 8,
    left: 8,
    borderRadius: 26,
    backgroundColor: "transparent",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#0B0720",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  appName: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: "center",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  tagline: {
    ...typography.body,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
    letterSpacing: 0.3,
  },
});
