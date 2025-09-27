import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, useColorScheme } from "react-native";

import { RootNavigator } from "./navigation/RootNavigator";
import { AuthProvider } from "./context/AuthContext";
import { AppStateProvider } from "./store/AppStateContext";
import { colors } from "./theme";

const navigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.accentPurple,
    text: colors.textPrimary,
    notification: colors.accentPink,
  },
};

const App = () => {
  const scheme = useColorScheme();

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <AuthProvider>
        <AppStateProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar style={scheme === "light" ? "dark" : "light"} />
            <View style={{ flex: 1 }}>
              <RootNavigator />
            </View>
          </NavigationContainer>
        </AppStateProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

export default App;
