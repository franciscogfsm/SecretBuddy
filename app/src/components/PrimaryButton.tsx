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
        colors={["#9C6BFF", "#8A46FF"]}
        style={[StyleSheet.absoluteFill, { borderRadius: 25 }]}
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
    borderRadius: 25,
    paddingVertical: 20,
    paddingHorizontal: 28,
    gap: 10,
    minHeight: 60,
  },
  primary: {
    backgroundColor: "transparent",
    shadowColor: "rgba(138, 70, 255, 0.3)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
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
    fontSize: 18,
  },
  ghostLabel: {
    color: colors.textSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
});
