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

  if (extra) {
    // Check if it's a Firebase config key
    if (key.startsWith("EXPO_PUBLIC_FIREBASE_")) {
      // Convert EXPO_PUBLIC_FIREBASE_API_KEY -> apiKey
      // Convert EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN -> authDomain
      const snakeCase = key.replace("EXPO_PUBLIC_FIREBASE_", "");
      const camelCase = snakeCase
        .toLowerCase()
        .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

      const value = extra.firebaseConfig?.[camelCase];
      if (value) return value;
    }

    // Check if it's an Azure config key
    if (key === "AZURE_FACE_API_KEY") {
      const value = extra.azureConfig?.faceApiKey;
      if (value) return value;
    }
    if (key === "AZURE_FACE_ENDPOINT") {
      const value = extra.azureConfig?.faceEndpoint;
      if (value) return value;
    }

    // Check if it's a Google OAuth config key
    if (key.startsWith("EXPO_PUBLIC_GOOGLE_")) {
      // Convert EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID -> expoClientId
      const snakeCase = key.replace("EXPO_PUBLIC_GOOGLE_", "");
      const camelCase = snakeCase
        .toLowerCase()
        .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

      const value = extra.googleOAuthConfig?.[camelCase];
      if (value) return value;
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
