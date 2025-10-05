import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "../theme";

type CountdownChipProps = {
  targetISO: string;
  label?: string;
};

const formatRemaining = (target: Date) => {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) {
    return { text: "00s", isUrgent: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // If 60 seconds or less remaining, show only seconds
  if (totalSeconds <= 60) {
    return { text: `${seconds}s`, isUrgent: true };
  }

  // Otherwise show minutes and seconds
  return {
    text: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`,
    isUrgent: false,
  };
};

export const CountdownChip = ({ targetISO, label }: CountdownChipProps) => {
  const [remaining, setRemaining] = useState(() =>
    formatRemaining(new Date(targetISO))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(formatRemaining(new Date(targetISO)));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetISO]);

  return (
    <View
      style={[styles.container, remaining.isUrgent && styles.containerUrgent]}
    >
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Text style={[styles.value, remaining.isUrgent && styles.valueUrgent]}>
        {remaining.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(11, 5, 32, 0.75)",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.5)",
  },
  containerUrgent: {
    backgroundColor: "rgba(255, 59, 48, 0.15)",
    borderColor: colors.danger,
    borderWidth: 2,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.subtitle,
    color: colors.accentPurple,
    fontVariant: ["tabular-nums"],
  },
  valueUrgent: {
    ...typography.subtitle,
    color: colors.danger,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
});
