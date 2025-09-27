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
    <GradientBackground gradient="purplePink">
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.name}>{profile?.name ?? "Mystery Explorer"}</Text>
          <Text style={styles.meta}>
            {profile
              ? `${profile.age} • ${profile.country}`
              : "Add your details to personalize matches."}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Game mode</Text>
          <Text style={styles.sectionValue}>{profile?.mode ?? "Not set"}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Safety tools</Text>
          <Text style={styles.meta}>
            Manage blocked users, report history, and guidelines.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Notifications</Text>
          <Text style={styles.meta}>
            Prompt alerts • Reveal countdown • Streak reminders
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
    borderColor: colors.border,
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
  card: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: "rgba(6, 0, 18, 0.68)",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  sectionLabel: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  sectionValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
