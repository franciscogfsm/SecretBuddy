import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { CountdownChip } from "./CountdownChip";
import type { PairingData, PairingPhase } from "../store/AppStateContext";
import { colors, gradients, typography } from "../theme";

type StatusCardProps = {
  pairing: PairingData;
};

const getStatusInfo = (phase: PairingPhase, pairing: PairingData) => {
  switch (phase) {
    case "not-paired":
      return {
        title: "Ready for today's mystery?",
        subtitle: "Find your mystery buddy and start the daily ritual",
        gradient: gradients.purplePink,
        showCountdown: false,
      };
    case "searching":
      return {
        title: "Searching for your mystery buddy...",
        subtitle: "This usually takes just a few seconds",
        gradient: gradients.tealBlue,
        showCountdown: false,
      };
    case "paired-waiting":
      return {
        title: "Mystery buddy found! 🎉",
        subtitle: "Submission window opens at 12:00 PM",
        gradient: gradients.purplePink,
        showCountdown: true,
        targetTime: pairing.submissionWindowStart,
        countdownLabel: "Opens in",
      };
    case "submission-open":
      return {
        title: "Submission window is open!",
        subtitle: "Share your response before 2:00 PM",
        gradient: gradients.sunset,
        showCountdown: true,
        targetTime: pairing.submissionWindowEnd,
        countdownLabel: "Closes in",
      };
    case "submitted":
      return {
        title: "Response submitted! ✨",
        subtitle: "Waiting for your mystery buddy to respond",
        gradient: gradients.tealBlue,
        showCountdown: false,
      };
    case "matched":
      return {
        title: "Both responded! 🎭",
        subtitle: "Reveal window opens at 9:00 PM",
        gradient: gradients.purplePink,
        showCountdown: true,
        targetTime: pairing.revealWindowStart,
        countdownLabel: "Reveals in",
      };
    case "reveal-ready":
      return {
        title: "Time to reveal! 🌟",
        subtitle: "See who your mystery buddy is",
        gradient: gradients.sunset,
        showCountdown: true,
        targetTime: pairing.revealWindowEnd,
        countdownLabel: "Ends in",
      };
    default:
      return {
        title: "Ready for today's mystery?",
        subtitle: "Find your mystery buddy and start the daily ritual",
        gradient: gradients.purplePink,
        showCountdown: false,
      };
  }
};

export const StatusCard = ({ pairing }: StatusCardProps) => {
  const statusInfo = getStatusInfo(pairing.phase, pairing);

  return (
    <View style={styles.container}>
      <LinearGradient colors={statusInfo.gradient} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>{statusInfo.title}</Text>
          {statusInfo.showCountdown && statusInfo.targetTime && (
            <CountdownChip
              targetISO={statusInfo.targetTime}
              label={statusInfo.countdownLabel}
            />
          )}
        </View>
        <Text style={styles.subtitle}>{statusInfo.subtitle}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: colors.accentPurple,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  gradient: {
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 16,
  },
  subtitle: {
    ...typography.body,
    color: "rgba(245,242,255,0.78)",
  },
});
