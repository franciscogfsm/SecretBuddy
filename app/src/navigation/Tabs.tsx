import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MainTabParamList } from "./types";
import { HomeScreen } from "../screens/HomeScreen";
import { MatchesScreen } from "../screens/MatchesScreen";
import { PointsScreen } from "../screens/PointsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { colors } from "../theme";

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

export const HomeTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [
          styles.tabBar,
          { marginBottom: Math.max(insets.bottom, 12) },
        ],
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ focused }) => {
          const iconName = (() => {
            switch (route.name) {
              case "Home":
                return focused ? "flame" : "flame-outline";
              case "Matches":
                return focused ? "chatbubbles" : "chatbubbles-outline";
              case "Points":
                return focused ? "trophy" : "trophy-outline";
              case "Profile":
                return focused ? "person" : "person-outline";
              default:
                return "ellipse";
            }
          })() as IconName;

          return (
            <View
              style={[styles.iconWrapper, focused && styles.iconWrapperActive]}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={focused ? colors.background : colors.textSecondary}
              />
            </View>
          );
        },
        tabBarActiveTintColor: colors.background,
        tabBarInactiveTintColor: colors.textSecondary,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Points" component={PointsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 24,
    right: 24,
    borderRadius: 36,
    borderTopWidth: 0,
    backgroundColor: "rgba(22, 16, 46, 0.92)",
    height: 74,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  tabItem: {
    marginVertical: 4,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconWrapperActive: {
    backgroundColor: "rgba(246, 236, 255, 0.16)",
  },
});
