import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GradientBackground } from "../components/GradientBackground";
import { MysteryCard } from "../components/MysteryCard";
import { PillOption } from "../components/PillOption";
import { useAppState } from "../store/AppStateContext";
import type { Mode } from "../store/AppStateContext";
import { colors, typography } from "../theme";

export const HomeScreen = () => {
  const { prompt, buddy, profile, setProfile } = useAppState();

  const mode = profile?.mode ?? "global";

  const handleModeChange = (nextMode: Mode) => {
    if (!profile) {
      return;
    }
    if (profile.mode === nextMode) {
      return;
    }
    setProfile({
      ...profile,
      mode: nextMode,
    });
  };

  const modeOptions: Array<{ key: Mode; label: string; description: string }> =
    [
      {
        key: "friends",
        label: "Inner circle",
        description: "Match only with buddies you invite.",
      },
      {
        key: "country",
        label: "Country",
        description: "Stay mysterious within your region.",
      },
      {
        key: "global",
        label: "World",
        description: "Unlock the full worldwide roster.",
      },
    ];

  return (
    <GradientBackground gradient="midnight">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.headerTitle}>Today&apos;s Mystery</Text>
          <Text style={styles.headerSubtitle}>
            Respond before the reveal window to keep your streak alive.
          </Text>
        </View>

        <View style={styles.modeCard}>
          <Text style={styles.modeTitle}>Matchmaking mode</Text>
          <Text style={styles.modeSubtitle}>
            Choose how wide your nightly pairing net should be. You can tweak
            this anytime.
          </Text>
          {modeOptions.map((option) => (
            <PillOption
              key={option.key}
              label={option.label}
              description={option.description}
              selected={mode === option.key}
              onPress={() => handleModeChange(option.key)}
            />
          ))}
        </View>

        {prompt && buddy ? <MysteryCard prompt={prompt} buddy={buddy} /> : null}
        <View style={styles.metaSection}>
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Streak</Text>
            <Text style={styles.metaValue}>5 days 🔥</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Points</Text>
            <Text style={styles.metaValue}>420 pts</Text>
          </View>
        </View>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 140,
    gap: 28,
  },
  headerTitle: {
    ...typography.display,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
  },
  modeCard: {
    borderRadius: 24,
    backgroundColor: "rgba(6, 0, 18, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 22,
    gap: 14,
  },
  modeTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  modeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  metaSection: {
    flexDirection: "row",
    gap: 16,
  },
  metaCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    backgroundColor: "rgba(11, 5, 32, 0.7)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  metaValue: {
    ...typography.title,
    color: colors.accentPurple,
    marginTop: 8,
  },
});
