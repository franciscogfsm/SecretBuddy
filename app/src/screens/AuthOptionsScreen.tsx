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
  const insets = useSafeAreaInsets();

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
      {/* Background with geometric elements */}
      <LinearGradient
        colors={["#070319", "#1C0E3C", "#2A1458"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Geometric accent elements */}
      <View style={styles.geometricContainer}>
        <LinearGradient
          colors={["#6C3BFF", "#FF4FB7"]}
          style={[styles.geometricShape, styles.shape1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={["#1FC7B4", "#2360FF"]}
          style={[styles.geometricShape, styles.shape2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
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
              <Text style={styles.heroTitle}>Continue to get started</Text>
              <Text style={styles.heroSubtitle}>
                Choose your preferred sign-in method{"\n"}to join the community
              </Text>
            </View>

            {/* Auth Options Card */}
            <View style={styles.authCard}>
              <BlurView intensity={70} tint="dark" style={styles.blurView}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.03)"]}
                  style={styles.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
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
                          <FontAwesome
                            name="google"
                            size={20}
                            color="#4285F4"
                          />
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
                </LinearGradient>
              </BlurView>
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
    borderRadius: 100,
    opacity: 0.15,
  },
  shape1: {
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.4,
    right: -width * 0.3,
  },
  shape2: {
    width: width * 0.6,
    height: width * 0.6,
    bottom: -width * 0.2,
    left: -width * 0.2,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 30,
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
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  authCard: {
    marginHorizontal: 0,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.7,
    shadowRadius: 32,
    elevation: 15,
    backgroundColor: "rgba(5, 3, 18, 0.25)",
  },
  cardGradient: {
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 28,
    padding: 1,
  },
  cardContent: {
    padding: 36,
    gap: 16,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1.5,
    minHeight: 56,
  },
  googleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
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
    fontSize: 16,
    fontWeight: "600",
    color: "#1f1f1f",
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  socialButtonText: {
    fontSize: 16,
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
    borderRadius: 16,
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
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  emailButtonText: {
    fontSize: 16,
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
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "rgba(10, 8, 28, 0.35)",
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
