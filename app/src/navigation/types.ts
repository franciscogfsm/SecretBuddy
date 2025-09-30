export type RootStackParamList = {
  Splash: undefined;
  AuthOptions: undefined;
  Onboarding: { mode?: "signup" | "signin" };
  MainTabs: undefined;
  Settings: undefined;
  Reveal: { demo?: boolean; bothRevealed?: boolean };
  Chat: { isTimed: boolean };
  Friends: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Friends: undefined;
  Matches: undefined;
  Points: undefined;
  Profile: undefined;
};
