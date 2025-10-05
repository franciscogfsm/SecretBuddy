import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ErrorModal } from "../components/ErrorModal";
import type { RootStackParamList } from "../navigation/types";
import { colors, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

const ATTEMPTS_KEY = "forgotPasswordAttempts";
const MAX_ATTEMPTS = 3;
const COOLDOWN_AFTER_SECOND = 2 * 60 * 1000; // 2 minutes
const WINDOW_TIME = 60 * 1000; // 1 minute

interface AttemptData {
  count: number;
  lastAttempt: number;
}

export const ForgotPasswordScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "error" | "warning" | "info";
  }>({
    visible: false,
    title: "",
    message: "",
    type: "error",
  });

  const insets = useSafeAreaInsets();

  const showCustomError = (
    title: string,
    message: string,
    type: "error" | "warning" | "info" = "error"
  ) => {
    setErrorModal({
      visible: true,
      title,
      message,
      type,
    });
  };

  const hideErrorModal = () => {
    setErrorModal((prev) => ({ ...prev, visible: false }));
  };

  const getCustomErrorMessage = (error: any) => {
    if (error?.code) {
      switch (error.code) {
        case "auth/user-not-found":
          return {
            title: "Account Not Found",
            message: "We couldn't find an account with this email.",
          };
        case "auth/invalid-email":
          return {
            title: "Invalid Email",
            message: "Please enter a valid email address.",
          };
        case "auth/too-many-requests":
          return {
            title: "Too Many Attempts",
            message:
              "Too many reset requests. Please wait a few minutes before trying again.",
          };
        default:
          return {
            title: "Reset Failed",
            message: "Something went wrong. Please try again.",
          };
      }
    }
    return {
      title: "Unexpected Error",
      message: error?.message || "Something went wrong. Please try again.",
    };
  };

  const checkRateLimit = async (): Promise<{
    allowed: boolean;
    waitTime?: number;
  }> => {
    try {
      const stored = await AsyncStorage.getItem(ATTEMPTS_KEY);
      const data: AttemptData = stored
        ? JSON.parse(stored)
        : { count: 0, lastAttempt: 0 };
      const now = Date.now();

      // Reset count if window has passed
      if (now - data.lastAttempt > WINDOW_TIME) {
        data.count = 0;
      }

      if (data.count >= MAX_ATTEMPTS) {
        return {
          allowed: false,
          waitTime: WINDOW_TIME - (now - data.lastAttempt),
        };
      }

      // After 2nd attempt, enforce 2-minute cooldown
      if (data.count >= 2 && now - data.lastAttempt < COOLDOWN_AFTER_SECOND) {
        return {
          allowed: false,
          waitTime: COOLDOWN_AFTER_SECOND - (now - data.lastAttempt),
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error("Error checking rate limit:", error);
      return { allowed: true }; // Allow on error
    }
  };

  const updateAttempts = async () => {
    try {
      const stored = await AsyncStorage.getItem(ATTEMPTS_KEY);
      const data: AttemptData = stored
        ? JSON.parse(stored)
        : { count: 0, lastAttempt: 0 };
      const now = Date.now();

      if (now - data.lastAttempt > WINDOW_TIME) {
        data.count = 1;
      } else {
        data.count += 1;
      }
      data.lastAttempt = now;

      await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Error updating attempts:", error);
    }
  };

  const handleSendReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail) {
      showCustomError(
        "Email Required",
        "Please enter your email address.",
        "warning"
      );
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      showCustomError(
        "Invalid Email",
        "Please enter a valid email address.",
        "warning"
      );
      return;
    }

    const rateCheck = await checkRateLimit();
    if (!rateCheck.allowed) {
      const waitMinutes = Math.ceil((rateCheck.waitTime || 0) / 60000);
      showCustomError(
        "Too Many Attempts",
        `Please wait ${waitMinutes} minute${
          waitMinutes > 1 ? "s" : ""
        } before trying again.`,
        "warning"
      );
      return;
    }

    try {
      setLoading(true);
      const { sendPasswordResetEmail } = await import("../lib/firebaseAuth");
      const { auth } = await import("../config/firebase");

      await sendPasswordResetEmail(auth, normalizedEmail);
      await updateAttempts();

      showCustomError(
        "Reset Email Sent",
        "Check your inbox for password reset instructions. If you don't see it, check your spam folder.",
        "info"
      );
    } catch (err) {
      const errorInfo = getCustomErrorMessage(err);
      showCustomError(errorInfo.title, errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground gradient="midnight" noPadding>
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.backButtonContainer, { top: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Go back"
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={[styles.content, { paddingTop: insets.top + 60 }]}
            bounces={true}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
          >
            <View style={styles.header}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your
                password.
              </Text>
            </View>

            <View style={styles.card}>
              <InputField
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="you@example.com"
              />
              <PrimaryButton
                label="Send Reset Email"
                onPress={handleSendReset}
                loading={loading}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        type={errorModal.type}
        onClose={hideErrorModal}
      />
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backButtonContainer: {
    position: "absolute",
    top: 70,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    gap: 8,
    marginBottom: 24,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    gap: 16,
    backgroundColor: "rgba(14, 8, 38, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
});
