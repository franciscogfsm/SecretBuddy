import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type MatchState = "mystery" | "revealed" | "expired";

export type Prompt = {
  id: string;
  text: string;
  gradient: "purplePink" | "tealBlue" | "sunset";
  expiresAt: string;
};

export type MysteryBuddy = {
  id: string;
  codename: string;
  streak: number;
  state: MatchState;
  revealAt: string;
};

export type Mode = "friends" | "country" | "global";

export type PairingPhase =
  | "not-paired"
  | "searching"
  | "paired-waiting"
  | "submission-open"
  | "submitted"
  | "matched"
  | "reveal-ready";

export type PairingData = {
  phase: PairingPhase;
  submissionWindowStart: string;
  submissionWindowEnd: string;
  revealWindowStart: string;
  revealWindowEnd: string;
};

export type Profile = {
  name: string;
  username: string;
  age: number;
  ageVisible: boolean;
  country: string;
  mode: Mode;
};

type AppState = {
  profile: Profile | null;
  prompt: Prompt | null;
  buddy: MysteryBuddy | null;
  pairing: PairingData;
  setProfile: (profile: Profile | null) => void;
  setPrompt: (prompt: Prompt | null) => void;
  setBuddy: (buddy: MysteryBuddy | null) => void;
  setPairing: (pairing: PairingData) => void;
  hydrated: boolean;
};

const PROFILE_STORAGE_KEY = "secretbuddy.profile";

const defaultPrompt: Prompt = {
  id: "p-001",
  text: "Share a 10-second glimpse of the space you're in right now without showing faces.",
  gradient: "purplePink",
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
};

const defaultBuddy: MysteryBuddy = {
  id: "m-001",
  codename: "Mystery Firefly",
  streak: 5,
  state: "mystery",
  revealAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
};

const defaultPairing: PairingData = {
  phase: "paired-waiting",
  submissionWindowStart: new Date(
    Date.now() + 1000 * 60 * 60 * 2
  ).toISOString(),
  submissionWindowEnd: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
  revealWindowStart: new Date(Date.now() + 1000 * 60 * 60 * 9).toISOString(),
  revealWindowEnd: new Date(Date.now() + 1000 * 60 * 60 * 10).toISOString(),
};

const AppStateContext = createContext<AppState | undefined>(undefined);

export const AppStateProvider = ({ children }: PropsWithChildren) => {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(defaultPrompt);
  const [buddy, setBuddy] = useState<MysteryBuddy | null>(defaultBuddy);
  const [pairing, setPairing] = useState<PairingData>(defaultPairing);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrateProfile = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (!storedProfile) {
          return;
        }
        const parsed: Profile = JSON.parse(storedProfile);
        if (isMounted) {
          setProfileState(parsed);
        }
      } catch (error) {
        console.warn("Failed to load stored profile", error);
      } finally {
        if (isMounted) {
          setHydrated(true);
        }
      }
    };

    hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistProfile = useCallback(async (nextProfile: Profile | null) => {
    try {
      if (nextProfile) {
        await AsyncStorage.setItem(
          PROFILE_STORAGE_KEY,
          JSON.stringify(nextProfile)
        );
      } else {
        await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Failed to persist profile", error);
    }
  }, []);

  const setProfile = useCallback(
    (nextProfile: Profile | null) => {
      setProfileState(nextProfile);
      void persistProfile(nextProfile);
    },
    [persistProfile]
  );

  const value = useMemo<AppState>(
    () => ({
      profile,
      prompt,
      buddy,
      pairing,
      setProfile,
      setPrompt,
      setBuddy,
      setPairing,
      hydrated,
    }),
    [profile, prompt, buddy, pairing, setProfile, hydrated]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppState => {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
};
