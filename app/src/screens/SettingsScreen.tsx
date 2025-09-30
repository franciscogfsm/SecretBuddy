import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";

import { GradientBackground } from "../components/GradientBackground";
import { useAppState } from "../store/AppStateContext";
import { useAuth } from "../context/AuthContext";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

export const SettingsScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, setProfile } = useAppState();
  const { user, signOut, loading: authLoading } = useAuth();

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [promptReminders, setPromptReminders] = useState(true);
  const [revealAlerts, setRevealAlerts] = useState(true);
  const [streakReminders, setStreakReminders] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleBlockedUsers = () => {
    Alert.alert(
      "Blocked Users",
      "This feature is coming soon! You'll be able to manage your blocked users list here.",
      [{ text: "OK" }]
    );
  };

  const handleReportHistory = () => {
    Alert.alert(
      "Report History",
      "This feature is coming soon! You'll be able to view your report history here.",
      [{ text: "OK" }]
    );
  };

  const handleSafetyGuidelines = () => {
    Alert.alert(
      "Safety Guidelines",
      "• Always use back camera only\n• Never share personal information\n• Report inappropriate behavior\n• Keep conversations respectful\n• Use the block feature if needed",
      [{ text: "Got it!" }]
    );
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

  return (
    <GradientBackground gradient="midnight">
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
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
            style={styles.settingItem}
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
        <View style={styles.section}>
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

          <View style={styles.settingItem}>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="moon-outline"
                  size={20}
                  color={colors.accentPurple}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDescription}>
                  Use dark theme (currently always enabled)
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{
                false: "rgba(255, 255, 255, 0.1)",
                true: colors.accentPurple + "33",
              }}
              thumbColor={
                darkMode ? colors.accentPurple : "rgba(255, 255, 255, 0.6)"
              }
              ios_backgroundColor="rgba(255, 255, 255, 0.1)"
              onValueChange={(value) => {
                setDarkMode(value);
                handleAppSetting("Dark Mode", value);
              }}
              value={darkMode}
              disabled={true} // Currently always dark
            />
          </View>

          <View style={styles.settingItem}>
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

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={[
              styles.settingItem,
              { borderColor: colors.accentPink + "40" },
            ]}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },

  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingHorizontal: 4,
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

  // Setting Item Styles
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(6, 0, 18, 0.6)",
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
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
    marginBottom: 2,
  },

  settingDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  // Footer Space
  footerSpace: {
    height: 20,
  },
});
