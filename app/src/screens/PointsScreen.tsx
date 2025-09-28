import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GradientBackground } from "../components/GradientBackground";
import { colors, gradients, typography } from "../theme";

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

const insights = [
  { label: "Daily streak", value: "12 days", tone: colors.accentPink },
  { label: "This week", value: "+145 pts", tone: colors.accentPurple },
  { label: "Next unlock", value: "Cosmic frame", tone: colors.accentTeal },
];

const badges = [
  {
    title: "Night Owl",
    description: "Reply after 9pm",
    gradient: gradients.midnight,
  },
  {
    title: "Spark Starter",
    description: "Send 10 prompts",
    gradient: gradients.purplePink,
  },
  {
    title: "Vibe Keeper",
    description: "3-day streak",
    gradient: gradients.tealBlue,
  },
];

const streakProgress = 0.72;

export const PointsScreen = () => (
  <GradientBackground gradient="midnight">
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Points &amp; Badges</Text>
          <Text style={styles.subtitle}>
            Stay consistent to unlock new gradients, frames, and special
            prompts.
          </Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Lvl 12 • Radiant</Text>
        </View>
      </View>

      <View style={styles.highlightWrapper}>
        <LinearGradient
          colors={["rgba(156, 107, 255, 0.65)", "rgba(255, 79, 183, 0.35)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.highlightCard}
        >
          <Text style={styles.sectionLabel}>Today&apos;s progress</Text>
          <Text style={styles.pointsValue}>+25 pts</Text>
          <Text style={styles.sectionCaption}>Video response completed</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${streakProgress * 100}%` },
              ]}
            />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.metaLabel}>72% towards weekly goal</Text>
            <Text style={styles.metaValue}>3 tasks left</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.insightsRow}>
        {insights.map((insight) => (
          <View key={insight.label} style={styles.insightCard}>
            <View
              style={[styles.insightAccent, { backgroundColor: insight.tone }]}
            />
            <Text style={styles.insightLabel}>{insight.label}</Text>
            <Text style={styles.insightValue}>{insight.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.leaderboardCard}>
        <Text style={styles.sectionHeading}>Leaderboards</Text>
        {Object.entries(leaderboards).map(([label, data]) => (
          <View key={label} style={styles.boardSection}>
            <Text style={styles.boardTitle}>{label.toUpperCase()}</Text>
            {data.map((item, index) => (
              <View
                key={item.name}
                style={[styles.boardRow, index === 0 && styles.boardRowActive]}
              >
                <View style={styles.boardLeft}>
                  <View style={styles.rankPill}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.boardName}>{item.name}</Text>
                </View>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 160,
    gap: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.78,
    marginTop: 10,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(11, 5, 32, 0.7)",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  pillLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  highlightWrapper: {
    borderRadius: 26,
    overflow: "hidden",
  },
  highlightCard: {
    borderRadius: 26,
    padding: 22,
    gap: 16,
    backgroundColor: "rgba(5, 3, 12, 0.65)",
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pointsValue: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 28,
  },
  sectionCaption: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.78,
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  progressFill: {
    flex: 1,
    backgroundColor: colors.accentPink,
    borderRadius: 999,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metaValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  insightsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  insightCard: {
    flex: 1,
    borderRadius: 24,
    minWidth: 150,
    padding: 16,
    backgroundColor: "rgba(11, 5, 32, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 12,
  },
  insightAccent: {
    width: 32,
    height: 4,
    borderRadius: 999,
    opacity: 0.9,
  },
  insightLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  insightValue: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  badgesSection: {
    gap: 14,
  },
  sectionHeading: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  badgeRow: {
    gap: 14,
    paddingVertical: 4,
  },
  badgeCard: {
    width: 160,
    borderRadius: 20,
    padding: 16,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  badgeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 3, 12, 0.18)",
  },
  badgeTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  badgeDescription: {
    ...typography.caption,
    color: colors.textPrimary,
    opacity: 0.78,
    marginTop: 6,
  },
  leaderboardCard: {
    borderRadius: 24,
    backgroundColor: "rgba(11, 5, 32, 0.85)",
    padding: 22,
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.15)",
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  boardSection: {
    gap: 10,
  },
  boardTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  boardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  boardRowActive: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  boardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rankPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(156, 107, 255, 0.35)",
  },
  rankText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  boardName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  boardPoints: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
