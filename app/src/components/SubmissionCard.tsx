import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { CountdownChip } from "./CountdownChip";
import { PrimaryButton } from "./PrimaryButton";
import type { Prompt } from "../store/AppStateContext";
import { colors, gradients, typography } from "../theme";

type SubmissionCardProps = {
  prompt: Prompt;
  onSubmitVideo: () => void;
  onSubmitEmoji: () => void;
  isSubmitting?: boolean;
};

export const SubmissionCard = ({
  prompt,
  onSubmitVideo,
  onSubmitEmoji,
  isSubmitting = false,
}: SubmissionCardProps) => {
  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.sunset} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.promptLabel}>Today&apos;s Prompt</Text>
          <CountdownChip targetISO={prompt.expiresAt} label="Ends in" />
        </View>
        <Text style={styles.promptText}>{prompt.text}</Text>
        <View style={styles.actions}>
          <PrimaryButton
            label="Record 10s video"
            onPress={onSubmitVideo}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
          <PrimaryButton
            label="Send emoji reaction"
            variant="ghost"
            onPress={onSubmitEmoji}
            disabled={isSubmitting}
          />
        </View>
        <Text style={styles.hint}>
          Choose how you want to respond to your mystery buddy
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: colors.accentPink,
    shadowOpacity: 0.25,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  gradient: {
    padding: 24,
    gap: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  promptLabel: {
    ...typography.subtitle,
    color: "rgba(245,242,255,0.78)",
  },
  promptText: {
    ...typography.title,
    color: colors.textPrimary,
  },
  actions: {
    gap: 12,
  },
  hint: {
    ...typography.caption,
    color: "rgba(245,242,255,0.6)",
    textAlign: "center",
  },
});
