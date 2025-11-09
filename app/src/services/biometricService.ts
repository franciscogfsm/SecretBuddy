/**
 * 🔐 BIOMETRIC AUTHENTICATION SERVICE
 *
 * Provides Face ID / Touch ID / Fingerprint authentication
 * Enhances security and improves user experience
 */

import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_ENABLED_KEY = "biometric_auth_enabled";
const BIOMETRIC_EMAIL_KEY = "biometric_saved_email";
const BIOMETRIC_CREDENTIALS_KEY = "biometric_secure_credentials";

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  canUseBiometrics: boolean;
}

/**
 * Check if device supports biometric authentication
 */
export const checkBiometricCapability =
  async (): Promise<BiometricCapability> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      return {
        hasHardware,
        isEnrolled,
        supportedTypes,
        canUseBiometrics: hasHardware && isEnrolled,
      };
    } catch (error) {
      console.error("Error checking biometric capability:", error);
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        canUseBiometrics: false,
      };
    }
  };

/**
 * Get user-friendly name for biometric type
 */
export const getBiometricName = (
  types: LocalAuthentication.AuthenticationType[]
): string => {
  if (
    types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
  ) {
    return Platform.OS === "ios" ? "Face ID" : "Face Recognition";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "Iris Recognition";
  }
  return "Biometric Authentication";
};

/**
 * Authenticate user with biometrics
 */
export const authenticateWithBiometrics = async (
  promptMessage?: string
): Promise<boolean> => {
  try {
    console.log("🔐 [BiometricService] Starting authentication...");
    const capability = await checkBiometricCapability();
    console.log("🔐 [BiometricService] Capability:", capability);

    if (!capability.canUseBiometrics) {
      console.log("❌ [BiometricService] Cannot use biometrics");
      return false;
    }

    const biometricName = getBiometricName(capability.supportedTypes);
    console.log("🔐 [BiometricService] Using:", biometricName);

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || `Authenticate with ${biometricName}`,
      fallbackLabel: "Use Passcode",
      disableDeviceFallback: false, // Allow passcode fallback after failed Face ID attempts
      cancelLabel: "Cancel",
    });

    console.log(
      "🔐 [BiometricService] Full result:",
      JSON.stringify(result, null, 2)
    );
    console.log("🔐 [BiometricService] Success:", result.success);

    return result.success;
  } catch (error) {
    console.error("❌ [BiometricService] Error:", error);
    return false;
  }
};

/**
 * Enable biometric authentication for user
 * Stores credentials securely using Secure Store (hardware-backed on mobile)
 */
export const enableBiometricAuth = async (
  email: string,
  password: string
): Promise<void> => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
    await AsyncStorage.setItem(BIOMETRIC_EMAIL_KEY, email.toLowerCase());

    // Store credentials securely (encrypted in Secure Store/Keychain)
    const credentials = JSON.stringify({
      email: email.toLowerCase(),
      password,
    });

    if (Platform.OS === "web") {
      // On web, use localStorage (less secure but functional for demo)
      await AsyncStorage.setItem(BIOMETRIC_CREDENTIALS_KEY, credentials);
    } else {
      // On mobile, use Secure Store (hardware-backed encryption)
      await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, credentials);
    }
  } catch (error) {
    console.error("Error enabling biometric auth:", error);
    throw error;
  }
};

/**
 * Disable biometric authentication
 */
export const disableBiometricAuth = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    await AsyncStorage.removeItem(BIOMETRIC_EMAIL_KEY);

    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
    } else {
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    }
  } catch (error) {
    console.error("Error disabling biometric auth:", error);
  }
};

/**
 * Check if biometric auth is enabled for this device
 */
export const isBiometricAuthEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === "true";
  } catch (error) {
    console.error("Error checking biometric auth status:", error);
    return false;
  }
};

/**
 * Get saved email for biometric login
 */
export const getBiometricSavedEmail = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(BIOMETRIC_EMAIL_KEY);
  } catch (error) {
    console.error("Error getting saved email:", error);
    return null;
  }
};

/**
 * Get stored biometric credentials
 */
export const getBiometricCredentials = async (): Promise<{
  email: string;
  password: string;
} | null> => {
  try {
    let credentials: string | null;

    if (Platform.OS === "web") {
      credentials = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
    } else {
      credentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    }

    if (credentials) {
      return JSON.parse(credentials);
    }
    return null;
  } catch (error) {
    console.error("Error getting biometric credentials:", error);
    return null;
  }
};

/**
 * Prompt user to enable biometric auth after successful login
 */
export const promptEnableBiometrics = async (
  email: string,
  password: string
): Promise<boolean> => {
  const capability = await checkBiometricCapability();

  if (!capability.canUseBiometrics) {
    return false;
  }

  // Test if biometrics work before enabling
  const success = await authenticateWithBiometrics(
    "Enable quick login with biometrics?"
  );

  if (success) {
    await enableBiometricAuth(email, password);
    return true;
  }

  return false;
};
