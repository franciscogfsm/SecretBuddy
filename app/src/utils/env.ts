import Constants from "expo-constants";

/**
 * Get environment variable from expo-constants (for production builds)
 * or process.env (for development with Expo Go).
 *
 * This works because:
 * 1. In EAS builds: app.config.js reads process.env and bakes values into extra
 * 2. In dev (Expo Go): process.env is available directly
 */
export const getPublicEnv = (key: string): string | undefined => {
  // Try to get from Constants.expoConfig.extra first (production builds)
  const extra = Constants.expoConfig?.extra;
  let value: string | undefined;

  if (extra) {
    // Check if it's a Firebase config key
    if (key.startsWith("EXPO_PUBLIC_FIREBASE_")) {
      const configKey = key
        .replace("EXPO_PUBLIC_FIREBASE_", "")
        .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        .replace(/^([A-Z])/, (letter) => letter.toLowerCase());

      value = extra.firebaseConfig?.[configKey];
    }

    // Check if it's an Azure config key
    if (key === "AZURE_FACE_API_KEY") {
      value = extra.azureConfig?.faceApiKey;
    }
    if (key === "AZURE_FACE_ENDPOINT") {
      value = extra.azureConfig?.faceEndpoint;
    }

    // Check if it's a Google OAuth config key
    if (key.startsWith("EXPO_PUBLIC_GOOGLE_")) {
      const configKey = key
        .replace("EXPO_PUBLIC_GOOGLE_", "")
        .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        .replace(/^([A-Z])/, (letter) => letter.toLowerCase());

      value = extra.googleOAuthConfig?.[configKey];
    }

    // If we found a value in extra, return it
    if (value) {
      return value;
    }
  }

  // Fallback to process.env for development (Expo Go) or if not found in extra
  return process.env?.[key];
};

export const getPublicEnvOrThrow = (key: string): string => {
  const value = getPublicEnv(key);

  if (!value) {
    throw new Error(
      `${key} is not set. Configure this value in your app config or environment.`
    );
  }

  return value;
};
