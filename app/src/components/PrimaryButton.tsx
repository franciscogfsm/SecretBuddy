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
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  primary: {
    backgroundColor: colors.accentPurple,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 4,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  ghostLabel: {
    color: colors.textSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
});
