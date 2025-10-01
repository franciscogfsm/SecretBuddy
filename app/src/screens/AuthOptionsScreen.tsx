import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
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
      {/* Modern Gradient Background */}
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
                <Text style={styles.footerLink}>Terms of Service</Text> and{" "}
                <Text style={styles.footerLink}>Privacy Policy</Text>
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
    borderRadius: 300,
    opacity: 0.12,
  },
  glow1: {
    width: width * 1.5,
    height: width * 1.5,
    top: height * 0.15,
    left: -width * 0.3,
    backgroundColor: "#9C6BFF",
  },
  glow2: {
    width: width * 1.3,
    height: width * 1.3,
    bottom: -width * 0.3,
    right: -width * 0.4,
    backgroundColor: "#FF4FB7",
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
    backgroundColor: "rgba(11, 7, 32, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.2)",
    shadowColor: "#9C6BFF",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 16,
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
