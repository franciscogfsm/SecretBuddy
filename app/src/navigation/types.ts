export type RootStackParamList = {
  AuthOptions: undefined;
  Onboarding: { mode?: "signup" | "signin" };
  MainTabs: undefined;
  Reveal: undefined;
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
