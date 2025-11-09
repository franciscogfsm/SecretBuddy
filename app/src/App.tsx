import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, useColorScheme } from "react-native";

import { RootNavigator } from "./navigation/RootNavigator";
import { AuthProvider } from "./context/AuthContext";
import { NetworkProvider } from "./context/NetworkContext";
import { AppStateProvider } from "./store/AppStateContext";
import { OfflineModal } from "./components/OfflineModal";
import { colors } from "./theme";
import { useNetwork } from "./context/NetworkContext";

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

const AppContent = () => {
  const { isConnected } = useNetwork();

  return (
    <>
      <View style={{ flex: 1 }}>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </View>
      <OfflineModal visible={!isConnected} />
    </>
  );
};

const App = () => {
  const scheme = useColorScheme();

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <NetworkProvider>
        <AuthProvider>
          <AppStateProvider>
            <StatusBar style={scheme === "light" ? "dark" : "light"} />
            <AppContent />
          </AppStateProvider>
        </AuthProvider>
      </NetworkProvider>
    </GestureHandlerRootView>
  );
};

export default App;
