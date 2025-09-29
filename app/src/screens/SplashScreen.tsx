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
    // Logo animation sequence
    Animated.sequence([
      // Logo appears with scale and fade
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(logoAnim, {
          toValue: 1,
          duration: 450,
          delay: 150,
          useNativeDriver: true,
        }),
      ]),
      // Logo reveals with glow
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      // Text slides up
      Animated.timing(textAnim, {
        toValue: 0,
        duration: 350,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
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
            // Navigate to auth screen after typing completes
            setTimeout(() => {
              navigation.replace("AuthOptions");
            }, 1000);
          }
        }, 70);
      }, 300);
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Modern Background */}
      <LinearGradient
        colors={["#05030C", "#0B0520", "#140A35"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Enhanced Geometric Elements */}
      <View style={styles.geometricContainer}>
        <LinearGradient
          colors={["#FF4FB7", "#9C6BFF"]}
          style={[styles.geometricShape, styles.shape1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={["#2EE6A9", "#1FC7B4"]}
          style={[styles.geometricShape, styles.shape2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
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
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.logoWrapper}>
              <LinearGradient
                colors={[
                  "rgba(47, 13, 103, 0.7)",
                  "rgba(51, 10, 132, 0.7)",
                  "rgba(57, 10, 122, 0.7)",
                ]}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.logoInset}>
                  <Image
                    source={require("../../assets/icon1.png")}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                </View>
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: "rgba(255,255,255,0.4)",
                      opacity: glowAnim,
                      borderRadius: 22,
                    },
                  ]}
                />
              </LinearGradient>
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
    opacity: 0.05,
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
  shape3: {
    width: width * 0.7,
    height: width * 0.7,
    top: height * 0.2,
    left: -width * 0.1,
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
    width: 120,
    height: 120,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2860b357",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 14,
    padding: 6,
    backgroundColor: "transparent",
  },
  logoInset: {
    position: "absolute",
    top: 6,
    right: 6,
    bottom: 6,
    left: 6,
    borderRadius: 22,
    backgroundColor: "#0B0720",
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
    width: "96%",
    height: "96%",
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  appName: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: "center",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1.2,
    marginBottom: 12,
    textShadowColor: "rgba(255, 79, 183, 0.3)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  tagline: {
    ...typography.body,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
});
