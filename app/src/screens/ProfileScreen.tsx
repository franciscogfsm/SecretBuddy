import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { GradientBackground } from "../components/GradientBackground";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { useAppState } from "../store/AppStateContext";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

export const ProfileScreen = () => {
  const { profile, setProfile } = useAppState();
  const { signOut, loading: authLoading } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
        <View style={styles.hero}>
          <Text style={styles.greeting}>Your Profile</Text>
          <Text style={styles.name}>{profile?.name ?? "Mystery Explorer"}</Text>
          <Text style={styles.meta}>
            {profile
              ? `${profile.age} • ${profile.country}`
              : "Add your details to personalize matches."}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>420</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Safety & Privacy</Text>
          <Text style={styles.sectionValue}>
            Manage blocked users, report history, and guidelines.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Notifications</Text>
          <Text style={styles.sectionValue}>
            Prompt alerts • Reveal countdown • Streak reminders
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>App Settings</Text>
          <Text style={styles.sectionValue}>
            Theme preferences, language, and accessibility options.
          </Text>
        </View>
        <PrimaryButton
          label={authLoading ? "Logging out..." : "Log out"}
          onPress={handleSignOut}
          loading={authLoading}
          variant="ghost"
        />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 20,
    padding: 24,
  },
  hero: {
    borderRadius: 24,
    backgroundColor: "rgba(11, 5, 32, 0.72)",
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  greeting: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  name: {
    ...typography.title,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(6, 0, 18, 0.68)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  statValue: {
    ...typography.title,
    color: colors.accentPurple,
    fontSize: 24,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: "rgba(6, 0, 18, 0.68)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 10,
  },
  sectionLabel: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  sectionValue: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
