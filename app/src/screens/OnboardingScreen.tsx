import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { GradientBackground } from "../components/GradientBackground";
import { CountryDropdown } from "../components/CountryDropdown";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ErrorModal } from "../components/ErrorModal";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { useAppState } from "../store/AppStateContext";
import { colors, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

type PersonaDetails = {
  trimmedName: string;
  trimmedCountry: string;
  numericAge: number;
};

const signupSteps = [
  {
    key: "account",
    title: "Create your account",
    caption: "Add your login details to get started.",
  },
  {
    key: "profile",
    title: "Set up your profile",
    caption: "Share a few basics so your friends recognize you.",
  },
] as const;

export const OnboardingScreen = ({ navigation, route }: Props) => {
  const { profile, setProfile } = useAppState();
  const {
    user,
    emailSignIn,
    emailSignUp,
    googleSignIn,
    loading: authLoading,
    error: authError,
    supportsGoogleSignIn,
  } = useAuth();

  const [signupStage, setSignupStage] = useState<0 | 1>(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [activeAction, setActiveAction] = useState<"email" | "google" | null>(
    null
  );
  const [signupCredentials, setSignupCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

  const fadeAnim = useState(new Animated.Value(0))[0];

  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isCompactLayout = height < 760;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);
  const isSignup = authMode === "signup";
  const isBusy = authLoading && activeAction !== null;
  const isEmailLoading = authLoading && activeAction === "email";
  const isSocialLoading = (provider: "google") =>
    authLoading && activeAction === provider;

  const stepMeta = useMemo(() => {
    if (!isSignup) {
      return {
        title: "Welcome back",
        caption: "Log in to uncover today's secret connection.",
      } as const;
    }
    return signupSteps[signupStage];
  }, [signupStage, isSignup]);

  // Custom error helper function
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

  // Format Firebase errors into user-friendly messages
  const getCustomErrorMessage = (error: any) => {
    if (error?.code) {
      switch (error.code) {
        case "auth/email-already-in-use":
          return {
            title: "Email Already Registered",
            message:
              "This email is already registered. Try signing in instead or use a different email.",
          };
        case "auth/invalid-credential":
        case "auth/wrong-password":
          return {
            title: "Incorrect Credentials",
            message:
              "The email or password you entered is incorrect. Please check and try again.",
          };
        case "auth/user-not-found":
          return {
            title: "Account Not Found",
            message:
              "We couldn't find an account with this email. Try creating a new account instead.",
          };
        case "auth/weak-password":
          return {
            title: "Weak Password",
            message:
              "Please choose a stronger password with at least 6 characters.",
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
              "Too many failed attempts. Please wait a few minutes before trying again.",
          };
        case "auth/network-request-failed":
          return {
            title: "Network Error",
            message: "Please check your internet connection and try again.",
          };
        default:
          return {
            title: "Authentication Error",
            message: "Something went wrong. Please try again.",
          };
      }
    }
    return {
      title: "Unexpected Error",
      message: error?.message || "Something went wrong. Please try again.",
    };
  };

  useEffect(() => {
    if (route.params?.mode) {
      setAuthMode(route.params.mode);
    }
  }, [route.params?.mode]);

  useEffect(() => {
    if (!user || authMode !== "signin") {
      return;
    }
    if (user.displayName) {
      setName(user.displayName);
    }
    if (user.email) {
      setEmail(user.email);
    }
  }, [user, authMode]);

  const validatePersona = (): PersonaDetails | null => {
    const trimmedName = name.trim();
    const trimmedCountry = country.trim();
    const numericAge = Number(age);

    if (!trimmedName || !trimmedCountry) {
      showCustomError(
        "Missing Details",
        "Your name and country help friends know it's really you.",
        "warning"
      );
      return null;
    }

    if (Number.isNaN(numericAge) || numericAge < 18) {
      showCustomError(
        "Age Requirement",
        "You must be 18 or older to use SecretBuddy.",
        "warning"
      );
      return null;
    }

    return { trimmedName, trimmedCountry, numericAge };
  };

  const ensureCredentials = () => {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordValue = password.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail || !passwordValue) {
      showCustomError(
        "Missing Credentials",
        "Enter an email and password to continue.",
        "warning"
      );
      return null;
    }

    if (!emailPattern.test(normalizedEmail)) {
      showCustomError(
        "Invalid Email",
        "Double-check the email address before you continue.",
        "warning"
      );
      return null;
    }

    if (passwordValue.length < 6) {
      showCustomError(
        "Password Too Short",
        "Use at least 6 characters for your password.",
        "warning"
      );
      return null;
    }

    return {
      email: normalizedEmail,
      password: passwordValue,
    };
  };

  const enterApp = (details?: PersonaDetails | null) => {
    const derivedName = details?.trimmedName?.length
      ? details.trimmedName
      : profile?.name ?? user?.displayName ?? "New member";
    const derivedAge = details?.numericAge ?? profile?.age ?? 18;
    const derivedCountry =
      details?.trimmedCountry ?? profile?.country ?? "Global";

    setProfile({
      name: derivedName,
      username: username || `user${Date.now()}`,
      age: derivedAge,
      ageVisible: true, // Default to visible, user can change in privacy settings
      country: derivedCountry,
      mode: profile?.mode ?? "global",
    });
    navigation.replace("MainTabs");
  };

  const openLegalLink = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert(
        "Link unavailable",
        "We couldn't open that page right now. Please try again later."
      )
    );
  };

  const handleSignupCredentials = () => {
    const credentials = ensureCredentials();
    if (!credentials) {
      return;
    }

    if (!acceptedTerms) {
      showCustomError(
        "Accept Terms",
        "Please agree to the Terms of Service and Privacy Policy to continue.",
        "warning"
      );
      return;
    }

    setSignupCredentials(credentials);
    setSignupStage(1);
  };

  const handleCompleteSignup = async () => {
    const persona = validatePersona();
    if (!persona) {
      return;
    }

    if (!signupCredentials && !user) {
      showCustomError(
        "Almost There!",
        "Go back and confirm your account details before finishing up.",
        "warning"
      );
      return;
    }

    try {
      if (signupCredentials) {
        setActiveAction("email");
        await emailSignUp(
          signupCredentials.email,
          signupCredentials.password,
          persona.trimmedName
        );
      }
      enterApp(persona);
      setSignupCredentials(null);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("cancel")
      ) {
        return;
      }
      const errorInfo = getCustomErrorMessage(err);
      showCustomError(errorInfo.title, errorInfo.message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleLogin = async () => {
    const credentials = ensureCredentials();
    if (!credentials) {
      return;
    }

    try {
      setActiveAction("email");
      await emailSignIn(credentials.email, credentials.password);
      enterApp();
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("cancel")
      ) {
        return;
      }
      const errorInfo = getCustomErrorMessage(err);
      showCustomError(errorInfo.title, errorInfo.message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleProvider = async (provider: "google") => {
    if (authMode === "signup" && signupStage === 0 && !acceptedTerms) {
      showCustomError(
        "Accept Terms",
        "Please agree to the Terms of Service and Privacy Policy to continue.",
        "warning"
      );
      return;
    }

    try {
      setActiveAction(provider);
      if (provider === "google") {
        await googleSignIn();
      }

      if (authMode === "signup") {
        setSignupCredentials(null);
        setSignupStage(1);
      } else {
        enterApp();
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("cancel")
      ) {
        return;
      }
      const errorInfo = getCustomErrorMessage(err);
      showCustomError(errorInfo.title, errorInfo.message);
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <GradientBackground gradient="midnight" noPadding>
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.backButtonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate("AuthOptions")}
              accessibilityLabel="Go back to authentication options"
            >
              <FontAwesome
                name="arrow-left"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={[
              styles.content,
              { paddingTop: insets.top + 20, paddingBottom: 24 },
              isCompactLayout && styles.contentCompact,
              isCompactLayout && { paddingTop: insets.top + 12 },
            ]}
            bounces={true}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
          >
            <Animated.View
              style={[
                { opacity: fadeAnim },
                styles.hero,
                isCompactLayout && styles.heroCompact,
              ]}
            >
              <Text
                style={[
                  styles.heroTitle,
                  isCompactLayout && styles.heroTitleCompact,
                ]}
              >
                SecretBuddy
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  isCompactLayout && styles.heroSubtitleCompact,
                ]}
              >
                Share moods anonymously daily.
              </Text>
            </Animated.View>

            <View
              style={[
                styles.header,
                isCompactLayout && styles.headerCompact,
                !isSignup && styles.headerSignin,
              ]}
            >
              <View style={styles.titleRow}>
                {!isSignup && (
                  <FontAwesome
                    name="user"
                    size={20}
                    color={colors.textPrimary}
                    style={styles.titleIcon}
                  />
                )}
                <Text
                  style={[styles.title, isCompactLayout && styles.titleCompact]}
                >
                  {stepMeta.title}
                </Text>
              </View>
              <Text
                style={[
                  styles.subtitle,
                  isCompactLayout && styles.subtitleCompact,
                ]}
              >
                {stepMeta.caption}
              </Text>
            </View>

            {isSignup && signupStage === 1 ? (
              <View
                style={[styles.card, isCompactLayout && styles.cardCompact]}
              >
                <InputField
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  autoComplete="name"
                  textContentType="name"
                  autoCapitalize="words"
                />
                <InputField
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="johndoe123"
                  autoComplete="username"
                  textContentType="username"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.ageWarning}>
                  You must be 18 or older to use SecretBuddy.
                </Text>
                <View style={styles.horizontalInputs}>
                  <InputField
                    label="Age"
                    value={age}
                    keyboardType="number-pad"
                    onChangeText={setAge}
                    placeholder="18+"
                    style={styles.halfInput}
                  />
                  <CountryDropdown
                    label="Country"
                    value={country}
                    onSelect={setCountry}
                    placeholder="Portugal"
                    containerStyle={styles.halfInput}
                  />
                </View>
                <PrimaryButton
                  label="Finish setup"
                  onPress={handleCompleteSignup}
                  loading={isEmailLoading}
                  disabled={isBusy && activeAction !== "email"}
                />
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => setSignupStage(0)}
                >
                  <Text style={styles.backLinkLabel}>Back to account</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!isSignup || signupStage === 0 ? (
              <View
                style={[
                  styles.card,
                  styles.accountCard,
                  isCompactLayout && styles.cardCompact,
                  isCompactLayout && styles.accountCardCompact,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.modeSwitch}>
                    <TouchableOpacity
                      onPress={() => setAuthMode("signup")}
                      style={[
                        styles.modeChip,
                        authMode === "signup" && styles.modeChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeChipLabel,
                          authMode === "signup" && styles.modeChipLabelActive,
                        ]}
                      >
                        Create account
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setAuthMode("signin")}
                      style={[
                        styles.modeChip,
                        authMode === "signin" && styles.modeChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeChipLabel,
                          authMode === "signin" && styles.modeChipLabelActive,
                        ]}
                      >
                        Log in
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formStack}>
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
                  <InputField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Minimum 6 characters"
                    secureTextEntry
                    autoComplete={
                      authMode === "signup"
                        ? "new-password"
                        : "current-password"
                    }
                    textContentType={
                      authMode === "signup" ? "newPassword" : "password"
                    }
                  />
                </View>

                <View style={styles.metaSection}>
                  {authMode === "signup" ? (
                    <TouchableOpacity
                      style={[styles.termsRow, styles.termsSurface]}
                      activeOpacity={0.8}
                      onPress={() => setAcceptedTerms((prev) => !prev)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          acceptedTerms && styles.checkboxChecked,
                        ]}
                      >
                        {acceptedTerms ? (
                          <FontAwesome
                            name="check"
                            size={12}
                            color={colors.background}
                          />
                        ) : null}
                      </View>
                      <Text style={styles.termsText}>
                        I agree to
                        <Text
                          style={styles.termsLink}
                          onPress={(event) => {
                            event.stopPropagation();
                            openLegalLink("https://secretbuddy.app/terms");
                          }}
                        >
                          {" "}
                          Terms of Service
                        </Text>{" "}
                        and
                        <Text
                          style={styles.termsLink}
                          onPress={(event) => {
                            event.stopPropagation();
                            openLegalLink("https://secretbuddy.app/privacy");
                          }}
                        >
                          {" "}
                          Privacy Policy
                        </Text>
                        .
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <Text style={styles.termsHint}>
                        By logging in, you agree to our Terms and Privacy
                        Policy.
                      </Text>
                      <TouchableOpacity
                        style={styles.forgotLink}
                        onPress={() =>
                          showCustomError(
                            "Forgot Password?",
                            "Contact support@secretbuddy.app for help resetting your password.",
                            "info"
                          )
                        }
                      >
                        <Text style={styles.forgotLinkLabel}>
                          Forgot password?
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <View style={styles.actionStack}>
                  <PrimaryButton
                    label={
                      authMode === "signup"
                        ? signupStage === 0
                          ? "Continue"
                          : "Finish setup"
                        : "Log in"
                    }
                    onPress={
                      authMode === "signup"
                        ? signupStage === 0
                          ? handleSignupCredentials
                          : handleCompleteSignup
                        : handleLogin
                    }
                    loading={isEmailLoading}
                    disabled={
                      (isBusy && activeAction !== "email") ||
                      (authMode === "signup" &&
                        signupStage === 0 &&
                        !acceptedTerms)
                    }
                  />

                  {supportsGoogleSignIn ? (
                    <>
                      <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerLabel}>or</Text>
                        <View style={styles.dividerLine} />
                      </View>
                      <PrimaryButton
                        label={
                          authMode === "signup"
                            ? "Sign up with Google"
                            : "Log in with Google"
                        }
                        variant="ghost"
                        onPress={() => handleProvider("google")}
                        loading={isSocialLoading("google")}
                        disabled={
                          (isBusy && activeAction !== "google") ||
                          (authMode === "signup" &&
                            signupStage === 0 &&
                            !acceptedTerms)
                        }
                        leadingIcon={
                          <FontAwesome
                            name="google"
                            size={18}
                            color={colors.textSecondary}
                          />
                        }
                      />
                    </>
                  ) : null}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Custom Error Modal */}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 20,
    gap: 12,
  },
  contentCompact: {
    paddingTop: 12,
    gap: 10,
  },
  hero: {
    gap: 4,
    marginBottom: 8,
  },
  heroCompact: {
    gap: 2,
    marginBottom: 0,
  },
  heroTitle: {
    ...typography.title,
    color: colors.accentPurple,
    letterSpacing: 0.5,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "bold",
    textAlign: "center",
  },
  heroTitleCompact: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
    fontSize: 16,
    textAlign: "center",
  },
  heroSubtitleCompact: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  stepper: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  stepperCompact: {
    marginBottom: 0,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(21, 12, 46, 0.5)",
  },
  stepIndicatorActive: {
    borderColor: colors.accentPurple,
    backgroundColor: "rgba(138, 70, 255, 0.2)",
  },
  stepIndicatorComplete: {
    backgroundColor: colors.accentPurple,
  },
  stepIndex: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  stepLabel: {
    marginTop: 8,
    ...typography.caption,
    color: colors.textSecondary,
  },
  stepLabelActive: {
    color: colors.textPrimary,
  },
  stepLabelComplete: {
    color: colors.accentTeal,
  },
  header: {
    gap: 8,
  },
  headerCompact: {
    gap: 6,
  },
  headerSignin: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleIcon: {
    marginTop: 2,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 32,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  subtitleCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  signinTeaser: {
    ...typography.caption,
    color: "rgba(201, 192, 255, 0.7)",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  card: {
    borderRadius: 28,
    padding: 20,
    gap: 16,
    backgroundColor: "rgba(14, 8, 38, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    shadowColor: "#12052c",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 4,
  },
  cardCompact: {
    padding: 16,
    gap: 12,
  },
  horizontalInputs: {
    flexDirection: "row",
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  supportText: {
    ...typography.caption,
    color: "rgba(201, 192, 255, 0.7)",
    lineHeight: 18,
  },
  ageWarning: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  accountCard: {
    gap: 20,
  },
  accountCardCompact: {
    gap: 16,
  },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  modeChip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modeChipActive: {
    backgroundColor: "rgba(138, 70, 255, 0.22)",
  },
  modeChipLabel: {
    ...typography.caption,
    color: "rgba(201,192,255,0.75)",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  modeChipLabelActive: {
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...typography.body,
    color: "rgba(201,192,255,0.85)",
    lineHeight: 22,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 4,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dividerLabel: {
    ...typography.caption,
    color: "rgba(201,192,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  backLink: {
    alignItems: "center",
  },
  backLinkLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  footerNote: {
    ...typography.caption,
    color: "rgba(201,192,255,0.6)",
    textAlign: "center",
  },
  footerNoteCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    width: "100%",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(138, 70, 255, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.accentPurple,
    borderColor: colors.accentPurple,
  },
  termsText: {
    ...typography.caption,
    color: "rgba(201,192,255,0.88)",
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.accentPink,
    textDecorationLine: "underline",
  },
  termsHint: {
    ...typography.caption,
    color: "rgba(201,192,255,0.8)",
    lineHeight: 20,
    textAlign: "left",
  },
  forgotLink: {
    alignSelf: "flex-start",
    marginTop: 8,
  },
  forgotLinkLabel: {
    ...typography.caption,
    color: colors.accentPink,
    textDecorationLine: "underline",
  },
  cardHeader: {
    gap: 16,
    alignItems: "stretch",
  },
  formStack: {
    gap: 16,
    alignItems: "stretch",
  },
  metaSection: {
    gap: 8,
    alignItems: "stretch",
  },
  actionStack: {
    gap: 14,
    alignItems: "stretch",
  },
  termsSurface: {
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(138, 70, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(138, 70, 255, 0.16)",
  },
});
