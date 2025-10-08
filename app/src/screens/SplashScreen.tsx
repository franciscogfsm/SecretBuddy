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
      {/* Sophisticated Dark Gradient Background */}
      <LinearGradient
        colors={["#0B0516", "#13071F", "#1A0B2E", "#0F0820"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Subtle Sophisticated Glow Effects */}
      <View style={styles.glowContainer} pointerEvents="none">
        {/* Deep ambient glows - very subtle */}
        <Animated.View
          style={[
            styles.glow,
            styles.glow1,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.15],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.glow,
            styles.glow2,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.12],
              }),
            },
          ]}
        />

        {/* Subtle animated orbs - elegant and refined */}
        <Animated.View
          style={[
            styles.orb,
            styles.orb1,
            {
              opacity: orb1Anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.08, 0.18],
              }),
              transform: [
                {
                  translateX: orb1Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -40, 20],
                  }),
                },
                {
                  translateY: orb1Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -30, 10],
                  }),
                },
                {
                  scale: orb1Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.08, 1.02],
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
                outputRange: [0.06, 0.16],
              }),
              transform: [
                {
                  translateX: orb2Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 30, -35],
                  }),
                },
                {
                  translateY: orb2Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -15, 25],
                  }),
                },
                {
                  scale: orb2Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.06, 0.98],
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
                outputRange: [0.05, 0.14],
              }),
              transform: [
                {
                  translateX: orb3Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 35, -15],
                  }),
                },
                {
                  translateY: orb3Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 30, -18],
                  }),
                },
                {
                  scale: orb3Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.1, 0.96],
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
    borderRadius: 600,
  },
  glow1: {
    width: width * 2.2,
    height: width * 2.2,
    top: -height * 0.3,
    left: -width * 0.6,
    backgroundColor: "#5B21B6",
    opacity: 0.15,
  },
  glow2: {
    width: width * 1.8,
    height: width * 1.8,
    bottom: -height * 0.35,
    right: -width * 0.5,
    backgroundColor: "#7E22CE",
    opacity: 0.12,
  },
  // Animated orb base style
  orb: {
    position: "absolute",
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  orb1: {
    width: width * 0.7,
    height: width * 0.7,
    left: -width * 0.35,
    top: height * 0.1,
    backgroundColor: "#4C1D95",
  },
  orb2: {
    width: width * 0.6,
    height: width * 0.6,
    right: -width * 0.28,
    top: height * 0.25,
    backgroundColor: "#6B21A8",
  },
  orb3: {
    width: width * 0.55,
    height: width * 0.55,
    left: width * 0.1,
    bottom: -width * 0.2,
    backgroundColor: "#581C87",
  },
  frostCard: {
    width: 140,
    height: 140,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 35,
    elevation: 20,
    overflow: "hidden",
  },
  frostOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
    borderRadius: 32,
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
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 25,
    padding: 8,
    backgroundColor: "transparent",
  },
  logoInset: {
    position: "absolute",
    top: 8,
    right: 8,
    bottom: 8,
    left: 8,
    borderRadius: 24,
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
