export type GradientID = "purplePink" | "tealBlue" | "sunset" | "midnight";

export const gradients: Record<GradientID, readonly [string, string]> = {
  purplePink: ["#6C3BFF", "#FF4FB7"] as const,
  tealBlue: ["#1FC7B4", "#2360FF"] as const,
  sunset: ["#FF7750", "#FF2E92"] as const,
  midnight: ["#070319", "#1C0E3C"] as const,
};
