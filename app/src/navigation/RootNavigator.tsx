import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";

import { HomeTabs } from "./Tabs";
import { RootStackParamList } from "./types";
import { RevealScreen } from "../screens/RevealScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AuthOptionsScreen } from "../screens/AuthOptionsScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { FriendsScreen } from "../screens/FriendsScreen";
import { useAppState } from "../store/AppStateContext";
import { colors } from "../theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { profile, hydrated } = useAppState();
  const initialRoute: keyof RootStackParamList = profile
    ? "MainTabs"
    : "AuthOptions";

  if (!hydrated) {
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
      {!profile && (
        <>
          <Stack.Screen name="AuthOptions" component={AuthOptionsScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </>
      )}
      <Stack.Screen name="MainTabs" component={HomeTabs} />
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
