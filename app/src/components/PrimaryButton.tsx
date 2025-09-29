import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

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
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    minHeight: 56,
  },
  primary: {
    backgroundColor: "rgba(156, 107, 255, 0.25)",
    borderWidth: 1.5,
    borderColor: "rgba(156, 107, 255, 0.5)",
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
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
    fontWeight: "600",
    fontSize: 16,
  },
  ghostLabel: {
    color: colors.textSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
});
