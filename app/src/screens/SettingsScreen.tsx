import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";

import { GradientBackground } from "../components/GradientBackground";
import { SecurityBadge } from "../components/SecurityBadge";
import { useAppState } from "../store/AppStateContext";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import { deleteUser } from "../lib/firebaseAuth";
import { auth } from "../config/firebase";

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top - 12, 12);
  const HEADER_HEIGHT = 110; // approximate header height including padding
  const contentTopPadding = HEADER_HEIGHT + insets.top;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { profile, setProfile } = useAppState();
  const { user, signOut, loading: authLoading } = useAuth();
  const { deleteProfile } = useUserProfile();

  // Refs for scrolling to sections
  const scrollViewRef = useRef<ScrollView>(null);
  const [notificationsSectionY, setNotificationsSectionY] = useState(0);
  const [appSettingsSectionY, setAppSettingsSectionY] = useState(0);

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [promptReminders, setPromptReminders] = useState(true);
  const [revealAlerts, setRevealAlerts] = useState(true);
  const [streakReminders, setStreakReminders] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  // Handle scroll to specific section
  useEffect(() => {
    const params = route.params as { scrollTo?: string } | undefined;
    if (params?.scrollTo) {
      setTimeout(() => {
        if (params.scrollTo === "notifications" && notificationsSectionY > 0) {
          scrollViewRef.current?.scrollTo({
            y: notificationsSectionY - 210,
            animated: true,
          });
        } else if (
          params.scrollTo === "appSettings" &&
          appSettingsSectionY > 0
        ) {
          scrollViewRef.current?.scrollTo({
            y: appSettingsSectionY - 20,
            animated: true,
          });
        }
      }, 100);
    }
  }, [route.params, notificationsSectionY, appSettingsSectionY]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleBlockedUsers = () => {
    navigation.navigate("BlockedUsers");
  };

  const handleReportHistory = () => {
    navigation.navigate("ReportHistory");
  };

  const handleSafetyGuidelines = () => {
    navigation.navigate("SafetyGuidelines");
  };

  const handleNotificationSetting = (setting: string, value: boolean) => {
    // Here you would save to AsyncStorage or send to backend
    Alert.alert(
      "Setting Updated",
      `${setting} ${value ? "enabled" : "disabled"}`,
      [{ text: "OK" }]
    );
  };

  const handleAppSetting = (setting: string, value: boolean) => {
    // Here you would save to AsyncStorage or send to backend
    Alert.alert(
      "Setting Updated",
      `${setting} ${value ? "enabled" : "disabled"}`,
      [{ text: "OK" }]
    );
  };

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
              rootNav.reset({ index: 0, routes: [{ name: "Onboarding" }] });
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

  return (
    <GradientBackground gradient="midnight" noPadding>
      {/* Header - Rounded gradient matching TopHeader */}
      <LinearGradient
        colors={["rgba(0,0,0,0.9)", "#070319", "#1C0E3C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: 12 + headerPaddingTop }]}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.container,
          { paddingTop: contentTopPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Security Badge - Prominent and standalone */}
        <View style={styles.securityBadgeContainer}>
          <SecurityBadge variant="full" />
        </View>

        {/* Safety & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety & Privacy</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleBlockedUsers}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="person-remove-outline"
                  size={20}
                  color={colors.accentPurple}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Blocked Users</Text>
                <Text style={styles.settingDescription}>
                  Manage your blocked users list
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleReportHistory}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="flag-outline"
                  size={20}
                  color={colors.accentPurple}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Report History</Text>
                <Text style={styles.settingDescription}>
                  View your report history
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast]}
            onPress={handleSafetyGuidelines}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={colors.accentTeal}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Safety Guidelines</Text>
                <Text style={styles.settingDescription}>
                  Read our community guidelines
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View
          style={styles.section}
          onLayout={(event) => {
            setNotificationsSectionY(event.nativeEvent.layout.y);
          }}
        >
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={colors.accentPink}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications from SecretBuddy
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{
                false: "rgba(255, 255, 255, 0.1)",
                true: colors.accentPink + "33",
              }}
              thumbColor={
                notificationsEnabled
                  ? colors.accentPink
                  : "rgba(255, 255, 255, 0.6)"
              }
              ios_backgroundColor="rgba(255, 255, 255, 0.1)"
              onValueChange={(value) => {
                setNotificationsEnabled(value);
                handleNotificationSetting("Push Notifications", value);
              }}
              value={notificationsEnabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={colors.accentPink}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Photo Prompts</Text>
                <Text style={styles.settingDescription}>
                  Get reminded when it's time to share photos
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{
                false: "rgba(255, 255, 255, 0.1)",
                true: colors.accentPink + "33",
              }}
              thumbColor={
                promptReminders ? colors.accentPink : "rgba(255, 255, 255, 0.6)"
              }
              ios_backgroundColor="rgba(255, 255, 255, 0.1)"
              onValueChange={(value) => {
                setPromptReminders(value);
                handleNotificationSetting("Photo Prompts", value);
              }}
              value={promptReminders}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="eye-outline"
                  size={20}
                  color={colors.accentPink}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Reveal Alerts</Text>
                <Text style={styles.settingDescription}>
                  Get notified when identity reveals are available
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{
                false: "rgba(255, 255, 255, 0.1)",
                true: colors.accentPink + "33",
              }}
              thumbColor={
                revealAlerts ? colors.accentPink : "rgba(255, 255, 255, 0.6)"
              }
              ios_backgroundColor="rgba(255, 255, 255, 0.1)"
              onValueChange={(value) => {
                setRevealAlerts(value);
                handleNotificationSetting("Reveal Alerts", value);
              }}
              value={revealAlerts}
            />
          </View>

          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="flame-outline"
                  size={20}
                  color={colors.accentPink}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Streak Reminders</Text>
                <Text style={styles.settingDescription}>
                  Daily reminders to maintain your streak
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{
                false: "rgba(255, 255, 255, 0.1)",
                true: colors.accentPink + "33",
              }}
              thumbColor={
                streakReminders ? colors.accentPink : "rgba(255, 255, 255, 0.6)"
              }
              ios_backgroundColor="rgba(255, 255, 255, 0.1)"
              onValueChange={(value) => {
                setStreakReminders(value);
                handleNotificationSetting("Streak Reminders", value);
              }}
              value={streakReminders}
            />
          </View>
        </View>

        {/* App Settings Section */}
        <View
          style={styles.section}
          onLayout={(event) => {
            setAppSettingsSectionY(event.nativeEvent.layout.y);
          }}
        >
          <Text style={styles.sectionTitle}>App Settings</Text>

          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={20}
                  color={colors.accentPurple}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
                <Text style={styles.settingDescription}>
                  Enable vibration feedback for interactions
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{
                false: "rgba(255, 255, 255, 0.1)",
                true: colors.accentPurple + "33",
              }}
              thumbColor={
                hapticFeedback
                  ? colors.accentPurple
                  : "rgba(255, 255, 255, 0.6)"
              }
              ios_backgroundColor="rgba(255, 255, 255, 0.1)"
              onValueChange={(value) => {
                setHapticFeedback(value);
                handleAppSetting("Haptic Feedback", value);
              }}
              value={hapticFeedback}
            />
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() =>
              Linking.openURL("https://secret-buddy-web.vercel.app/terms")
            }
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.accentPurple}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Terms of Service</Text>
                <Text style={styles.settingDescription}>
                  Read our terms and conditions
                </Text>
              </View>
            </View>
            <Ionicons
              name="open-outline"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast]}
            onPress={() =>
              Linking.openURL("https://secret-buddy-web.vercel.app/privacy")
            }
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.accentTeal}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
                <Text style={styles.settingDescription}>
                  Learn how we protect your data
                </Text>
              </View>
            </View>
            <Ionicons
              name="open-outline"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={[
              styles.settingItem,
              { borderColor: "rgba(255, 59, 48, 0.4)" },
            ]}
            onPress={() => {
              Alert.alert(
                "Delete Account",
                "Are you sure you want to permanently delete your account? This will remove all your data from the app and server. This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        // Delete profile from Firestore first
                        await deleteProfile();

                        // Delete the Firebase Auth user account
                        if (auth.currentUser) {
                          await deleteUser(auth.currentUser);
                        }

                        // Clear local state
                        setProfile(null);

                        // Navigate to onboarding
                        requestAnimationFrame(() => {
                          const rootNav =
                            (navigation as any).getParent?.() ?? navigation;
                          rootNav.reset({
                            index: 0,
                            routes: [{ name: "Onboarding" }],
                          });
                        });

                        Alert.alert(
                          "Account Deleted",
                          "Your account has been permanently deleted."
                        );
                      } catch (error) {
                        Alert.alert(
                          "Couldn't delete account",
                          error instanceof Error
                            ? error.message
                            : "Please try again."
                        );
                      }
                    },
                  },
                ]
              );
            }}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: "#FF3B30" }]}>
                  Delete Account
                </Text>
                <Text style={styles.settingDescription}>
                  Permanently delete all your data from app and server
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast]}
            onPress={handleSignOut}
            disabled={authLoading}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={colors.accentPink}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Log Out</Text>
                <Text style={styles.settingDescription}>
                  Sign out of your SecretBuddy account
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Footer Space */}
        <View style={styles.footerSpace} />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 120,
  },

  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },

  headerSpacer: {
    width: 44,
  },

  // Section Styles
  section: {
    marginBottom: 40,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },

  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    marginTop: 12,
    paddingHorizontal: 4,
  },

  // Setting Item Styles
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 4,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },

  settingItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },

  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  settingText: {
    flex: 1,
  },

  settingLabel: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },

  settingDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },

  // Security Badge Container
  securityBadgeContainer: {
    marginBottom: 32,
    paddingHorizontal: 4,
  },

  // Footer Space
  footerSpace: {
    height: 20,
  },
});
