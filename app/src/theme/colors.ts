export const colors = {
  background: "#05030C",
  surface: "#0B0520",
  surfaceSecondary: "#140A35",
  textPrimary: "#F5F2FF",
  textSecondary: "#B9B1EA",
  accentPink: "#FF4FB7",
  accentPurple: "#9C6BFF",
  accentTeal: "#2EE6A9",
  danger: "#FF6B8A",
  error: "#FF4444",
  overlay: "rgba(5, 3, 12, 0.78)",
  border: "rgba(255, 255, 255, 0.1)",
} as const;

export type ColorName = keyof typeof colors;
