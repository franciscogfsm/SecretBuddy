import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, typography } from "../theme";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  leadingIcon?: ReactNode;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  loading?: boolean;
};

export const PrimaryButton = ({
  label,
  onPress,
  leadingIcon,
  disabled,
  variant = "primary",
  loading = false,
}: PrimaryButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    style={[
      styles.root,
      styles[variant],
      (disabled || loading) && styles.disabled,
    ]}
  >
    {variant === "primary" && (
      <LinearGradient
        colors={[colors.accentTeal, colors.accentPurple]}
        style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    )}
    {loading ? (
      <ActivityIndicator
        size="small"
        color={variant === "primary" ? colors.textPrimary : colors.accentPink}
      />
    ) : (
      leadingIcon
    )}
    <Text style={[styles.label, variant === "ghost" && styles.ghostLabel]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
    minHeight: 56,
  },
  primary: {
    backgroundColor: "transparent",
    shadowColor: "rgba(168, 85, 247, 0.45)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  ghost: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "rgba(255, 255, 255, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 2,
  },
  label: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.2,
  },
  ghostLabel: {
    color: colors.textSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
});
