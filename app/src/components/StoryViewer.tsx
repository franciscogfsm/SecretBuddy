import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  Pressable,
  Dimensions,
  Animated,
  PanResponder,
  Easing,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography } from "../theme";
import type { Story, StoryReaction } from "../services/storiesService";

const { width, height } = Dimensions.get("window");

type StoryViewerProps = {
  visible: boolean;
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onReact: (storyId: string) => void;
  onStoryViewed?: (storyId: string) => void; // Called when story is viewed
  onImageError?: () => void; // Called when story image fails to load
  hasReacted?: boolean;
  isOwnStory?: boolean; // If viewing your own story
  viewerCount?: number; // Number of viewers (only for own story)
};

const REACTIONS: StoryReaction[] = ["fire"];

const REACTION_ICONS: Record<StoryReaction, keyof typeof Ionicons.glyphMap> = {
  fire: "flame",
};

export const StoryViewer = ({
  visible,
  stories,
  initialIndex,
  onClose,
  onReact,
  onStoryViewed,
  onImageError,
  hasReacted = false,
  isOwnStory = false,
  viewerCount = 0,
}: StoryViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress] = useState(new Animated.Value(0));
  const [reactedStories, setReactedStories] = useState<Set<string>>(new Set());
  const [scaleAnim] = useState(new Animated.Value(1));
  const [rotateAnim] = useState(new Animated.Value(0));
  const [glowAnim] = useState(new Animated.Value(0));
  const [particlesAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(0));
  const [opacity] = useState(new Animated.Value(1));
  const [spinAnim] = useState(new Animated.Value(0));
  const [isPaused, setIsPaused] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const progressTimerRef = useRef<Animated.CompositeAnimation | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdDurationRef = useRef(0);

  const currentStory = stories[currentIndex];
  const userHasReacted = reactedStories.has(currentStory?.id);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const loadedImagesRef = useRef(new Set<string>());

  // Optimistic UI for reaction count (instant feedback only)
  const [optimisticReactionCount, setOptimisticReactionCount] = useState<
    number | null
  >(null);

  // Use optimistic count if set, otherwise use the story's count
  const displayedReactionCount =
    optimisticReactionCount ?? currentStory?.fireCount ?? 0;

  // Reset currentIndex when modal opens with new initialIndex
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      progress.setValue(0);
      opacity.setValue(1); // Reset opacity
      translateY.setValue(0); // Reset translateY
    }
  }, [visible, initialIndex]);

  // Reset loaded state when modal opens or story changes
  useEffect(() => {
    if (visible && currentStory?.imageUrl) {
      // Check if we've already loaded this image
      if (loadedImagesRef.current.has(currentStory.imageUrl)) {
        setImageLoaded(true);
      } else {
        setImageLoaded(false);
      }
      // Reset optimistic count when story changes (props will have the updated value)
      setOptimisticReactionCount(null);
    }
  }, [visible, currentIndex, currentStory?.imageUrl]);

  // Sync optimistic count with real count when it updates from server
  useEffect(() => {
    if (
      currentStory?.fireCount !== undefined &&
      optimisticReactionCount !== null
    ) {
      // If real count caught up with or exceeded optimistic, reset to show real count
      if (currentStory.fireCount >= optimisticReactionCount) {
        setOptimisticReactionCount(null);
      }
    }
  }, [currentStory?.fireCount]);

  // Preload next image in background
  useEffect(() => {
    if (visible && stories.length > 1) {
      const nextStory = stories[currentIndex + 1];
      if (nextStory?.imageUrl) {
        Image.prefetch(nextStory.imageUrl);
      }
    }
  }, [visible, currentIndex, stories]);

  // Clear loaded images cache when modal closes
  useEffect(() => {
    if (!visible) {
      // Reset closing state
      setIsClosing(false);
      // Wait for close animation to complete before resetting
      setTimeout(() => {
        loadedImagesRef.current.clear();
        setImageLoaded(false);
      }, 300); // Match the 250ms animation duration + buffer
      opacity.setValue(1); // Reset opacity for next open
      translateY.setValue(0); // Reset translateY for next open
    }
  }, [visible]);

  // Spinning animation for loading spinner
  useEffect(() => {
    if (!imageLoaded) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [imageLoaded]);

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Pan responder for swipe down to close
  const isDragging = useRef(false);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes (down)
        return Math.abs(gestureState.dy) > 10 && gestureState.dy > 0;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        // Light haptic on drag start
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          // Fade out as user drags down
          const opacityValue = 1 - gestureState.dy / 400;
          opacity.setValue(opacityValue < 0 ? 0 : opacityValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false;
        if (gestureState.dy > 150) {
          // Swipe threshold met - close viewer
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setIsClosing(true); // Prevent any updates during close animation
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: height,
              duration: 250,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 250,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Close modal immediately without flickering
            onClose();
          });
        } else {
          // Snap back
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              friction: 9,
              tension: 120,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Reset animations when story changes
  useEffect(() => {
    scaleAnim.setValue(1);
    rotateAnim.setValue(0);
    glowAnim.setValue(0);
    particlesAnim.setValue(0);
  }, [currentIndex]);

  // Auto-progress timer (7 seconds per story - only starts when image is loaded)
  useEffect(() => {
    if (!visible || !imageLoaded || isPaused) {
      progressTimerRef.current?.stop();
      return;
    }

    // Mark story as viewed when it starts playing (not own story)
    if (!isOwnStory && currentStory?.id && onStoryViewed) {
      onStoryViewed(currentStory.id);
    }

    // Reset progress when starting
    progress.setValue(0);

    const timer = Animated.timing(progress, {
      toValue: 1,
      duration: 7000,
      useNativeDriver: false,
    });

    progressTimerRef.current = timer;

    timer.start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => timer.stop();
  }, [
    visible,
    currentIndex,
    imageLoaded,
    isPaused,
    isOwnStory,
    currentStory?.id,
    onStoryViewed,
  ]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if there's a next story
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      progress.setValue(0);
      setImageLoaded(false); // Reset for next story
    } else {
      // No more stories - close viewer
      progress.setValue(0);
      onClose();
    }
  };

  const handlePrevious = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      progress.setValue(0);
      setImageLoaded(false); // Reset for previous story
    }
  };

  const handleFireReaction = () => {
    if (isOwnStory) return; // Can't react to own story

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If already reacted, just show animation (doesn't count again)
    if (!userHasReacted) {
      setReactedStories((prev) => new Set(prev).add(currentStory.id));
      // Optimistic UI - immediately show +1 reaction (instant feedback)
      setOptimisticReactionCount((currentStory.fireCount || 0) + 1);
      onReact(currentStory.id); // This will update the stories array in HomeScreen
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Light haptic for already reacted
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Complex fire animation - burst effect
    Animated.parallel([
      // Scale burst
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.6,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
      // Rotation wiggle
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(rotateAnim, {
          toValue: 0,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
      // Glow pulse
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Particles burst
      Animated.sequence([
        Animated.timing(particlesAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(particlesAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  if (!currentStory) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Background Image */}
        <Image
          source={{ uri: currentStory.imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onLoadStart={() => {
            // Don't update during close animation
            if (
              !isClosing &&
              !loadedImagesRef.current.has(currentStory.imageUrl)
            ) {
              setImageLoaded(false);
              setImageError(false);
            }
          }}
          onLoad={() => {
            // Don't update during close animation
            if (!isClosing) {
              loadedImagesRef.current.add(currentStory.imageUrl);
              setImageLoaded(true);
              setImageError(false);
            }
          }}
          onError={() => {
            if (!isClosing) {
              console.warn(
                `Failed to load story image: ${currentStory.imageUrl}`
              );
              setImageLoaded(true);
              setImageError(true);
              // Call error callback to close viewer
              if (onImageError) {
                onImageError();
              }
            }
          }}
        />

        {/* Loading indicator */}
        {!imageLoaded && (
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingSpinner,
                { transform: [{ rotate: spinRotation }] },
              ]}
            />
          </View>
        )}

        {/* Dark Overlay */}
        <View style={styles.overlay} />

        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      index === currentIndex
                        ? progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          })
                        : index < currentIndex
                        ? "100%"
                        : "0%",
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.anonymousInfo}>
            <View style={styles.anonymousAvatar}>
              <Ionicons name="person" size={18} color={colors.textPrimary} />
            </View>
            <Text style={styles.anonymousText}>Anonymous</Text>
          </View>

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Tap Areas for Navigation */}
        <View style={styles.tapContainer}>
          <Pressable
            style={styles.tapLeft}
            onPressIn={() => {
              holdDurationRef.current = 0;
              setIsPaused(true);
              tapTimerRef.current = setInterval(() => {
                holdDurationRef.current += 100;
              }, 100);
            }}
            onPressOut={() => {
              if (tapTimerRef.current) clearInterval(tapTimerRef.current);
              setIsPaused(false);
              // Only navigate if held for less than 300ms (quick tap)
              if (holdDurationRef.current < 300) {
                handlePrevious();
              }
            }}
          />
          <Pressable
            style={styles.tapRight}
            onPressIn={() => {
              holdDurationRef.current = 0;
              setIsPaused(true);
              tapTimerRef.current = setInterval(() => {
                holdDurationRef.current += 100;
              }, 100);
            }}
            onPressOut={() => {
              if (tapTimerRef.current) clearInterval(tapTimerRef.current);
              setIsPaused(false);
              // Only navigate if held for less than 300ms (quick tap)
              if (holdDurationRef.current < 300) {
                handleNext();
              }
            }}
          />
        </View>

        {/* Bottom Bar - Stats for Own Story or Fire Button for Others */}
        {isOwnStory ? (
          <View style={styles.ownStoryStatsContainer}>
            <LinearGradient
              colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.8)"]}
              style={styles.statsGradientOverlay}
            />

            <View style={styles.statsHeader}>
              <Ionicons
                name="bar-chart"
                size={18}
                color="rgba(255, 255, 255, 0.7)"
              />
              <Text style={styles.statsHeaderText}>Your Story Performance</Text>
            </View>

            <View style={styles.ownStoryStats}>
              {/* Viewer Count */}
              <View style={styles.statCard}>
                <LinearGradient
                  colors={[
                    "rgba(156, 107, 255, 0.15)",
                    "rgba(99, 102, 241, 0.15)",
                  ]}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statIconContainer}>
                    <LinearGradient
                      colors={["#9C6BFF", "#6366F1"]}
                      style={styles.statIconGradient}
                    >
                      <Ionicons name="eye" size={22} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  <Text style={styles.statNumber}>{viewerCount}</Text>
                  <Text style={styles.statLabel}>Views</Text>
                </LinearGradient>
              </View>

              {/* Reactions Count */}
              <View style={styles.statCard}>
                <LinearGradient
                  colors={[
                    "rgba(255, 68, 97, 0.15)",
                    "rgba(255, 107, 157, 0.15)",
                  ]}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statIconContainer}>
                    <LinearGradient
                      colors={["#FF4461", "#FF6B9D"]}
                      style={styles.statIconGradient}
                    >
                      <Ionicons name="flame" size={22} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  <Text style={styles.statNumber}>
                    {displayedReactionCount}
                  </Text>
                  <Text style={styles.statLabel}>Reactions</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Engagement Rate */}
            {/* REMOVED */}
          </View>
        ) : (
          <View style={styles.bottomBar}>
            {/* Fire count */}
            <View style={styles.reactionsInfo}>
              <Ionicons name="flame" size={22} color="#FF4461" />
              <Text style={styles.reactionsCount}>
                {displayedReactionCount}
              </Text>
            </View>

            {/* Fire button - Premium design with animated border */}
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim }],
              }}
            >
              <View style={styles.fireButtonContainer}>
                {/* Animated pulsing glow ring when reacted */}
                {userHasReacted && (
                  <Animated.View
                    style={[
                      styles.glowRing,
                      {
                        opacity: glowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 0.8],
                        }),
                        transform: [
                          {
                            scale: glowAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.15],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={["#FF4461", "#FF6B9D", "#FFB88C"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.glowRingGradient}
                    />
                  </Animated.View>
                )}

                <Pressable
                  style={[
                    styles.fireButton,
                    userHasReacted && styles.fireButtonActive,
                  ]}
                  onPress={handleFireReaction}
                >
                  {/* Gradient border ring */}
                  <View style={styles.fireButtonBorder}>
                    <LinearGradient
                      colors={
                        userHasReacted
                          ? ["#FF4461", "#FF6B9D", "#FFB88C"]
                          : [
                              "rgba(255, 255, 255, 0.2)",
                              "rgba(255, 255, 255, 0.1)",
                            ]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.fireButtonBorderGradient}
                    />
                  </View>

                  {/* Inner button with gradient */}
                  <View style={styles.fireButtonInner}>
                    <LinearGradient
                      colors={
                        userHasReacted
                          ? ["#FF4461", "#FF6B9D"]
                          : ["rgba(30, 30, 30, 0.95)", "rgba(20, 20, 20, 0.98)"]
                      }
                      style={styles.fireButtonGradient}
                    >
                      <Animated.View
                        style={{
                          transform: [
                            {
                              rotate: rotateAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["0deg", "15deg"],
                              }),
                            },
                          ],
                        }}
                      >
                        <Ionicons
                          name="flame"
                          size={34}
                          color={
                            userHasReacted
                              ? "#FFFFFF"
                              : "rgba(255, 255, 255, 0.7)"
                          }
                        />
                      </Animated.View>
                    </LinearGradient>
                  </View>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  image: {
    width,
    height,
    position: "absolute",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderTopColor: "#FFFFFF",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 56,
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  anonymousInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  anonymousAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(156, 107, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  anonymousText: {
    ...typography.subtitle,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 20,
  },
  tapContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    top: 120,
  },
  tapLeft: {
    flex: 1,
  },
  tapRight: {
    flex: 1,
  },
  bottomBar: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  reactionsInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  reactionsCount: {
    ...typography.subtitle,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  fireButtonContainer: {
    position: "relative",
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: "hidden",
  },
  glowRingGradient: {
    width: "100%",
    height: "100%",
    opacity: 0.6,
  },
  fireButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  fireButtonActive: {
    shadowColor: "#FF4461",
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 16,
  },
  fireButtonBorder: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 36,
    overflow: "hidden",
  },
  fireButtonBorderGradient: {
    width: "100%",
    height: "100%",
  },
  fireButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: "hidden",
  },
  fireButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  ownStoryStatsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 30,
  },
  statsGradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    zIndex: 0,
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  statsHeaderText: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  ownStoryStats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statCardGradient: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statLabel: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  engagementRate: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  engagementLabel: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  engagementValue: {
    color: "#2EE6A9",
    fontSize: 18,
    fontWeight: "800",
  },
});
