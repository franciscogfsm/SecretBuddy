import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ArrowRightIcon } from "react-native-heroicons/outline";
import { colors, typography } from "../theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon?: any; // Can be Ionicons name or Heroicon component
  iconType?: "ionicons" | "heroicon";
  action?: "navigate-profile"; // Special action to perform on this step
}

interface OnboardingTutorialProps {
  visible: boolean;
  steps: TutorialStep[];
  currentStep: number;
  onNext: () => void;
  onPrevious?: () => void;
  onSkip: () => void;
  onComplete: () => void;
  onAction?: (action: string) => void; // Callback for special actions like navigation
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  visible,
  steps,
  currentStep,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  onAction,
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hintOpacity = useRef(new Animated.Value(1)).current; // Separate opacity for hint to prevent flashing

  // Pan responder for swipe gestures
  const panResponderRef = useRef<any>(null);
  const swipeDirection = useRef(0); // -1 for left, 1 for right
  const isAnimating = useRef(false); // Prevent animation conflicts
  const prevStepRef = useRef(currentStep); // Track previous step
  const hasInitialized = useRef(false); // Track if first animation ran
  const animationRef = useRef<any>(null); // Store running animation reference
  const hasSwipedOnce = useRef(false); // Track if user has swiped at least once

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Define handleNext before using it in effects
  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      onNext();
    }
  };

  // Initialize pan responder for swipe detection with smooth transitions
  // Recreate whenever dependencies change to ensure proper behavior
  useEffect(() => {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10; // Only respond to horizontal swipes
      },
      onPanResponderMove: (_, gestureState) => {
        if (isAnimating.current) return; // Don't follow finger during animation
        // Follow finger for interactive feel (with less resistance for smoother feel)
        const resistance = 0.5;
        slideAnim.setValue(gestureState.dx * resistance);
      },
      onPanResponderRelease: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        if (isAnimating.current) {
          // If already animating, force complete current animation and reset
          if (animationRef.current) {
            animationRef.current.stop();
          }
          slideAnim.setValue(0);
          scaleAnim.setValue(1);
          fadeAnim.setValue(1);
          isAnimating.current = false;
          return;
        }

        const { dx, vx } = gestureState;
        const swipeDistance = 60; // Minimum distance to trigger swipe (reduced for easier swiping)
        const swipeVelocity = 0.4; // Minimum velocity (reduced for easier swiping)

        // Swipe LEFT (dx < -60) = Go Forward/Next
        if (dx < -swipeDistance || (vx < -swipeVelocity && dx < -30)) {
          if (!isLastStep) {
            isAnimating.current = true;
            swipeDirection.current = -1; // Moving forward

            // Hide hint after first swipe
            if (!hasSwipedOnce.current) {
              hasSwipedOnce.current = true;
              Animated.timing(hintOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }

            handleNext();
            setTimeout(() => {
              isAnimating.current = false;
              // Force reset to ensure clean state
              slideAnim.setValue(0);
              scaleAnim.setValue(1);
              fadeAnim.setValue(1);
            }, 400);
          } else {
            // Bounce back on last step
            Animated.spring(slideAnim, {
              toValue: 0,
              tension: 80,
              friction: 8,
              useNativeDriver: true,
            }).start();
          }
        }
        // Swipe RIGHT (dx > 60) = Go Back/Previous
        else if (
          (dx > swipeDistance || (vx > swipeVelocity && dx > 30)) &&
          currentStep > 0 &&
          onPrevious
        ) {
          isAnimating.current = true;
          swipeDirection.current = 1; // Moving backward

          // Hide hint after first swipe
          if (!hasSwipedOnce.current) {
            hasSwipedOnce.current = true;
            Animated.timing(hintOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }

          onPrevious();
          setTimeout(() => {
            isAnimating.current = false;
            // Force reset to ensure clean state
            slideAnim.setValue(0);
            scaleAnim.setValue(1);
            fadeAnim.setValue(1);
          }, 400);
        }
        // Not enough swipe, bounce back
        else {
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    });
  }, [currentStep, isLastStep, onPrevious, handleNext, slideAnim]);

  // Initial fade-in when modal opens
  useEffect(() => {
    if (visible && !hasInitialized.current) {
      hasInitialized.current = true;
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      hintOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(hintOpacity, {
          toValue: 1,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!visible) {
      // Reset when modal closes
      hasInitialized.current = false;
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      slideAnim.setValue(0);
      hintOpacity.setValue(1);
    }
  }, [visible]);

  // Smooth card transition animation ONLY when step changes
  useEffect(() => {
    if (!visible || !hasInitialized.current) return;

    // Only animate if step actually changed
    if (prevStepRef.current === currentStep) return;

    const stepChanged = prevStepRef.current !== currentStep;
    prevStepRef.current = currentStep;

    if (!stepChanged) return;

    // Trigger action if this step has one
    if (step?.action && onAction) {
      onAction(step.action);
    }

    // Direction-based slide animation for continuous scrolling feel
    // Going forward (swipe left): new card slides in from right
    // Going backward (swipe right): new card slides in from left
    const slideFrom =
      swipeDirection.current === -1
        ? SCREEN_WIDTH * 0.8
        : swipeDirection.current === 1
        ? -SCREEN_WIDTH * 0.8
        : 0;

    // Stop any ongoing animation first to prevent getting stuck
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    // Set initial animation values immediately
    slideAnim.setValue(slideFrom);
    scaleAnim.setValue(0.88);
    fadeAnim.setValue(0.2); // Start with slight visibility to prevent disappearing

    // Ultra-smooth entrance animation with damped spring for buttery lock-in
    animationRef.current = Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 28,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 28,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
    ]);

    animationRef.current.start(({ finished }: { finished: boolean }) => {
      // Only set final values if animation completed naturally
      if (finished) {
        slideAnim.setValue(0);
        scaleAnim.setValue(1);
        fadeAnim.setValue(1);
        animationRef.current = null;
      }
    });

    // Reset swipe direction
    swipeDirection.current = 0;
  }, [currentStep, visible]);

  if (!visible || !step) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container} {...panResponderRef.current?.panHandlers}>
        {/* Simple dimmed backdrop */}
        <View style={styles.overlay} pointerEvents="none" />

        {/* Card and hint container */}
        <View style={styles.cardContainer}>
          {/* Interactive tutorial card with smooth transitions */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            {/* Pagination dots */}
            <View style={styles.paginationContainer}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentStep && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>

            {/* Icon */}
            {step.icon && (
              <View style={styles.iconContainer}>
                {step.iconType === "heroicon" ? (
                  <step.icon size={48} color={colors.accentPurple} />
                ) : (
                  <Ionicons
                    name={step.icon}
                    size={48}
                    color={colors.accentPurple}
                  />
                )}
              </View>
            )}

            {/* Content */}
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>

            {/* Actions */}
            <View style={styles.actions}>
              {!isLastStep ? (
                <TouchableOpacity
                  onPress={onSkip}
                  style={styles.skipButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipText}>Skip Tutorial</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={onComplete}
                  style={styles.getStartedButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.getStartedText}>Get Started</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Swipe hint - directly below card, disappears after first swipe */}
          <Animated.View style={[styles.swipeHint, { opacity: hintOpacity }]}>
            <View style={styles.swipeHintContainer}>
              <Text style={styles.swipeHintText}>Swipe to navigate</Text>
              <ArrowRightIcon size={16} color={colors.textSecondary} />
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  cardContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 32,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 2,
    borderColor: "rgba(156, 107, 255, 0.4)",
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: colors.accentPurple,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(156, 107, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(156, 107, 255, 0.3)",
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    minWidth: 200,
    alignItems: "center",
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  getStartedButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    backgroundColor: colors.accentPurple,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
    alignItems: "center",
  },
  getStartedText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  swipeHint: {
    marginTop: 20,
    alignSelf: "center",
  },
  swipeHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swipeHintText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    fontStyle: "italic",
  },
});
