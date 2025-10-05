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
import { createUserProfile, getUserProfile } from "../services/userService";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

type PersonaDetails = {
  trimmedName: string;
  trimmedUsername: string;
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
  const [tabContainerWidth, setTabContainerWidth] = useState(0);
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
  const tabSlideAnim = useState(
    new Animated.Value(authMode === "signup" ? 0 : 1)
  )[0];

  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isCompactLayout = height < 760;
  // Slightly larger top padding and reduced sizing for Android devices
  const topPadding = insets.top + (Platform.OS === "android" ? 36 : 20);
  const topPaddingCompact = insets.top + (Platform.OS === "android" ? 28 : 12);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    Animated.spring(tabSlideAnim, {
      toValue: authMode === "signup" ? 0 : 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [authMode, tabSlideAnim]);

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
    if (!user) {
      return;
    }
    if (user.displayName && !name) {
      setName(user.displayName);
    }
    if (user.email && !email) {
      setEmail(user.email);
    }
  }, [user, name, email]);

  // Ensure Google sign-in users in signup mode go to profile setup
  useEffect(() => {
    if (user && !profile && authMode === "signup" && signupStage === 0) {
      setSignupStage(1);
    }
  }, [user, profile, authMode, signupStage]);

  const validatePersona = (): PersonaDetails | null => {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim().toLowerCase();
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

    // Username validation
    if (!trimmedUsername) {
      showCustomError(
        "Username Required",
        "Please choose a username to continue.",
        "warning"
      );
      return null;
    }

    if (trimmedUsername.length < 3) {
      showCustomError(
        "Username Too Short",
        "Username must be at least 3 characters long.",
        "warning"
      );
      return null;
    }

    if (trimmedUsername.length > 20) {
      showCustomError(
        "Username Too Long",
        "Username must be no more than 20 characters long.",
        "warning"
      );
      return null;
    }

    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      showCustomError(
        "Invalid Username",
        "Username can only contain lowercase letters, numbers, and underscores.",
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

    return { trimmedName, trimmedCountry, numericAge, trimmedUsername };
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

  const enterApp = async (details?: PersonaDetails | null) => {
    const derivedName = details?.trimmedName?.length
      ? details.trimmedName
      : profile?.name ?? user?.displayName ?? "New member";
    const derivedUsername =
      details?.trimmedUsername ?? profile?.username ?? `user${Date.now()}`;
    const derivedAge = details?.numericAge ?? profile?.age ?? 18;
    const derivedCountry =
      details?.trimmedCountry ?? profile?.country ?? "Global";

    // Set profile in AppState first
    setProfile({
      name: derivedName,
      username: derivedUsername,
      age: derivedAge,
      ageVisible: true, // Default to visible, user can change in privacy settings
      country: derivedCountry,
      mode: profile?.mode ?? "global",
    });

    // Create Firestore profile if user exists and profile doesn't exist yet
    if (user) {
      try {
        const existingProfile = await getUserProfile(user.uid);

        if (!existingProfile) {
          console.log("🚀 Creating Firestore profile with onboarding data...");
          console.log("Data:", {
            username: derivedUsername,
            age: derivedAge,
            country: derivedCountry,
          });

          await createUserProfile(user.uid, {
            displayName: derivedName,
            email: user.email || "",
            username: derivedUsername,
            age: derivedAge,
            country: derivedCountry,
          });

          console.log("✅ Firestore profile created successfully!");
        }
      } catch (error) {
        console.error("❌ Error creating Firestore profile:", error);
        // Continue anyway - profile will be created by useUserProfile hook
      }
    }

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
          <View
            style={[
              styles.backButtonContainer,
              // Use safe area top inset so the button doesn't overlap on
              // bezel-less Android devices (e.g. Samsung S20 Ultra)
              { top: insets.top + 12 },
            ]}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate("AuthOptions")}
              accessibilityLabel="Go back to authentication options"
            >
              <FontAwesome
                name="chevron-left"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={[
              styles.content,
              { paddingTop: topPadding, paddingBottom: 24 },
              isCompactLayout && styles.contentCompact,
              isCompactLayout && { paddingTop: topPaddingCompact },
              Platform.OS === "android" && styles.contentAndroid,
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
                  styles.heroSubtitle,
                  isCompactLayout && styles.heroSubtitleCompact,
                  Platform.OS === "android" && styles.subtitleAndroid,
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
                style={[
                  styles.card,
                  isCompactLayout && styles.cardCompact,
                  Platform.OS === "android" && styles.cardAndroid,
                ]}
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
                  onChangeText={(text) => {
                    // enforce lowercase, allowed chars, and max length
                    const sanitized = text
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, "")
                      .slice(0, 20);
                    setUsername(sanitized);
                  }}
                  placeholder="@johndoe123"
                  autoComplete="username"
                  textContentType="username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                />
                <Text style={styles.usernameHint}>
                  Your unique @username (3-20 characters, lowercase letters,
                  numbers, and underscores only).
                </Text>
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
                  Platform.OS === "android" && styles.cardAndroid,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={styles.modeTabs}
                    onLayout={(e) =>
                      setTabContainerWidth(e.nativeEvent.layout.width)
                    }
                  >
                    <TouchableOpacity
                      onPress={() => setAuthMode("signup")}
                      style={styles.tabButton}
                      activeOpacity={0.7}
                    >
                      <Animated.Text
                        style={[
                          styles.tabLabel,
                          authMode === "signup" && styles.tabLabelActive,
                          {
                            opacity: tabSlideAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 0.5],
                            }),
                          },
                        ]}
                      >
                        CREATE ACCOUNT
                      </Animated.Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setAuthMode("signin")}
                      style={styles.tabButton}
                      activeOpacity={0.7}
                    >
                      <Animated.Text
                        style={[
                          styles.tabLabel,
                          authMode === "signin" && styles.tabLabelActive,
                          {
                            opacity: tabSlideAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 1],
                            }),
                          },
                        ]}
                      >
                        LOG IN
                      </Animated.Text>
                    </TouchableOpacity>
                    <Animated.View
                      style={[
                        styles.slidingIndicator,
                        {
                          transform: [
                            {
                              translateX: tabSlideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, tabContainerWidth / 2],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
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
                      <TouchableOpacity
                        style={[
                          styles.googleButton,
                          (isBusy && activeAction !== "google") ||
                          (authMode === "signup" &&
                            signupStage === 0 &&
                            !acceptedTerms)
                            ? styles.googleButtonDisabled
                            : null,
                        ]}
                        onPress={() => handleProvider("google")}
                        disabled={
                          (isBusy && activeAction !== "google") ||
                          (authMode === "signup" &&
                            signupStage === 0 &&
                            !acceptedTerms)
                        }
                        activeOpacity={0.9}
                      >
                        <View style={styles.googleIconWrapper}>
                          <FontAwesome
                            name="google"
                            size={20}
                            color="#4285F4"
                          />
                        </View>
                        <Text style={styles.googleButtonText}>
                          {authMode === "signup"
                            ? "Sign up with Google"
                            : "Log in with Google"}
                        </Text>
                        {isSocialLoading("google") && (
                          <View style={styles.googleButtonLoader}>
                            <Text style={styles.loaderText}>...</Text>
                          </View>
                        )}
                      </TouchableOpacity>
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
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 32,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
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
    padding: 24,
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
  usernameHint: {
    ...typography.caption,
    color: "rgba(201,192,255,0.7)",
    fontSize: 12,
    lineHeight: 16,
    marginTop: -8,
    marginBottom: 8,
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
  modeTabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    position: "relative",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    position: "relative",
  },
  tabButtonActive: {
    // Active state handled by indicator and label color
  },
  tabLabel: {
    ...typography.caption,
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.accentPurple,
    borderRadius: 2,
  },
  slidingIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    width: "50%",
    height: 3,
    backgroundColor: colors.accentPurple,
    borderRadius: 2,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  loginChip: {
    paddingVertical: 12,
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
    gap: 12,
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
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    gap: 12,
    shadowColor: "#4285F4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleIconWrapper: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f1f1f",
    letterSpacing: 0.3,
  },
  googleButtonLoader: {
    marginLeft: 8,
  },
  loaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4285F4",
  },
  termsSurface: {
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(138, 70, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(138, 70, 255, 0.16)",
  },
  primaryButton: {
    paddingVertical: 20, // Increased vertical padding for a larger button
    paddingHorizontal: 28, // Increased horizontal padding for a wider button
    borderRadius: 14, // Slightly larger rounded corners
    backgroundColor: colors.accentPurple,
    shadowColor: "#000", // Subtle shadow for depth
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3, // For Android shadow
  },
  primaryButtonText: {
    fontSize: 18, // Larger text for better readability
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 48,
    paddingTop: 40, // Increased padding to move text higher
  },
  // Android-specific compact adjustments
  contentAndroid: {
    paddingHorizontal: 18,
  },
  titleAndroid: {
    fontSize: 28,
  },
  subtitleAndroid: {
    fontSize: 14,
  },
  cardAndroid: {
    padding: 16,
  },
});
