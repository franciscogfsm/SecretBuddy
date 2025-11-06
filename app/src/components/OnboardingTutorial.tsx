import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme";
import { BlurView } from "expo-blur";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon?: any; // Can be Ionicons name or Heroicon component
  iconType?: "ionicons" | "heroicon";
  targetPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  placement?: "top" | "bottom" | "center";
  targetElement?: string; // ID of the element to highlight (e.g., "pool-button", "profile-tab")
}

interface OnboardingTutorialProps {
  visible: boolean;
  steps: TutorialStep[];
  currentStep: number;
  onNext: () => void;
  onPrevious?: () => void;
  onSkip: () => void;
  onComplete: () => void;
  elementRefs?: Record<
    string,
    { x: number; y: number; width: number; height: number }
  >; // Positions of UI elements to highlight
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  visible,
  steps,
  currentStep,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  elementRefs = {},
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pan responder for swipe gestures
  const panResponderRef = useRef<any>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Initialize pan responder for swipe detection
  useEffect(() => {
    if (!panResponderRef.current) {
      panResponderRef.current = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderRelease: (
          _evt: GestureResponderEvent,
          gestureState: PanResponderGestureState
        ) => {
          const { dx } = gestureState;
          const swipeDistance = 50; // Minimum distance to trigger swipe

          // Swipe left (dx < -50) or swipe right (dx > 50)
          if (dx < -swipeDistance) {
            // Swiped left - go to next step
            handleNext();
          } else if (dx > swipeDistance && currentStep > 0) {
            // Swiped right - go to previous step
            if (onPrevious) {
              onPrevious();
            }
          }
        },
      });
    }
  }, [currentStep, isLastStep, onPrevious]);

  useEffect(() => {
    if (visible) {
      // Fade in animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for spotlight
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible, currentStep]);

  if (!visible || !step) return null;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      onNext();
    }
  };

  const getTooltipPosition = () => {
    // Check if this step should highlight a specific element
    const targetElement = step.targetElement;
    const targetPos =
      targetElement && elementRefs[targetElement]
        ? elementRefs[targetElement]
        : step.targetPosition;

    if (!targetPos) {
      return { top: SCREEN_HEIGHT / 2 - 150 };
    }

    const { y, height } = targetPos;
    const tooltipHeight = 280;

    if (step.placement === "bottom") {
      return { top: y + height + 20 };
    } else if (step.placement === "top") {
      return { top: Math.max(20, y - tooltipHeight - 20) };
    } else {
      return { top: SCREEN_HEIGHT / 2 - tooltipHeight / 2 };
    }
  };

  const getSpotlightPosition = () => {
    // Check if this step should highlight a specific element
    const targetElement = step.targetElement;
    return targetElement && elementRefs[targetElement]
      ? elementRefs[targetElement]
      : step.targetPosition;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container} {...panResponderRef.current?.panHandlers}>
        {/* Blurred backdrop */}
        {Platform.OS === "ios" ? (
          <BlurView intensity={30} style={StyleSheet.absoluteFill}>
            <View style={styles.overlay} />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.overlay]} />
        )}

        {/* Spotlight effect on target (if provided) */}
        {getSpotlightPosition() && (
          <Animated.View
            style={[
              styles.spotlight,
              {
                left: getSpotlightPosition()!.x - 10,
                top: getSpotlightPosition()!.y - 10,
                width: getSpotlightPosition()!.width + 20,
                height: getSpotlightPosition()!.height + 20,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}

        {/* Tooltip card */}
        <Animated.View
          style={[
            styles.tooltip,
            getTooltipPosition(),
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.stepCounter}>
              {currentStep + 1} / {steps.length}
            </Text>
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
            {currentStep > 0 && (
              <TouchableOpacity
                onPress={onPrevious}
                style={styles.previousButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}

            {!isLastStep && (
              <TouchableOpacity
                onPress={onSkip}
                style={styles.skipButton}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleNext}
              style={styles.nextButton}
              activeOpacity={0.7}
            >
              <Text style={styles.nextText}>
                {isLastStep ? "Get Started" : "Next"}
              </Text>
              {!isLastStep && (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={colors.textPrimary}
                  style={styles.nextIcon}
                />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Tap anywhere to continue hint */}
        {currentStep > 0 && (
          <Animated.View style={[styles.tapHint, { opacity: fadeAnim }]}>
            <Text style={styles.tapHintText}>
              Swipe left for next, swipe right to go back
            </Text>
          </Animated.View>
        )}
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
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  spotlight: {
    position: "absolute",
    backgroundColor: "transparent",
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.accentPurple,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  tooltip: {
    position: "absolute",
    width: SCREEN_WIDTH - 40,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.3)",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accentPurple,
    borderRadius: 2,
  },
  stepCounter: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
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
  previousButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.accentPurple,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  nextIcon: {
    marginLeft: 8,
  },
  tapHint: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
  },
  tapHintText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    fontStyle: "italic",
  },
});
