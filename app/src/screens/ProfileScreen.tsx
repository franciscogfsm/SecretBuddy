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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";

import { GradientBackground } from "../components/GradientBackground";
import { TopHeader } from "../components/TopHeader";
import { useAuth } from "../context/AuthContext";
import { useAppState } from "../store/AppStateContext";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

const { width: screenWidth } = Dimensions.get("window");

export const ProfileScreen = () => {
  const { profile, setProfile } = useAppState();
  const { user, signOut, loading: authLoading } = useAuth();
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
            requestAnimationFrame(() =>
              navigation.reset({ index: 0, routes: [{ name: "Onboarding" }] })
            );
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

  const toggleAgeVisibility = () => {
    if (profile) {
      setProfile({
        ...profile,
        ageVisible: !profile.ageVisible,
      });
    }
  };

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

          <View style={styles.profileContent}>
            <View style={styles.avatarGradient}>
              <LinearGradient
                colors={[
                  "rgba(156, 107, 255, 0.15)",
                  "rgba(255, 79, 183, 0.1)",
                ]}
                style={styles.avatarGradientInner}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user?.displayName || profile?.name || "M")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              </LinearGradient>
            </View>

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
              {user?.email && <Text style={styles.email}>{user.email}</Text>}
              {!user?.email && user && (
                <Text style={styles.email}>No email found</Text>
              )}
              {!user && <Text style={styles.email}>Not logged in</Text>}
            </Animated.View>
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
                <Text style={styles.statValue}>420</Text>
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
                <Text style={styles.statValue}>12</Text>
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
                <Text style={styles.statValue}>5</Text>
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
                onValueChange={toggleAgeVisibility}
                value={profile?.ageVisible || false}
                style={styles.switch}
              />
            </View>
          </View>
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
              onPress={() => navigation.navigate("Settings")}
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
              onPress={() => navigation.navigate("Settings")}
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
                    Theme preferences, language, and accessibility
                  </Text>
                </View>
                <Text style={styles.settingsChevron}>›</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Footer Space */}
        <View style={styles.footerSpace} />
      </ScrollView>
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

  // Profile Card Styles
  profileCard: {
    borderRadius: 28,
    backgroundColor: "rgba(6, 0, 18, 0.95)",
    padding: 32,
    marginBottom: 32,
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
    alignItems: "center",
    gap: 28,
  },

  avatarGradient: {
    borderRadius: 60,
    shadowColor: "rgba(156, 107, 255, 0.6)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },

  avatarGradientInner: {
    borderRadius: 60,
    padding: 6,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
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
    fontSize: 42,
    fontWeight: "900",
  },

  profileInfo: {
    alignItems: "center",
    gap: 12,
  },

  name: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  username: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.8,
    marginTop: 4,
  },

  ageContainer: {
    alignItems: "center",
    gap: 8,
  },

  meta: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 17,
    textAlign: "center",
    opacity: 0.9,
    letterSpacing: 0.3,
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
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    opacity: 0.8,
  },

  logoutButton: {
    position: "absolute",
    top: 24,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: "rgba(255, 79, 183, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 79, 183, 0.3)",
    shadowColor: "rgba(255, 79, 183, 0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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

  // Footer Space
  footerSpace: {
    height: 20,
  },
});
