export type RootStackParamList = {
  AuthOptions: undefined;
  Onboarding: { mode?: "signup" | "signin" };
  MainTabs: undefined;
  Reveal: undefined;
  Chat: { isTimed: boolean };
};

export type MainTabParamList = {
  Home: undefined;
  Matches: undefined;
  Points: undefined;
  Profile: undefined;
};
