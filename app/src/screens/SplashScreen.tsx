import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
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
    });
  }, [initializing, user]);

  return (
    <View style={styles.container}>
      {/* Modern Minimal Background */}
      <LinearGradient
        colors={["#030108", "#0A0515", "#160B2E"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Subtle Glow Effects */}
      <View style={styles.glowContainer}>
        <View style={[styles.glow, styles.glow1]} />
        <View style={[styles.glow, styles.glow2]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.logoWrapper}>
              <View style={styles.logoGradient}>
                <View style={styles.logoInset}>
                  <Image
                    source={require("../../assets/icon1.png")}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
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
