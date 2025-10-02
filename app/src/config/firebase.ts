import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getPublicEnv } from "../utils/env";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "../lib/firebaseAuth";

const firebaseEnvKeys = {
  apiKey: "EXPO_PUBLIC_FIREBASE_API_KEY",
  authDomain: "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "EXPO_PUBLIC_FIREBASE_APP_ID",
  measurementId: "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID",
} as const;

const firebaseConfig = {
  apiKey: getPublicEnv(firebaseEnvKeys.apiKey),
  authDomain: getPublicEnv(firebaseEnvKeys.authDomain),
  projectId: getPublicEnv(firebaseEnvKeys.projectId),
  storageBucket: getPublicEnv(firebaseEnvKeys.storageBucket),
  messagingSenderId: getPublicEnv(firebaseEnvKeys.messagingSenderId),
  appId: getPublicEnv(firebaseEnvKeys.appId),
  measurementId: getPublicEnv(firebaseEnvKeys.measurementId),
};

const missingKeys = (
  Object.keys(firebaseEnvKeys) as Array<keyof typeof firebaseEnvKeys>
).filter((key) => !firebaseConfig[key] || firebaseConfig[key] === "");

if (missingKeys.length > 0) {
  const missingEnvVars = missingKeys.map((key) => firebaseEnvKeys[key]);
  throw new Error(
    `Firebase config is incomplete. Missing: ${missingEnvVars.join(", ")}. ` +
      "Set the corresponding EXPO_PUBLIC_FIREBASE_* environment variables."
  );
}

// Validate config values
if (!firebaseConfig.apiKey?.startsWith("AIza")) {
  throw new Error('Invalid Firebase API key. It should start with "AIza".');
}
if (!firebaseConfig.appId?.includes(":")) {
  throw new Error(
    'Invalid Firebase App ID. It should be in the format "1:project_number:web:app_id". Get it from Firebase console.'
  );
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;

// Check if auth is already initialized
try {
  auth = getAuth(app);
} catch {
  // Auth not initialized yet, initialize with AsyncStorage persistence
  if (getReactNativePersistence) {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } else {
    // Fallback if persistence is not available
    auth = initializeAuth(app);
  }
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
