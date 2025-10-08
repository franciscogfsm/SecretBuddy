import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useEffect, useState, useRef } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Linking,
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

const { width, height } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "AuthOptions">;

export const AuthOptionsScreen = ({ navigation }: Props) => {
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const orb3Anim = useRef(new Animated.Value(0)).current;

  const { googleSignIn } = useAuth();

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Start animated orbs with staggered timing
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(orb1Anim, {
            toValue: 1,
            duration: 3500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb1Anim, {
            toValue: 0,
            duration: 3500,
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
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb2Anim, {
            toValue: 0,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 300);

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(orb3Anim, {
            toValue: 1,
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb3Anim, {
            toValue: 0,
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 600);
  }, []);

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
      <View style={styles.glowContainer}>
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
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.mainContent}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Get Started</Text>
              <Text style={styles.heroSubtitle}>
                Choose your preferred method to{"\n"}join SecretBuddy
              </Text>
            </View>

            {/* Auth Options Card */}
            <View style={styles.authCard}>
              <View style={styles.cardContent}>
                {/* Social Login Buttons */}
                <TouchableOpacity
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={handleGoogleSignIn}
                  activeOpacity={0.92}
                >
                  {Platform.OS === "web" ? (
                    <View style={styles.googleIconContainer}>
                      <Image
                        source={{
                          uri: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjIuNTYgMTIuMjVDMjIuNTYgMTEuNDcgMjIuNDkgMTAuNzIgMjIuMzYgMTBIMTZWMTAuNzJIMTYuMDNWMTRIMjAuMzJDMjAuMSAxNS4zMSAxOS40NCAxNi4wOCAxOC40NiAxNi41OFYxOS4zNEgyMC42N0MyMS45NyAxOC4xNiAyMi41NiAxNS40MyAyMi41NiAxMi4yNVoiIGZpbGw9IiM0Mjg1RjQiLz48cGF0aCBkPSJNMTYgMjJDMTguNDMgMjIgMjAuNDcgMjEuMTkgMjEuOTYgMTkuNThMMTkuNzUgMTYuODFDMTkuMDkgMTcuMyAxOC4xMiAxNy42MiAxNiAxNy42MkMxMy42NSAxNy42MiAxMS42NyAxNS45MiAxMC45NiAxNC43SDYuMDlWMTcuNjJDNy41NyAxOS41OSAxMC41NCAyMiAxMyAyMkgxNloiIGZpbGw9IiMzNEE4NTMiLz48cGF0aCBkPSJNMTAuOTYgMTQuN0MxMC42NiAxNCA4IDEzLjUgOCAxMi41UzEwIDExIDEwLjk2IDEwLjNWNz4iIGZpbGw9IiNGQkJDMDQiLz48cGF0aCBkPSJNMTYgNy4zOEMxOC4yNyA3LjM4IDIwLjM1IDguMjQgMjEuOTYgOS44MUwyNC40NyA3LjMxQzIxLjk2IDUuMDIgMTguNDMgNCAxNiA0QzEzLjg4IDQgOCA2LjQxIDYuMDkgNy4zOEwxMC45NiAxMC4zQzExLjY3IDkuMDkgMTMuNjUgNy4zOCAxNiA3LjM4WiIgZmlsbD0iI0VBNDMzNSIvPjwvc3ZnPg==",
                        }}
                        style={styles.googleIcon}
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <View style={styles.googleIconContainerNative}>
                      <FontAwesome name="google" size={20} color="#4285F4" />
                    </View>
                  )}
                  <Text style={styles.googleButtonText}>
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={[styles.socialButton, styles.appleButton]}
                    onPress={() =>
                      navigation.navigate({
                        name: "Onboarding",
                        params: {},
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <View style={styles.iconContainer}>
                      <FontAwesome name="apple" size={24} color="white" />
                    </View>
                    <Text style={styles.appleButtonText}>
                      Continue with Apple
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Email Button */}
                <TouchableOpacity
                  style={styles.emailButton}
                  onPress={() =>
                    navigation.navigate({ name: "Onboarding", params: {} })
                  }
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[
                      "rgba(156, 107, 255, 0.1)",
                      "rgba(46, 230, 169, 0.1)",
                    ]}
                    style={styles.emailButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={styles.iconContainer}>
                      <MaterialIcons
                        name="email"
                        size={22}
                        color={colors.accentPurple}
                      />
                    </View>
                    <Text style={styles.emailButtonText}>
                      Continue with Email
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footerContainer}>
              <Text style={styles.footer}>
                By continuing, you agree to our{" "}
                <Text
                  style={styles.footerLink}
                  onPress={() =>
                    Linking.openURL("https://secret-buddy-web.vercel.app/terms")
                  }
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  style={styles.footerLink}
                  onPress={() =>
                    Linking.openURL(
                      "https://secret-buddy-web.vercel.app/privacy"
                    )
                  }
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>
        </Animated.View>
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
    top: -height * 0.25,
    left: -width * 0.6,
    backgroundColor: "#5B21B6",
    opacity: 0.15,
  },
  glow2: {
    width: width * 1.8,
    height: width * 1.8,
    bottom: -height * 0.3,
    right: -width * 0.5,
    backgroundColor: "#7E22CE",
    opacity: 0.12,
  },
  // Animated orbs
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
    top: height * 0.05,
    backgroundColor: "#4C1D95",
  },
  orb2: {
    width: width * 0.6,
    height: width * 0.6,
    right: -width * 0.28,
    bottom: height * 0.2,
    backgroundColor: "#6B21A8",
  },
  orb3: {
    width: width * 0.55,
    height: width * 0.55,
    left: width * 0.05,
    bottom: -width * 0.2,
    backgroundColor: "#581C87",
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 48,
    paddingTop: 20,
  },

  heroTitle: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: "center",
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -1,
    marginBottom: 12,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  authCard: {
    marginHorizontal: 20,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "rgba(17, 10, 30, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.15)",
    shadowColor: "#5B21B6",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  cardContent: {
    padding: 28,
    gap: 18,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 10,
    borderWidth: 1.5,
    minHeight: 52,
    maxWidth: width - 80, // Ensure buttons don't exceed screen width minus padding
  },
  googleButton: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(66, 133, 244, 0.2)",
    shadowColor: "#4285F4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  appleButton: {
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f1f1f",
  },
  appleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.background,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 14,
    fontWeight: "500",
  },
  emailButton: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(156, 107, 255, 0.35)",
    overflow: "hidden",
    shadowColor: "#9C6BFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 56,
  },
  emailButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  emailButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  footerContainer: {
    marginTop: "auto",
    paddingTop: 40,
  },
  footer: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  footerLink: {
    color: colors.accentPurple,
    textDecorationLine: "underline",
  },
  // Blur and icon styles
  blurView: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.02)", // Further reduced opacity for enhanced transparency
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "white",
    padding: 2,
  },
  googleIconContainerNative: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "white",
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
});
