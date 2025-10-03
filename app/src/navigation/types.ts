export type RootStackParamList = {
  Splash: undefined;
  AuthOptions: undefined;
  Onboarding: { mode?: "signup" | "signin" };
  MainTabs: undefined;
  Settings: { scrollTo?: "notifications" | "appSettings" } | undefined;
  SafetyGuidelines: undefined;
  BlockedUsers: undefined;
  ReportHistory: undefined;
  Reveal: { demo?: boolean; bothRevealed?: boolean };
  Chat: {
    conversationId?: string;
    matchedUserId?: string;
    matchedUserName?: string;
    isTimed?: boolean; // For backward compatibility
  };
  Friends: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Friends: undefined;
  Matches: undefined;
  Points: undefined;
  Profile: undefined;
};
