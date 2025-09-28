import { Ionicons } from "@expo/vector-icons";
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MainTabParamList } from "./types";
import { HomeScreen } from "../screens/HomeScreen";
import { MatchesScreen } from "../screens/MatchesScreen";
import { PointsScreen } from "../screens/PointsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { colors } from "../theme";

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

const getTabIconName = (
  routeName: keyof MainTabParamList,
  focused: boolean
): IconName => {
  switch (routeName) {
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
};

type AnimatedTabBarProps = BottomTabBarProps & {
  bottomOffset: number;
};

const AnimatedTabBar = ({
  state,
  descriptors,
  navigation,
  bottomOffset,
}: AnimatedTabBarProps) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorPosition = useRef(new Animated.Value(state.index)).current;
  const indicatorScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(indicatorPosition, {
        toValue: state.index,
        tension: 300,
        friction: 30,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(indicatorScale, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(indicatorScale, {
          toValue: 1,
          tension: 400,
          friction: 20,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [indicatorPosition, indicatorScale, state.index]);

  const routeIndices = useMemo(
    () => state.routes.map((_, index) => index),
    [state.routes.length]
  );

  const tabWidth = (containerWidth - 32) / state.routes.length; // Account for horizontal padding

  const translateX = useMemo(() => {
    if (!tabWidth) {
      return null;
    }

    return indicatorPosition.interpolate({
      inputRange: routeIndices,
      outputRange: routeIndices.map(
        (index) => 16 + index * tabWidth + tabWidth / 2 - 20 // Account for padding and center indicator
      ),
    });
  }, [indicatorPosition, routeIndices, tabWidth]);

  return (
    <View
      style={[styles.tabBar, { bottom: bottomOffset }]}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      {translateX !== null && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatingIndicator,
            {
              transform: [{ translateX }, { scaleX: indicatorScale }],
            },
          ]}
        />
      )}

      {state.routes.map((route, index) => (
        <AnimatedTabBarItem
          key={route.key}
          route={route}
          navigation={navigation}
          descriptors={descriptors}
          isFocused={state.index === index}
          tabWidth={tabWidth}
        />
      ))}
    </View>
  );
};

type AnimatedTabBarItemProps = {
  route: AnimatedTabBarProps["state"]["routes"][number];
  navigation: AnimatedTabBarProps["navigation"];
  descriptors: AnimatedTabBarProps["descriptors"];
  isFocused: boolean;
  tabWidth: number;
};

const AnimatedTabBarItem = ({
  route,
  navigation,
  descriptors,
  isFocused,
  tabWidth,
}: AnimatedTabBarItemProps) => {
  const focusProgress = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusProgress, {
      toValue: isFocused ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [focusProgress, isFocused]);

  const iconScale = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const iconOpacity = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const options = descriptors[route.key].options;
  const iconName = getTabIconName(
    route.name as keyof MainTabParamList,
    isFocused
  );

  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 0.9,
        tension: 400,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pressScale, rippleOpacity]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 1,
        tension: 400,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pressScale, rippleOpacity]);

  const handlePress = useCallback(() => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }, [isFocused, navigation, route.key, route.name]);

  const handleLongPress = useCallback(() => {
    navigation.emit({
      type: "tabLongPress",
      target: route.key,
    });
  }, [navigation, route.key]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      style={[styles.tabButton, tabWidth ? { width: tabWidth } : null]}
    >
      <Animated.View
        style={{
          transform: [{ scale: pressScale }],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={[
            styles.ripple,
            {
              opacity: rippleOpacity,
            },
          ]}
        />
        <Animated.View
          style={{
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          }}
        >
          <Ionicons
            name={iconName}
            size={24}
            color={isFocused ? colors.accentPurple : colors.textSecondary}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

export const HomeTabs = () => {
  const insets = useSafeAreaInsets();
  const bottomOffset = insets.bottom + 12;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => (
        <AnimatedTabBar {...props} bottomOffset={bottomOffset} />
      )}
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
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    left: 20,
    right: 20,
    borderRadius: 32,
    borderTopWidth: 0,
    backgroundColor: "rgba(11, 5, 32, 0.85)",
    height: 72,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.15)",
  },
  floatingIndicator: {
    position: "absolute",
    bottom: 8,
    height: 3,
    width: 40,
    borderRadius: 2,
    backgroundColor: colors.accentPurple,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 28,
  },
  ripple: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    backgroundColor: colors.accentPurple,
  },
});
