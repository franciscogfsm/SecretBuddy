import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MainTabParamList } from "./types";
import { HomeScreen } from "../screens/HomeScreen";
import { MatchesScreen } from "../screens/MatchesScreen";
import { PointsScreen } from "../screens/PointsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { colors, gradients } from "../theme";

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

const AnimatedIconWrapper = ({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) => {
  const scale = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  const backgroundOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.1 : 1,
      damping: 15,
      stiffness: 150,
      useNativeDriver: true,
    }).start();

    Animated.timing(backgroundOpacity, {
      toValue: focused ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [focused, scale, backgroundOpacity]);

  const animatedStyle = useMemo(
    () => ({
      transform: [{ scale }],
    }),
    [scale]
  );

  const backgroundStyle = useMemo(
    () => ({
      opacity: backgroundOpacity,
    }),
    [backgroundOpacity]
  );

  return (
    <Animated.View style={[styles.iconWrapper, animatedStyle]}>
      <Animated.View style={[styles.iconBackground, backgroundStyle]} />
      {children}
    </Animated.View>
  );
};

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
            <AnimatedIconWrapper focused={focused}>
              <Ionicons
                name={iconName}
                size={focused ? 26 : 24}
                color={focused ? colors.accentPurple : colors.textSecondary}
              />
            </AnimatedIconWrapper>
          );
        },
        tabBarActiveTintColor: colors.accentPurple,
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
    backgroundColor: "rgba(22, 16, 46, 0.95)",
    height: 74,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
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
    position: "relative",
  },
  iconBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    backgroundColor: "rgba(246, 236, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  iconWrapperActive: {
    // Kept for compatibility but not used with new animation
  },
});
