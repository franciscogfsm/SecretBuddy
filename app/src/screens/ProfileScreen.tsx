import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Switch,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { GradientBackground } from "../components/GradientBackground";
import { TopHeader } from "../components/TopHeader";
import { useAuth } from "../context/AuthContext";
import { useAppState } from "../store/AppStateContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import { getCountryFlag } from "../utils/countryFlags";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isSmallScreen = screenWidth < 375 || screenHeight < 667; // iPhone SE or smaller

export const ProfileScreen = () => {
  const { profile: localProfile, setProfile } = useAppState();
  const { user, signOut, loading: authLoading } = useAuth();
  const {
    profile: firestoreProfile,
    loading: profileLoading,
    toggleAge,
    saveBio,
    uploadPhoto,
    removePhoto,
    points,
    streak,
    hearts,
  } = useUserProfile();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const scrollRef = useRef<ScrollView>(null);
  const wasFocusedRef = useRef(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const settingsAnim1 = useRef(new Animated.Value(0)).current;
  const settingsAnim2 = useRef(new Animated.Value(0)).current;
  const settingsAnim3 = useRef(new Animated.Value(0)).current;

  // Bio editing state
  const [showBioModal, setShowBioModal] = useState(false);
  const [bioText, setBioText] = useState(localProfile?.bio || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Bottom sheet animation - MUST be declared before any conditional returns
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;

  // Update bio text when profile changes
  useEffect(() => {
    if (firestoreProfile?.bio) {
      setBioText(firestoreProfile.bio);
    }
  }, [firestoreProfile?.bio]);

  // Use Firestore profile data with fallback to local
  const profile = firestoreProfile
    ? {
        name: firestoreProfile.displayName,
        username: firestoreProfile.username || "",
        age: firestoreProfile.age || 18,
        ageVisible: firestoreProfile.ageVisible,
        country: firestoreProfile.country || "Portugal",
        mode: "global" as const,
        bio: firestoreProfile.bio,
      }
    : localProfile;
  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for stats
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Staggered animations for settings cards
    setTimeout(() => {
      Animated.stagger(150, [
        Animated.timing(settingsAnim1, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(settingsAnim2, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(settingsAnim3, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 800);
  }, []);

  // Auto-scroll to top when tab is tapped again
  useFocusEffect(
    React.useCallback(() => {
      if (wasFocusedRef.current && isFocused) {
        // User tapped the same tab again, scroll to top
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
      wasFocusedRef.current = isFocused;
    }, [isFocused])
  );

  const handleSignOut = async () => {
    Alert.alert("Log out", "Are you sure you want to leave SecretBuddy?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            setProfile(null);
            requestAnimationFrame(() => {
              const rootNav = (navigation as any).getParent?.() ?? navigation;
              rootNav.reset({
                index: 0,
                routes: [{ name: "Onboarding", params: { mode: "signin" } }],
              });
            });
          } catch (error) {
            Alert.alert(
              "Couldn't log out",
              error instanceof Error ? error.message : "Please try again."
            );
          }
        },
      },
    ]);
  };

  const handleToggleAgeVisibility = async () => {
    try {
      await toggleAge();
    } catch (error) {
      Alert.alert("Error", "Failed to update age visibility");
    }
  };

  const openBioModal = () => {
    setBioText(firestoreProfile?.bio || "");
    setShowBioModal(true);

    // Smooth fade in
    bottomSheetAnim.setValue(0);
    Animated.timing(bottomSheetAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeBioModal = () => {
    // Smooth fade out
    Animated.timing(bottomSheetAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowBioModal(false);
    });
  };

  const handleSaveBio = async () => {
    try {
      await saveBio(bioText.trim());
      closeBioModal();
    } catch (error) {
      Alert.alert("Error", "Failed to save bio");
    }
  };

  const handlePickImage = async () => {
    try {
      // Show helpful guidance before opening picker
      Alert.alert(
        "Choose Profile Photo",
        "📸 Center your face in the square crop area\n\n✨ The photo will be displayed as a circle, so make sure your face is centered!",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Choose Photo",
            onPress: async () => {
              // Request permission
              const { status } =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

              if (status !== "granted") {
                Alert.alert(
                  "Permission needed",
                  "Please grant camera roll permissions to upload a profile photo."
                );
                return;
              }

              // Launch image picker with square crop
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: "images" as any,
                allowsEditing: true,
                aspect: [1, 1], // Square crop for circular display
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                setUploadingPhoto(true);
                try {
                  await uploadPhoto(result.assets[0].uri);
                  setUploadingPhoto(false);
                  Alert.alert("Success", "Profile photo uploaded!");
                } catch (error) {
                  setUploadingPhoto(false);
                  Alert.alert("Error", "Failed to upload profile photo");
                  console.error(error);
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      setUploadingPhoto(false);
      Alert.alert("Error", "Failed to upload profile photo");
      console.error(error);
    }
  };

  const handleRemovePhoto = async () => {
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove your profile photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setUploadingPhoto(true);
              await removePhoto();
              Alert.alert("Success", "Profile photo removed");
            } catch (error) {
              Alert.alert("Error", "Failed to remove profile photo");
            } finally {
              setUploadingPhoto(false);
            }
          },
        },
      ]
    );
  };

  // Development-only: orchestrate pairing + notification using cloud functions
  const [devRunning, setDevRunning] = useState(false);

  const runDevPairAndNotify = async () => {
    if (devRunning) return;
    setDevRunning(true);

    try {
      // Compute target pool hour from current UTC: close previous hour
      const nowUtc = new Date();
      const previousHour = nowUtc.getUTCHours() - 1; // we close the pool for the previous hour

      // Clamp to valid pool hours (9..16)
      const clampedHour = Math.max(9, Math.min(16, previousHour));

      const dateStr = nowUtc.toISOString().split("T")[0];
      const poolId = `${dateStr}-${clampedHour}h`;

      console.log(`🔧 Dev tool: Pool ID = ${poolId}`);

      const base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net";

      // 1) Ensure pools exist
      console.log("📅 Step 1: Creating pools...");
      const createPoolsRes = await fetch(`${base}/manualCreatePools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!createPoolsRes.ok) {
        const error = await createPoolsRes.json();
        throw new Error(
          `Pool creation failed: ${error.error || createPoolsRes.status}`
        );
      }

      console.log("✅ Pools created");

      // Small delay to allow Firestore indexes to settle
      await new Promise((r) => setTimeout(r, 1500));

      // 2) Create pairs in test mode (allUsers=true to pair ALL users, not just pool members)
      // ✅ This ensures it works even when no users are in the specific pool
      console.log("👥 Step 2: Creating pairs with allUsers=true...");
      const createPairsRes = await fetch(`${base}/manualCreatePairs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolId,
          allUsers: true, // ✅ Pair ALL users regardless of pool membership
        }),
      });

      const createPairsJson = await createPairsRes.json();
      console.log("📊 Pairs response:", createPairsJson);

      if (!createPairsRes.ok) {
        throw new Error(
          `manualCreatePairs failed: ${
            createPairsJson?.error || createPairsRes.status
          }\n\nThis usually means:\n• No users registered in the app yet\n• Database connection issue`
        );
      }

      // Small delay
      await new Promise((r) => setTimeout(r, 1000));

      // 3) Trigger test photo notification for the pool
      console.log("📸 Step 3: Sending photo notifications...");
      const notifyRes = await fetch(`${base}/manualTestPhotoNotification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId }),
      });

      const notifyJson = await notifyRes.json();
      if (!notifyRes.ok) {
        console.warn("⚠️ Photo notifications failed:", notifyJson);
        // Don't throw - pairing succeeded, notification is optional
      }

      Alert.alert(
        "✅ Dev: Pair & Notify Complete",
        `Pool: ${poolId}\n\n` +
          `Pairs created: ${createPairsJson?.pairs ?? 0}\n` +
          `Unpaired: ${createPairsJson?.unpaired ?? 0}\n` +
          `Notifications sent: ${
            notifyJson?.sent ?? notifyJson?.result ?? "N/A"
          }\n\n` +
          `Mode: ${createPairsJson?.mode || "unknown"}`
      );
    } catch (error: any) {
      console.error("❌ Dev pairing error:", error);
      Alert.alert(
        "Dev: Pair & Notify Error",
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setDevRunning(false);
    }
  };

  // No loading screen needed - profile is pre-loaded on HomeScreen
  // This ensures instant display when user navigates to Profile tab

  return (
    <GradientBackground gradient="midnight">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <Animated.View
          style={[
            styles.profileCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {!isSmallScreen && (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleSignOut}
              disabled={authLoading}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={colors.accentPink}
              />
            </TouchableOpacity>
          )}

          <View style={styles.profileContent}>
            {/* Avatar on the left */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarGradient}>
                <LinearGradient
                  colors={[
                    "rgba(156, 107, 255, 0.15)",
                    "rgba(255, 79, 183, 0.1)",
                  ]}
                  style={styles.avatarGradientInner}
                >
                  <View style={styles.avatar}>
                    {uploadingPhoto ? (
                      <ActivityIndicator
                        size="large"
                        color={colors.textPrimary}
                      />
                    ) : firestoreProfile?.profilePhotoUrl ? (
                      <Image
                        source={{ uri: firestoreProfile.profilePhotoUrl }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {(user?.displayName || profile?.name || "M")
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    )}
                  </View>
                </LinearGradient>
                {/* Edit Photo Button */}
                <TouchableOpacity
                  style={styles.editPhotoButton}
                  onPress={handlePickImage}
                  disabled={uploadingPhoto}
                >
                  <Ionicons
                    name="camera"
                    size={18}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Info on the right */}
            <Animated.View
              style={[
                styles.profileInfo,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.name}>
                {user?.displayName ?? profile?.name ?? "Mystery Explorer"}
              </Text>
              {profile?.username && (
                <Text style={styles.username}>@{profile.username}</Text>
              )}
              <View style={styles.ageContainer}>
                <Text style={styles.meta}>
                  {profile
                    ? `${profile.age} years old`
                    : "Add your details to personalize matches."}
                </Text>
                {profile && (
                  <View style={styles.privacyIndicator}>
                    <Ionicons
                      name={
                        profile.ageVisible ? "eye-outline" : "eye-off-outline"
                      }
                      size={16}
                      color={
                        profile.ageVisible
                          ? colors.accentTeal
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.privacyText,
                        {
                          color: profile.ageVisible
                            ? colors.accentTeal
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {profile.ageVisible ? "Public" : "Private"}
                    </Text>
                  </View>
                )}
              </View>
              {profile?.country && (
                <View style={styles.countryContainer}>
                  <Text style={styles.countryFlag}>
                    {getCountryFlag(profile.country)}
                  </Text>
                  <Text style={styles.countryText}>{profile.country}</Text>
                </View>
              )}
              {user?.email && (
                <Text
                  style={styles.email}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {user.email}
                </Text>
              )}
              {!user?.email && user && (
                <Text style={styles.email}>No email found</Text>
              )}
              {!user && <Text style={styles.email}>Not logged in</Text>}
            </Animated.View>
          </View>
        </Animated.View>

        {/* Bio Section */}
        <Animated.View
          style={[
            styles.sectionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.bioSectionHeader}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <TouchableOpacity
              style={styles.editBioButton}
              onPress={openBioModal}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={colors.accentPurple}
              />
              <Text style={styles.editBioButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bioCard}>
            <View style={styles.bioContent}>
              {profile?.bio ? (
                <>
                  <View style={styles.bioHeader}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={colors.accentPurple}
                    />
                    <Text style={styles.bioTitle}>Your Bio</Text>
                  </View>
                  <Text style={styles.bioText}>{profile.bio}</Text>
                </>
              ) : (
                <View style={styles.noBioContainer}>
                  <Ionicons
                    name="add-circle-outline"
                    size={32}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.noBioTitle}>Add your bio</Text>
                  <Text style={styles.noBioDescription}>
                    Tell your friends a bit about yourself! This will be visible
                    when they view your profile.
                  </Text>
                  <TouchableOpacity
                    style={styles.addBioButton}
                    onPress={openBioModal}
                  >
                    <Text style={styles.addBioButtonText}>Add Bio</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View
          style={[
            styles.sectionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <View style={styles.statsGrid}>
            <Animated.View
              style={[
                styles.statCard,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={["rgba(46, 230, 169, 0.1)", "rgba(46, 230, 169, 0.05)"]}
                style={styles.statCardInner}
              >
                <View style={styles.statIcon}>
                  <Ionicons
                    name="diamond-outline"
                    size={24}
                    color={colors.accentTeal}
                  />
                </View>
                <Text style={styles.statValue}>{points}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  Points
                </Text>
              </LinearGradient>
            </Animated.View>

            <Animated.View
              style={[
                styles.statCard,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={["rgba(255, 79, 183, 0.1)", "rgba(255, 79, 183, 0.05)"]}
                style={styles.statCardInner}
              >
                <View style={styles.statIcon}>
                  <Ionicons
                    name="flame-outline"
                    size={24}
                    color={colors.accentPink}
                  />
                </View>
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  Streak
                </Text>
              </LinearGradient>
            </Animated.View>

            <Animated.View
              style={[
                styles.statCard,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(156, 107, 255, 0.1)",
                  "rgba(156, 107, 255, 0.05)",
                ]}
                style={styles.statCardInner}
              >
                <View style={styles.statIcon}>
                  <Ionicons
                    name="heart-outline"
                    size={24}
                    color={colors.accentPurple}
                  />
                </View>
                <Text style={styles.statValue}>{hearts}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  Hearts
                </Text>
              </LinearGradient>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Privacy Section */}
        <Animated.View
          style={[
            styles.sectionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Privacy Controls</Text>

          <View style={styles.privacyCard}>
            <View style={styles.privacyCardContent}>
              <View style={styles.privacyIconContainer}>
                <Ionicons
                  name="eye-outline"
                  size={24}
                  color={colors.accentTeal}
                />
              </View>
              <View style={styles.privacyTextContainer}>
                <Text style={styles.privacyLabel}>Age Visibility</Text>
                <Text style={styles.privacyDescription}>
                  {profile?.ageVisible
                    ? "Your age is visible to other users when they view your profile"
                    : "Your age is hidden and only you can see it"}
                </Text>
                <Text style={styles.privacyHint}>
                  Toggle to control who can see your age information
                </Text>
              </View>
              <Switch
                trackColor={{
                  false: "rgba(255, 255, 255, 0.1)",
                  true: colors.accentTeal + "33",
                }}
                thumbColor={
                  profile?.ageVisible
                    ? colors.accentTeal
                    : "rgba(255, 255, 255, 0.6)"
                }
                ios_backgroundColor="rgba(255, 255, 255, 0.1)"
                onValueChange={handleToggleAgeVisibility}
                value={profile?.ageVisible || false}
                style={styles.switch}
              />
            </View>
          </View>

          {/* Remove Profile Photo Option */}
          {firestoreProfile?.profilePhotoUrl && (
            <TouchableOpacity
              style={styles.removePhotoCard}
              onPress={handleRemovePhoto}
              disabled={uploadingPhoto}
            >
              <View style={styles.removePhotoContent}>
                <View style={styles.removePhotoIconContainer}>
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.accentPink}
                  />
                </View>
                <View style={styles.privacyTextContainer}>
                  <Text style={styles.removePhotoLabel}>
                    Remove Profile Photo
                  </Text>
                  <Text style={styles.privacyDescription}>
                    Delete your current profile photo
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textSecondary}
                />
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Settings Section */}
        <Animated.View
          style={[
            styles.sectionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Settings & Preferences</Text>

          <Animated.View
            style={{
              opacity: settingsAnim1,
              transform: [
                { scale: scaleAnim },
                {
                  translateX: settingsAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.settingsCard}
              onPress={() => navigation.navigate("Settings")}
            >
              <View style={styles.settingsCardContent}>
                <View style={styles.settingsIconContainer}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={24}
                    color={colors.textPrimary}
                  />
                </View>
                <View style={styles.settingsTextContainer}>
                  <Text style={styles.settingsLabel}>Safety & Privacy</Text>
                  <Text style={styles.settingsDescription}>
                    Manage blocked users, report history, and guidelines
                  </Text>
                </View>
                <Text style={styles.settingsChevron}>›</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={{
              opacity: settingsAnim2,
              transform: [
                { scale: scaleAnim },
                {
                  translateX: settingsAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.settingsCard}
              onPress={() =>
                navigation.navigate("Settings", { scrollTo: "notifications" })
              }
            >
              <View style={styles.settingsCardContent}>
                <View style={styles.settingsIconContainer}>
                  <Ionicons
                    name="notifications-outline"
                    size={24}
                    color={colors.textPrimary}
                  />
                </View>
                <View style={styles.settingsTextContainer}>
                  <Text style={styles.settingsLabel}>Notifications</Text>
                  <Text style={styles.settingsDescription}>
                    Prompt alerts, reveal countdown, streak reminders
                  </Text>
                </View>
                <Text style={styles.settingsChevron}>›</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={{
              opacity: settingsAnim3,
              transform: [
                { scale: scaleAnim },
                {
                  translateX: settingsAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.settingsCard}
              onPress={() =>
                navigation.navigate("Settings", { scrollTo: "appSettings" })
              }
            >
              <View style={styles.settingsCardContent}>
                <View style={styles.settingsIconContainer}>
                  <Ionicons
                    name="settings-outline"
                    size={24}
                    color={colors.textPrimary}
                  />
                </View>
                <View style={styles.settingsTextContainer}>
                  <Text style={styles.settingsLabel}>App Settings</Text>
                  <Text style={styles.settingsDescription}>
                    Haptic feedback and accessibility options
                  </Text>
                </View>
                <Text style={styles.settingsChevron}>›</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* DEV: Pair & Notify orchestration button (only in dev) */}
          {__DEV__ && (
            <Animated.View
              style={{
                marginTop: 16,
                opacity: settingsAnim3,
                transform: [
                  { scale: scaleAnim },
                  {
                    translateX: settingsAnim3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.settingsCard,
                  { borderColor: "rgba(46,230,169,0.25)" },
                ]}
                onPress={runDevPairAndNotify}
                disabled={devRunning}
              >
                <View style={styles.settingsCardContent}>
                  <View style={styles.settingsIconContainer}>
                    <Ionicons
                      name="flash-outline"
                      size={24}
                      color={colors.textPrimary}
                    />
                  </View>
                  <View style={styles.settingsTextContainer}>
                    <Text style={styles.settingsLabel}>Pair & Notify</Text>
                    <Text style={styles.settingsDescription} numberOfLines={2}>
                      Create pools, pair users (all users), and send test photo
                      notifications.
                    </Text>
                  </View>
                  <Text style={styles.settingsChevron}>
                    {devRunning ? "…" : "›"}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* Footer Space */}
        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Bio Edit Modal - Fixed Size */}
      {showBioModal && (
        <Modal
          animationType="none"
          transparent={true}
          visible={showBioModal}
          onRequestClose={closeBioModal}
          presentationStyle="overFullScreen"
        >
          <Animated.View
            style={[
              styles.fullScreenOverlay,
              {
                opacity: bottomSheetAnim,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.overlayBackdrop}
              onPress={closeBioModal}
            />

            <View style={styles.centerContainer}>
              <Animated.View
                style={[
                  styles.bioEditCard,
                  {
                    transform: [
                      {
                        scale: bottomSheetAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={closeBioModal}
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.cardTitle}>Edit Bio</Text>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveBio}
                  >
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.cardSubtitle}>
                    Tell your friends a bit about yourself
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Write something interesting about yourself..."
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={bioText}
                    onChangeText={setBioText}
                    multiline
                    maxLength={100}
                    textAlignVertical="top"
                    autoFocus
                  />
                  <Text style={styles.counter}>
                    {bioText.length}/100 characters
                  </Text>
                </View>
              </Animated.View>
            </View>
          </Animated.View>
        </Modal>
      )}
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 100,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },

  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
  },

  // Profile Card Styles
  profileCard: {
    borderRadius: isSmallScreen ? 24 : 28,
    backgroundColor: "rgba(6, 0, 18, 0.95)",
    padding: isSmallScreen ? 20 : 24,
    marginBottom: isSmallScreen ? 24 : 32,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.2)",
    shadowColor: "rgba(156, 107, 255, 0.3)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
    position: "relative",
    overflow: "hidden",
  },

  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallScreen ? 16 : 20,
  },

  avatarSection: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  avatarGradient: {
    borderRadius: isSmallScreen ? 42 : 50,
    shadowColor: "rgba(156, 107, 255, 0.6)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },

  avatarGradientInner: {
    borderRadius: isSmallScreen ? 42 : 50,
    padding: isSmallScreen ? 4 : 5,
  },

  avatar: {
    width: isSmallScreen ? 75 : 90,
    height: isSmallScreen ? 75 : 90,
    borderRadius: isSmallScreen ? 37.5 : 45,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: isSmallScreen ? 2.5 : 3,
    borderColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "rgba(156, 107, 255, 0.5)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
  },

  avatarText: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 30 : 36,
    fontWeight: "900",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: isSmallScreen ? 37.5 : 45,
  },

  editPhotoButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
    borderRadius: isSmallScreen ? 14 : 16,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: colors.surface,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },

  profileInfo: {
    flex: 1,
    alignItems: "flex-start",
    gap: isSmallScreen ? 4 : 6,
    minWidth: 0,
  },

  name: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: "800",
    textAlign: "left",
    letterSpacing: 0.3,
    flexWrap: "wrap",
  },

  username: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: "500",
    textAlign: "left",
    opacity: 0.8,
    marginTop: 0,
  },

  ageContainer: {
    alignItems: "flex-start",
    gap: isSmallScreen ? 4 : 6,
    marginTop: 2,
    flexWrap: "wrap",
  },

  meta: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 13 : 14,
    textAlign: "left",
    opacity: 0.9,
    letterSpacing: 0.2,
  },

  privacyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  privacyText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  email: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 11 : 12,
    textAlign: "left",
    marginTop: 2,
    opacity: 0.7,
  },

  countryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallScreen ? 5 : 6,
    paddingHorizontal: isSmallScreen ? 8 : 10,
    paddingVertical: isSmallScreen ? 4 : 5,
    borderRadius: 14,
    backgroundColor: "rgba(46, 230, 169, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(46, 230, 169, 0.3)",
    marginTop: 4,
    alignSelf: "flex-start",
  },

  countryFlag: {
    fontSize: isSmallScreen ? 14 : 16,
    lineHeight: isSmallScreen ? 14 : 16,
  },

  countryText: {
    ...typography.caption,
    color: colors.accentTeal,
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: "600",
  },

  logoutButton: {
    position: "absolute",
    top: 20,
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 79, 183, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 79, 183, 0.3)",
    shadowColor: "rgba(255, 79, 183, 0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },

  // Section Styles
  sectionContainer: {
    marginBottom: 32,
  },

  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    marginLeft: 4,
  },

  // Stats Grid Styles
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  statCard: {
    flex: 1,
    minWidth: 0, // Prevents flex items from overflowing
    maxWidth: (screenWidth - 64) / 3, // Ensures consistent sizing
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  statCardInner: {
    padding: 16,
    paddingVertical: 20,
    alignItems: "center",
    backgroundColor: "rgba(6, 0, 18, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 24,
    gap: 8,
    minHeight: 120, // Ensures consistent height
  },

  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  statValue: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },

  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },

  // Settings Card Styles
  settingsCard: {
    borderRadius: 20,
    backgroundColor: "rgba(6, 0, 18, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 12,
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  settingsCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },

  settingsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  settingsTextContainer: {
    flex: 1,
    gap: 6,
  },

  settingsLabel: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "600",
  },

  settingsDescription: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  settingsChevron: {
    ...typography.title,
    color: colors.textSecondary,
    fontSize: 24,
    opacity: 0.6,
  },

  // Privacy Card Styles
  privacyCard: {
    borderRadius: 20,
    backgroundColor: "rgba(6, 0, 18, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(46, 230, 169, 0.2)",
    marginBottom: 12,
    shadowColor: "rgba(46, 230, 169, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  privacyCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },

  privacyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(46, 230, 169, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  privacyTextContainer: {
    flex: 1,
    gap: 6,
  },

  privacyLabel: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "600",
  },

  privacyDescription: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  privacyHint: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.7,
    fontStyle: "italic",
  },

  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },

  // Remove Photo Card Styles
  removePhotoCard: {
    borderRadius: 20,
    backgroundColor: "rgba(6, 0, 18, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 79, 183, 0.2)",
    marginTop: 12,
    shadowColor: "rgba(255, 79, 183, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  removePhotoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 79, 183, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  removePhotoLabel: {
    ...typography.subtitle,
    color: colors.accentPink,
    fontSize: 15,
    fontWeight: "600",
  },

  // Compact content layout for remove photo card (keeps other privacy cards untouched)
  removePhotoContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },

  // Footer Space
  footerSpace: {
    height: 20,
  },

  // Bio Section Styles
  bioSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  editBioButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(156, 107, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.3)",
  },

  editBioButtonText: {
    ...typography.caption,
    color: colors.accentPurple,
    fontSize: 14,
    fontWeight: "600",
  },

  bioCard: {
    borderRadius: 20,
    backgroundColor: "rgba(6, 0, 18, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.2)",
    shadowColor: "rgba(156, 107, 255, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  bioContent: {
    padding: 20,
  },

  bioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  bioTitle: {
    ...typography.subtitle,
    color: colors.accentPurple,
    fontSize: 16,
    fontWeight: "700",
  },

  bioText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },

  noBioContainer: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
  },

  noBioTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "600",
  },

  noBioDescription: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.8,
    paddingHorizontal: 16,
  },

  addBioButton: {
    backgroundColor: colors.accentPurple,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },

  addBioButtonText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  // Full Screen Modal Styles - Clean & Smooth
  fullScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },

  overlayBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  centerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 180,
  },

  keyboardContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  bioEditCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: 340,
    height: 340,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.3)",
    shadowColor: "rgba(156, 107, 255, 0.4)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
    overflow: "hidden",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },

  saveBtn: {
    backgroundColor: colors.accentPurple,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },

  saveBtnText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  cardContent: {
    padding: 20,
  },

  cardSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 18,
  },

  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.4)",
    padding: 16,
    color: colors.textPrimary,
    ...typography.body,
    fontSize: 16,
    lineHeight: 22,
    height: 130,
    textAlignVertical: "top",
    marginBottom: 12,
  },

  counter: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "right",
  },
});
