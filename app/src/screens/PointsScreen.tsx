import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GradientBackground } from "../components/GradientBackground";
import { colors, typography } from "../theme";

const leaderboards = {
  friends: [
    { name: "You", points: 420 },
    { name: "Lumi", points: 395 },
    { name: "Kai", points: 360 },
  ],
  country: [
    { name: "Nova", points: 880 },
    { name: "You", points: 420 },
    { name: "Rune", points: 390 },
  ],
};

export const PointsScreen = () => (
  <GradientBackground gradient="sunset">
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={styles.title}>Points &amp; Badges</Text>
        <Text style={styles.subtitle}>
          Stay consistent to unlock new gradients, frames, and special prompts.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Today&apos;s progress</Text>
        <Text style={styles.pointsValue}>+25 pts • Video response</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Leaderboards</Text>
        {Object.entries(leaderboards).map(([label, data]) => (
          <View key={label} style={styles.boardSection}>
            <Text style={styles.boardTitle}>{label.toUpperCase()}</Text>
            {data.map((item) => (
              <View key={item.name} style={styles.boardRow}>
                <Text style={styles.boardName}>{item.name}</Text>
                <Text style={styles.boardPoints}>{item.points} pts</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  </GradientBackground>
);

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 24,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.86,
    marginTop: 10,
  },
  card: {
    borderRadius: 24,
    backgroundColor: "rgba(11, 5, 32, 0.7)",
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  sectionLabel: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  pointsValue: {
    ...typography.title,
    color: colors.accentPink,
  },
  boardSection: {
    marginTop: 12,
    gap: 10,
  },
  boardTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  boardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  boardName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  boardPoints: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
