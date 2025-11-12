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
import { useAppState } from "../store/AppStateContext";

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
  const { profile } = useAppState();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const logoAnim = useState(new Animated.Value(0))[0];
  const textAnim = useState(new Animated.Value(50))[0];
  const blinkAnim = useState(new Animated.Value(1))[0];
  const blinkScaleAnim = useState(new Animated.Value(1))[0];
  const particle1Anim = useRef(new Animated.Value(0)).current;
  const particle2Anim = useRef(new Animated.Value(0)).current;
  const particle3Anim = useRef(new Animated.Value(0)).current;
  const particle4Anim = useRef(new Animated.Value(0)).current;
  const logoBob = useRef(new Animated.Value(0)).current;
  const meshAnim = useRef(new Animated.Value(0)).current;
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
              // Auto-navigate after splash animation completes
              setTimeout(() => {
                if (!initializing) {
                  if (user && profile) {
                    // User is fully authenticated (Firebase + profile) - go to home
                    navigation.replace("MainTabs");
                  } else if (user && !profile) {
                    // User logged in but needs onboarding
                    navigation.replace("Onboarding", {});
                  } else {
                    // No user - show auth options
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

    // Start elegant particle animations with smooth, organic motion
    // Gradient mesh effect - more professional than bubbles
    Animated.loop(
      Animated.timing(meshAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(particle1Anim, {
            toValue: 1,
            duration: 4500,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(particle1Anim, {
            toValue: 0,
            duration: 4500,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 0);

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(particle2Anim, {
            toValue: 1,
            duration: 5200,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(particle2Anim, {
            toValue: 0,
            duration: 5200,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 300);

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(particle3Anim, {
            toValue: 1,
            duration: 4800,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(particle3Anim, {
            toValue: 0,
            duration: 4800,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 600);

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(particle4Anim, {
            toValue: 1,
            duration: 5500,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(particle4Anim, {
            toValue: 0,
            duration: 5500,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 900);
  }, [initializing, user, profile, navigation]);

  return (
    <View style={styles.container}>
      {/* Deep Professional Dark Gradient Background */}
      <LinearGradient
        colors={["#050208", "#0A0412", "#0D0619", "#080310"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Modern Gradient Mesh Background */}
      <View style={styles.meshContainer} pointerEvents="none">
        {/* Ambient gradient layers */}
        <Animated.View
          style={[
            styles.gradientLayer,
            styles.gradientLayer1,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.25],
              }),
              transform: [
                {
                  rotate: meshAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.gradientLayer,
            styles.gradientLayer2,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.2],
              }),
              transform: [
                {
                  rotate: meshAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["360deg", "0deg"],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Elegant floating particles - professional and subtle */}
        <Animated.View
          style={[
            styles.particle,
            styles.particle1,
            {
              opacity: particle1Anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.4, 0.7, 0.4],
              }),
              transform: [
                {
                  translateY: particle1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -80],
                  }),
                },
                {
                  translateX: particle1Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 30, 0],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.particle,
            styles.particle2,
            {
              opacity: particle2Anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.35, 0.65, 0.35],
              }),
              transform: [
                {
                  translateY: particle2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 100],
                  }),
                },
                {
                  translateX: particle2Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -40, 0],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.particle,
            styles.particle3,
            {
              opacity: particle3Anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 0.6, 0.3],
              }),
              transform: [
                {
                  translateY: particle3Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -60],
                  }),
                },
                {
                  translateX: particle3Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -25, 0],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.particle,
            styles.particle4,
            {
              opacity: particle4Anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.25, 0.55, 0.25],
              }),
              transform: [
                {
                  translateY: particle4Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 70],
                  }),
                },
                {
                  translateX: particle4Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 35, 0],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo - Clean and Professional */}
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
                      outputRange: [0, -10],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.logoWrapper}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
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
  meshContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  // Gradient mesh layers - sophisticated and modern
  gradientLayer: {
    position: "absolute",
    borderRadius: 9999,
  },
  gradientLayer1: {
    width: width * 1.8,
    height: width * 1.8,
    top: -height * 0.2,
    left: -width * 0.4,
    backgroundColor: "#4C1D95",
    opacity: 0.15,
  },
  gradientLayer2: {
    width: width * 1.6,
    height: width * 1.6,
    bottom: -height * 0.25,
    right: -width * 0.3,
    backgroundColor: "#5B21B6",
    opacity: 0.12,
  },
  // Elegant floating particles
  particle: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "rgba(139, 92, 246, 0.4)",
  },
  particle1: {
    width: 4,
    height: 4,
    left: width * 0.2,
    top: height * 0.3,
  },
  particle2: {
    width: 6,
    height: 6,
    right: width * 0.25,
    top: height * 0.4,
  },
  particle3: {
    width: 3,
    height: 3,
    left: width * 0.7,
    top: height * 0.25,
  },
  particle4: {
    width: 5,
    height: 5,
    right: width * 0.15,
    bottom: height * 0.35,
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
    marginBottom: 56,
  },
  logoWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 25,
  },
  logoImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
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
