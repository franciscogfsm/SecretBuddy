import { LinearGradient } from "expo-linear-gradient";
import type { PropsWithChildren } from "react";
import { StyleSheet } from "react-native";

import { gradients, GradientID } from "../theme";

type GradientBackgroundProps = PropsWithChildren<{
  gradient?: GradientID;
  noPadding?: boolean;
}>;

export const GradientBackground = ({
  gradient = "midnight",
  children,
  noPadding = false,
}: GradientBackgroundProps) => (
  <LinearGradient
    colors={gradients[gradient]}
    style={noPadding ? styles.gradientNoPadding : styles.gradient}
  >
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 36,
  },
  gradientNoPadding: {
    flex: 1,
  },
});
