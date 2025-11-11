import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography } from "../theme";
import type { Story } from "../services/storiesService";

type TrayStory = {
  id: string;
  hasViewed: boolean;
  isOwnStory?: boolean;
};

type StoriesTrayProps = {
  hasPosted: boolean;
  stories: Story[];
  onAddStory: () => void;
  onStoryPress: (storyId: string) => void;
  onStoryViewed?: (storyId: string) => void;
};

export const StoriesTray = ({
  hasPosted,
  stories,
  onAddStory,
  onStoryPress,
  onStoryViewed,
}: StoriesTrayProps) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  // Build tray stories: own story first (if posted), then others
  const trayStories: TrayStory[] = [
    // Own story (only if user has posted)
    ...(hasPosted
      ? [
          {
            id: "own",
            hasViewed: true, // Own story always viewed
            isOwnStory: true,
          },
        ]
      : []),
    // Other people's stories
    ...stories.map((story) => ({
      id: story.id,
      hasViewed: story.hasViewedByCurrentUser || false,
      isOwnStory: false,
    })),
  ];

  const dynamicStyles = StyleSheet.create({
    title: {
      ...typography.subtitle,
      color: colors.textPrimary,
      fontSize: isSmallScreen ? 18 : 20,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      fontSize: isSmallScreen ? 11 : 12,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={dynamicStyles.title}>Daily Post</Text>
        <Text style={dynamicStyles.subtitle}>
          {hasPosted ? "Tap to view" : "Post to unlock"}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Add Story Button - only show if user hasn't posted */}
        {!hasPosted && (
          <Pressable style={styles.addStoryButton} onPress={onAddStory}>
            <LinearGradient
              colors={["rgba(99, 102, 241, 0.2)", "rgba(139, 92, 246, 0.2)"]}
              style={styles.addStoryCircle}
            >
              <Ionicons name="add" size={28} color={colors.accentPurple} />
            </LinearGradient>
            <Text style={styles.storyLabel}>Post</Text>
          </Pressable>
        )}

        {/* Story circles - locked if user hasn't posted */}
        {trayStories.map((story) => (
          <StoryCircle
            key={story.id}
            story={story}
            isLocked={!hasPosted && !story.isOwnStory}
            onPress={() => {
              onStoryPress(story.id);
              // Mark as viewed after opening
              if (onStoryViewed && !story.hasViewed) {
                onStoryViewed(story.id);
              }
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
};

type StoryCircleProps = {
  story: TrayStory;
  isLocked: boolean;
  onPress: () => void;
};

const StoryCircle = ({ story, isLocked, onPress }: StoryCircleProps) => {
  // Ring colors for unviewed stories
  const ringColors = (
    story.isOwnStory
      ? ["#6366F1", "#9C6BFF", "#C084FC"] // Purple gradient for own story
      : ["#9C6BFF", "#FF4461", "#2EE6A9"]
  ) as readonly [string, string, ...string[]]; // Original gradient for others // Original gradient for random

  return (
    <Pressable
      style={styles.storyContainer}
      onPress={isLocked ? undefined : onPress}
      disabled={isLocked}
    >
      <View style={styles.storyCircleWrapper}>
        {/* Gradient ring for unviewed stories OR gray ring for viewed */}
        {!isLocked && (
          <LinearGradient
            colors={
              story.hasViewed
                ? ["#4A5568", "#4A5568", "#4A5568"] // Gray ring for viewed stories
                : ringColors // Colorful gradient for unviewed
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.storyRing}
          />
        )}

        {/* Story circle */}
        <View style={[styles.storyCircle, isLocked && styles.lockedStory]}>
          {isLocked ? (
            <View style={styles.lockOverlay}>
              <Ionicons
                name="lock-closed"
                size={24}
                color="rgba(255,255,255,0.3)"
              />
            </View>
          ) : (
            <Ionicons
              name={story.isOwnStory ? "person-circle" : "person"}
              size={story.isOwnStory ? 32 : 28}
              color={story.hasViewed ? "#6B7280" : colors.accentPurple}
            />
          )}
        </View>
      </View>

      <Text style={styles.storyLabel}>
        {isLocked ? "Locked" : story.isOwnStory ? "You" : "Anonymous"}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    paddingTop: 4,
    gap: 16,
  },
  addStoryButton: {
    alignItems: "center",
    marginRight: 4,
  },
  addStoryCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(99, 102, 241, 0.4)",
    borderStyle: "dashed",
  },
  storyContainer: {
    alignItems: "center",
    marginRight: 4,
  },
  storyCircleWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  storyRing: {
    position: "absolute",
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  storyCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(30, 20, 60, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.background,
  },
  viewedStory: {
    opacity: 0.6,
  },
  lockedStory: {
    backgroundColor: "rgba(20, 15, 40, 0.6)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  storyLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 6,
    textAlign: "center",
    maxWidth: 70,
  },
});
