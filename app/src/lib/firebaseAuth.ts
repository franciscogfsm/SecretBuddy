import { Platform } from "react-native";
import type AsyncStorage from "@react-native-async-storage/async-storage";
import type { Persistence } from "firebase/auth";

// eslint-disable-next-line global-require
const webAuthModule =
  require("firebase/auth") as typeof import("firebase/auth");

export const {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  initializeAuth,
  getAuth,
} = webAuthModule;

type NativePersistenceFactory = (storage: typeof AsyncStorage) => Persistence;

let nativePersistenceFactory: NativePersistenceFactory | undefined;

if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line global-require
    const nativeModule = require("@firebase/auth/dist/rn/index.js") as {
      getReactNativePersistence?: unknown;
    };
    if (typeof nativeModule.getReactNativePersistence === "function") {
      nativePersistenceFactory =
        nativeModule.getReactNativePersistence as NativePersistenceFactory;
    }
  } catch (error) {
    if (__DEV__) {
      console.warn("[Firebase] Native auth bundle not available", error);
    }
  }
}

export const getReactNativePersistence = nativePersistenceFactory;

export type {
  User,
  UserCredential,
  Auth,
  NextOrObserver,
  Unsubscribe,
} from "firebase/auth";
