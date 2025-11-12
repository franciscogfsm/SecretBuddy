import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "../lib/firebaseAuth";
import type { User, UserCredential } from "../lib/firebaseAuth";
import { AuthSessionResult, makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import * as Google from "expo-auth-session/providers/google";
import { Platform } from "react-native";
import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { auth } from "../config/firebase";
import { getPublicEnv } from "../utils/env";

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  error: string | null;
  loading: boolean;
  supportsGoogleSignIn: boolean;
  emailSignUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<UserCredential>;
  emailSignIn: (email: string, password: string) => Promise<UserCredential>;
  googleSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const GOOGLE_ENV_KEYS = {
  expoClientId: "EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID",
  iosClientId: "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
  androidClientId: "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID",
  webClientId: "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
} as const;

const mapGoogleConfig = () =>
  Object.fromEntries(
    Object.entries(GOOGLE_ENV_KEYS).map(([key, envKey]) => [
      key,
      getPublicEnv(envKey) ?? undefined,
    ])
  ) as Record<keyof typeof GOOGLE_ENV_KEYS, string | undefined>;

type GoogleAuthSessionSuccess = AuthSessionResult & {
  type: "success";
  authentication?: {
    accessToken?: string;
    idToken?: string;
  };
  params?: {
    access_token?: string;
    id_token?: string;
  };
};

const formatAuthError = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "This email is already registered.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "The provided credentials are incorrect.";
      case "auth/user-not-found":
        return "We couldn't find an account with that email.";
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "The sign-in flow was cancelled.";
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleConfig = useMemo(mapGoogleConfig, []);
  const supportsGoogleSignIn = useMemo(
    () => Object.values(googleConfig).some(Boolean),
    [googleConfig]
  );

  const shouldUseProxy = useMemo(() => {
    if (Platform.OS === "web") {
      return false;
    }

    return Constants.appOwnership === "expo";
  }, []);

  // Compute native redirect URI (used for dev-client / standalone builds)
  const nativeRedirectUri = useMemo(
    () =>
      makeRedirectUri({
        scheme: "com.inaciobalu.secretbuddyapp",
        path: "oauth",
      }),
    []
  );

  // For logging, show the redirect the app will use (native redirect by default)
  const effectiveRedirectForLog = nativeRedirectUri;

  // Debugging output: help diagnose redirect URI mismatches with Google
  // Use a distinctive prefix so Metro logs are easy to search
  // eslint-disable-next-line no-console
  console.log(
    "LOG >>> Auth: effectiveRedirect=",
    effectiveRedirectForLog,
    "appOwnership=",
    Constants.appOwnership,
    "shouldUseProxy=",
    shouldUseProxy
  );

  const [request, , promptAsync] = supportsGoogleSignIn
    ? Google.useAuthRequest({
        ...googleConfig,
        redirectUri: nativeRedirectUri,
      } as unknown as Parameters<typeof Google.useAuthRequest>[0])
    : [
        null,
        null,
        () => Promise.resolve({ type: "cancel" } as AuthSessionResult),
      ];

  useEffect(() => {
    // Debug: show which Google client IDs are configured at runtime
    // eslint-disable-next-line no-console
    console.log("Auth debug: googleConfig=", JSON.stringify(googleConfig));

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const emailSignUp = useCallback<AuthContextValue["emailSignUp"]>(
    async (email, password, displayName) => {
      setLoading(true);
      setError(null);

      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        if (displayName) {
          try {
            await updateProfile(credential.user, { displayName });
          } catch (profileError) {
            console.warn("Failed to update profile name", profileError);
          }
        }

        return credential;
      } catch (authError) {
        const message = formatAuthError(authError);
        setError(message);
        throw authError;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const emailSignIn = useCallback<AuthContextValue["emailSignIn"]>(
    async (email, password) => {
      setLoading(true);
      setError(null);

      try {
        return await signInWithEmailAndPassword(auth, email, password);
      } catch (authError) {
        const message = formatAuthError(authError);
        setError(message);
        throw authError;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const googleSignIn = useCallback(async () => {
    if (!supportsGoogleSignIn) {
      throw new Error(
        "Google Sign-In is not configured. Add the required client IDs."
      );
    }

    if (!request) {
      throw new Error(
        "Google Sign-In is still initializing. Please try again."
      );
    }

    setError(null);
    setLoading(true);

    try {
      const promptOptions: Parameters<typeof promptAsync>[0] extends infer T
        ? T extends object
          ? T & { useProxy?: boolean }
          : Record<string, unknown>
        : Record<string, unknown> = {
        showInRecents: true,
      } as any;

      // keep default prompt options; do not force proxy

      const result = await promptAsync(
        promptOptions as Parameters<typeof promptAsync>[0]
      );

      if (result?.type === "cancel" || result?.type === "dismiss") {
        throw new Error("Google sign-in was cancelled.");
      }

      if (result?.type === "error") {
        throw new Error(result.error?.message ?? "Google sign-in failed.");
      }

      if (!result || result.type !== "success") {
        throw new Error("Google sign-in failed. Please try again.");
      }

      const successResult = result as GoogleAuthSessionSuccess;
      const idToken =
        successResult.authentication?.idToken ?? successResult.params?.id_token;
      const accessToken =
        successResult.authentication?.accessToken ??
        successResult.params?.access_token;

      if (!idToken) {
        throw new Error("Google sign-in failed to return a valid token.");
      }

      const credential = GoogleAuthProvider.credential(
        idToken,
        accessToken ?? undefined
      );

      await signInWithCredential(auth, credential);
      setError(null);
    } catch (authError) {
      const message = formatAuthError(authError);
      if (message.toLowerCase().includes("cancel")) {
        setError(null);
      } else {
        setError(message);
      }
      throw authError;
    } finally {
      setLoading(false);
    }
  }, [promptAsync, request, supportsGoogleSignIn]);

  const signOut = useCallback(async () => {
    setLoading(true);

    try {
      await firebaseSignOut(auth);
      setError(null);
    } catch (authError) {
      const message = formatAuthError(authError);
      setError(message);
      throw authError;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      error,
      loading,
      supportsGoogleSignIn,
      emailSignUp,
      emailSignIn,
      googleSignIn,
      signOut,
    }),
    [
      emailSignIn,
      emailSignUp,
      error,
      googleSignIn,
      initializing,
      loading,
      signOut,
      supportsGoogleSignIn,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
