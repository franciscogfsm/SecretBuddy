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
    return "00:00";
  }
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
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
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Text style={styles.value}>{remaining}</Text>
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
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.subtitle,
    color: colors.accentPurple,
    fontVariant: ["tabular-nums"],
  },
});
