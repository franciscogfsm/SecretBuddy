import React, { useRef, useCallback, useEffect, useState } from "react";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";

import { GradientBackground } from "../components/GradientBackground";
import { TopHeader } from "../components/TopHeader";
import { colors, gradients, typography } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  getUserBadges,
  getUnlockedBadgeDetails,
  ALL_BADGES,
  Badge,
} from "../services/badgeService";

export const PointsScreen = () => {
  const { user } = useAuth();
  const { profile, points, streak, hearts } = useUserProfile();
  const isFocused = useIsFocused();
  const scrollRef = useRef<ScrollView>(null);
  const wasFocusedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([]);
  const [totalBadgesCount, setTotalBadgesCount] = useState(0);

  // Load user badges from database
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadBadges = async () => {
      try {
        setLoading(true);
        const badgeDetails = await getUnlockedBadgeDetails(user.uid);
        setUnlockedBadges(badgeDetails);
        setTotalBadgesCount(badgeDetails.length);
      } catch (error) {
        console.error("Error loading badges:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBadges();
  }, [user?.uid]);

  // Calculate level based on points
  const level = Math.floor(points / 50) + 1;
  const levelName =
    level >= 10
      ? "Radiant"
      : level >= 7
      ? "Legendary"
      : level >= 5
      ? "Epic"
      : level >= 3
      ? "Advanced"
      : "Beginner";

  // Calculate weekly progress (mock for now - can be enhanced)
  const weeklyGoal = 200;
  const weeklyProgress = Math.min((points % 200) / weeklyGoal, 1);
  const tasksLeft = Math.max(3 - Math.floor(weeklyProgress * 3), 0);

  // Insights from real data
  const insights = [
    { label: "Daily streak", value: `${streak} days`, tone: colors.accentPink },
    {
      label: "This week",
      value: `+${Math.floor(weeklyProgress * 200)} pts`,
      tone: colors.accentPurple,
    },
    {
      label: "Hearts left",
      value: `${hearts} ❤️`,
      tone: colors.accentTeal,
    },
  ];

  // Mock leaderboards (can be enhanced with real data later)
  const leaderboards = {
    friends: [
      { name: "You", points: points },
      { name: "Lumi", points: Math.max(0, points - 25) },
      { name: "Kai", points: Math.max(0, points - 60) },
    ],
    country: [
      { name: "Nova", points: points + 460 },
      { name: "You", points: points },
      { name: "Rune", points: Math.max(0, points - 30) },
    ],
  };

  useFocusEffect(
    useCallback(() => {
      if (wasFocusedRef.current && isFocused) {
        // User tapped the tab again, scroll to top
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
      wasFocusedRef.current = isFocused;
    }, [isFocused])
  );
  return (
    <GradientBackground gradient="midnight">
      <TopHeader />
      <ScrollView
        ref={scrollRef}
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
            <Text style={styles.pillLabel}>
              Lvl {level} • {levelName}
            </Text>
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
            <Text style={styles.pointsValue}>+{points} pts</Text>
            <Text style={styles.sectionCaption}>Total points earned</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${weeklyProgress * 100}%` },
                ]}
              />
            </View>
            <View style={styles.progressMeta}>
              <Text style={styles.metaLabel}>
                {Math.floor(weeklyProgress * 100)}% towards weekly goal
              </Text>
              <Text style={styles.metaValue}>{tasksLeft} tasks left</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.insightsRow}>
          {insights.map((insight) => (
            <View key={insight.label} style={styles.insightCard}>
              <View
                style={[
                  styles.insightAccent,
                  { backgroundColor: insight.tone },
                ]}
              />
              <Text style={styles.insightLabel}>{insight.label}</Text>
              <Text style={styles.insightValue}>{insight.value}</Text>
            </View>
          ))}
        </View>

        {/* Badges Section */}
        <View style={styles.badgesSection}>
          <Text style={styles.sectionHeading}>
            Badges ({totalBadgesCount}/{ALL_BADGES.length})
          </Text>
          <Text style={styles.sectionSubtext}>
            {totalBadgesCount === 0
              ? "Start earning badges by being active!"
              : `You've unlocked ${totalBadgesCount} badge${
                  totalBadgesCount > 1 ? "s" : ""
                }! Keep going!`}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.badgeRow}
            contentContainerStyle={styles.badgeRowContent}
          >
            {/* Show unlocked badges first */}
            {unlockedBadges.map((badge) => (
              <View key={badge.id} style={styles.badgeCard}>
                <LinearGradient
                  colors={badge.gradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.badgeGradient}
                >
                  <View style={styles.badgeOverlay} />
                  <Text style={styles.badgeTitle}>{badge.title}</Text>
                  <Text style={styles.badgeDescription}>
                    {badge.description}
                  </Text>
                  <Text style={styles.badgeUnlocked}>✓ Unlocked</Text>
                </LinearGradient>
              </View>
            ))}

            {/* Show locked badges */}
            {ALL_BADGES.filter(
              (badge) => !unlockedBadges.find((ub) => ub.id === badge.id)
            ).map((badge) => (
              <View key={badge.id} style={styles.badgeCard}>
                <LinearGradient
                  colors={["rgba(50, 50, 50, 0.4)", "rgba(30, 30, 30, 0.4)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.badgeGradient}
                >
                  <View style={styles.badgeLockedOverlay} />
                  <Text style={styles.badgeTitleLocked}>{badge.title}</Text>
                  <Text style={styles.badgeDescriptionLocked}>
                    {badge.description}
                  </Text>
                  <Text style={styles.badgeLocked}>🔒 Locked</Text>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.leaderboardCard}>
          <Text style={styles.sectionHeading}>Leaderboards</Text>
          {Object.entries(leaderboards).map(([label, data]) => (
            <View key={label} style={styles.boardSection}>
              <Text style={styles.boardTitle}>{label.toUpperCase()}</Text>
              {data.map((item, index) => (
                <View
                  key={item.name}
                  style={[
                    styles.boardRow,
                    index === 0 && styles.boardRowActive,
                  ]}
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
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  sectionSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  badgeRowContent: {
    paddingVertical: 4,
  },
  badgeGradient: {
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
  badgeUnlocked: {
    ...typography.caption,
    color: colors.accentTeal,
    marginTop: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badgeLockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  badgeTitleLocked: {
    ...typography.subtitle,
    color: colors.textSecondary,
    opacity: 0.6,
  },
  badgeDescriptionLocked: {
    ...typography.caption,
    color: colors.textSecondary,
    opacity: 0.5,
    marginTop: 6,
  },
  badgeLocked: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 8,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.7,
  },
});
