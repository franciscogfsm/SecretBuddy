import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";

import { HomeTabs } from "./Tabs";
import { RootStackParamList } from "./types";
import { SplashScreen } from "../screens/SplashScreen";
import { RevealScreen } from "../screens/RevealScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AuthOptionsScreen } from "../screens/AuthOptionsScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { FriendsScreen } from "../screens/FriendsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SafetyGuidelinesScreen } from "../screens/SafetyGuidelinesScreen";
import { BlockedUsersScreen } from "../screens/BlockedUsersScreen";
import { ReportHistoryScreen } from "../screens/ReportHistoryScreen";
import { useAppState } from "../store/AppStateContext";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { profile, hydrated } = useAppState();
  const { user, initializing } = useAuth();

  // Determine initial route based on both Firebase auth and local profile
  const isFullyAuthenticated = user && profile;
  const hasFirebaseAuth = user && !profile;

  let initialRoute: keyof RootStackParamList;
  if (isFullyAuthenticated) {
    // User is logged in and has profile - go directly to home
    initialRoute = "MainTabs";
  } else if (hasFirebaseAuth) {
    // User is logged in but needs to complete onboarding
    initialRoute = "Onboarding";
  } else {
    // User not logged in - show splash then auth
    initialRoute = "Splash";
  }

  // Show loading while either system is initializing
  if (!hydrated || initializing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(6, 0, 18, 1)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.accentPurple} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      {!isFullyAuthenticated && (
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="AuthOptions" component={AuthOptionsScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
        </>
      )}
      <Stack.Screen name="MainTabs" component={HomeTabs} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="SafetyGuidelines"
        component={SafetyGuidelinesScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="ReportHistory"
        component={ReportHistoryScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="Reveal"
        component={RevealScreen}
        options={{
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};
