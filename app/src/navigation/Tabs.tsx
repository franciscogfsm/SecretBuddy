import { Ionicons } from "@expo/vector-icons";
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanGestureHandler, State } from "react-native-gesture-handler";

import { MainTabParamList } from "./types";
import { HomeScreen } from "../screens/HomeScreen";
import { MatchesScreen } from "../screens/MatchesScreen";
import { PointsScreen } from "../screens/PointsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { FriendsScreen } from "../screens/FriendsScreen";
import { TopHeader } from "../components/TopHeader";
import { colors } from "../theme";
import { useAuth } from "../context/AuthContext";
import * as chatService from "../services/chatService";
import * as photoService from "../services/photoService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Tab = createBottomTabNavigator<MainTabParamList>();

// Global state to track last active tab index across all screens
const lastActiveTabIndex = { current: 0 };

const SCREEN_WIDTH = Dimensions.get("window").width;

// Swipe-enabled wrapper for tab screens
const SwipeableTabScreen = ({
  children,
  navigation,
  currentIndex,
  totalTabs,
}: {
  children: React.ReactNode;
  navigation: any;
  currentIndex: number;
  totalTabs: number;
}) => {
  const isFocused = useIsFocused();
  const focusProgress = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const hasAnimatedIn = useRef(false);

  useEffect(() => {
    if (isFocused) {
      // Determine slide direction based on last active tab and current tab
      const direction = currentIndex > lastActiveTabIndex.current ? 1 : -1;

      // Update the global last active tab
      lastActiveTabIndex.current = currentIndex;

      if (!hasAnimatedIn.current) {
        focusProgress.setValue(0);
        slideAnim.setValue(direction * SCREEN_WIDTH); // Start from screen edge
        hasAnimatedIn.current = true;
      } else {
        slideAnim.setValue(direction * SCREEN_WIDTH); // Reset slide position
      }

      Animated.parallel([
        Animated.spring(focusProgress, {
          toValue: 1,
          friction: 14,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 14,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(focusProgress, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [focusProgress, slideAnim, isFocused, currentIndex]);

  const animatedStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      transform: [
        {
          translateX: slideAnim,
        },
      ],
    }),
    [slideAnim]
  );

  const onGestureEvent = useCallback((event: any) => {
    // Handle swipe gestures here if needed for additional logic
  }, []);

  const onHandlerStateChange = useCallback(
    (event: any) => {
      if (event.nativeEvent.state === State.END) {
        const { translationX, velocityX, translationY } = event.nativeEvent;

        // Only trigger navigation for clear horizontal swipes
        // Must be more horizontal than vertical movement
        const isHorizontalSwipe =
          Math.abs(translationX) > Math.abs(translationY) * 2;
        const minSwipeDistance = 80; // Increased threshold
        const minSwipeVelocity = 600; // Increased velocity threshold

        if (
          isHorizontalSwipe &&
          Math.abs(translationX) > minSwipeDistance &&
          Math.abs(velocityX) > minSwipeVelocity
        ) {
          if (translationX > 0 && currentIndex > 0) {
            // Swipe right - go to previous tab
            const prevTab = ["Home", "Friends", "Matches", "Points", "Profile"][
              currentIndex - 1
            ];
            navigation.navigate(prevTab);
          } else if (translationX < 0 && currentIndex < totalTabs - 1) {
            // Swipe left - go to next tab
            const nextTab = ["Home", "Friends", "Matches", "Points", "Profile"][
              currentIndex + 1
            ];
            navigation.navigate(nextTab);
          }
        }
      }
    },
    [navigation, currentIndex, totalTabs]
  );

  return (
    <View style={styles.sceneWrapper}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        // Only capture horizontal gestures, let vertical scroll through
        activeOffsetX={[-20, 20]}
        failOffsetY={[-10, 10]}
      >
        <Animated.View style={[styles.sceneContainer, animatedStyle]}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

type IconName = keyof typeof Ionicons.glyphMap;

const getTabIconName = (
  routeName: keyof MainTabParamList,
  focused: boolean
): IconName => {
  switch (routeName) {
    case "Home":
      return focused ? "flame" : "flame-outline";
    case "Friends":
      return focused ? "people" : "people-outline";
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
  unreadMessagesCount: number;
  unviewedPhotosCount: number; // Add photo count
};

const AnimatedTabBar = ({
  state,
  descriptors,
  navigation,
  bottomOffset,
  unreadMessagesCount,
  unviewedPhotosCount,
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
        (index) => 16 + index * tabWidth + tabWidth / 2 - 15 // Adjusted for smaller indicator width
      ),
    });
  }, [indicatorPosition, routeIndices, tabWidth]);

  return (
    <View style={[styles.tabBarRoot, { paddingBottom: 20 }]}>
      <View
        style={styles.tabBar}
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      >
        <LinearGradient
          colors={["rgba(40, 20, 75, 1)", "rgba(55, 25, 90, 1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 32 }]}
        />
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
            unreadCount={
              route.name === "Matches"
                ? unreadMessagesCount
                : route.name === "Home"
                ? unviewedPhotosCount
                : 0
            }
          />
        ))}
      </View>
    </View>
  );
};

type AnimatedTabBarItemProps = {
  route: AnimatedTabBarProps["state"]["routes"][number];
  navigation: AnimatedTabBarProps["navigation"];
  descriptors: AnimatedTabBarProps["descriptors"];
  isFocused: boolean;
  tabWidth: number;
  unreadCount?: number; // Add unread count
};

const AnimatedTabBarItem = ({
  route,
  navigation,
  descriptors,
  isFocused,
  tabWidth,
  unreadCount = 0, // Default to 0
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
          {/* Notification badge for Matches and Home tabs */}
          {((route.name === "Matches" && unreadCount > 0) ||
            (route.name === "Home" && unreadCount > 0)) && (
            <View style={styles.notificationDot} />
          )}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

export const HomeTabs = () => {
  const insets = useSafeAreaInsets();
  const bottomOffset = 0;
  const { user } = useAuth();
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [unviewedPhotosCount, setUnviewedPhotosCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for when Matches screen becomes focused to refresh badge
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh every 2 seconds to check for timestamp updates
      setRefreshKey((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Simple badge: show red dot if any conversation has NEW messages (since last view)
  useEffect(() => {
    if (!user) {
      setHasNewMessages(false);
      return;
    }

    const checkForNewMessages = async () => {
      try {
        // Get last viewed time (refreshed periodically)
        const lastViewedStr = await AsyncStorage.getItem(
          `last_viewed_matches_${user.uid}`
        );
        const lastViewed = lastViewedStr ? parseInt(lastViewedStr) : 0;

        const unsubscribe = chatService.subscribeToUserConversations(
          user.uid,
          async (conversations) => {
            // Show badge if there are any messages newer than last view
            const hasNewActivity = conversations.some((conv) => {
              if (conv.lastMessageTimestamp && conv.isActive) {
                const messageTime = conv.lastMessageTimestamp.toMillis();
                return messageTime > lastViewed;
              }
              return false;
            });
            setHasNewMessages(hasNewActivity);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error("Error checking for new messages:", error);
        return () => {};
      }
    };

    const unsubscribePromise = checkForNewMessages();

    return () => {
      unsubscribePromise.then((unsubscribe) => unsubscribe());
    };
  }, [user, refreshKey]); // Add refreshKey to dependencies

  // Check for unviewed photos
  useEffect(() => {
    if (!user) {
      setUnviewedPhotosCount(0);
      return;
    }

    const checkForUnviewedPhotos = async () => {
      try {
        const photos = await photoService.getUnviewedPhotos(user.uid);
        setUnviewedPhotosCount(photos.length);
      } catch (error) {
        console.error("Error checking for unviewed photos:", error);
      }
    };

    checkForUnviewedPhotos();

    // Poll for new photos every 30 seconds
    const interval = setInterval(checkForUnviewedPhotos, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopHeader />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
        }}
        tabBar={(props) => (
          <AnimatedTabBar
            {...props}
            bottomOffset={bottomOffset}
            unreadMessagesCount={hasNewMessages ? 1 : 0}
            unviewedPhotosCount={unviewedPhotosCount}
          />
        )}
        sceneContainerStyle={{ backgroundColor: colors.background }}
      >
        <Tab.Screen name="Home">
          {(props) => (
            <SwipeableTabScreen
              navigation={props.navigation}
              currentIndex={0}
              totalTabs={5}
            >
              <HomeScreen />
            </SwipeableTabScreen>
          )}
        </Tab.Screen>
        <Tab.Screen name="Friends">
          {(props) => (
            <SwipeableTabScreen
              navigation={props.navigation}
              currentIndex={1}
              totalTabs={5}
            >
              <FriendsScreen />
            </SwipeableTabScreen>
          )}
        </Tab.Screen>
        <Tab.Screen name="Matches">
          {(props) => (
            <SwipeableTabScreen
              navigation={props.navigation}
              currentIndex={2}
              totalTabs={5}
            >
              <MatchesScreen />
            </SwipeableTabScreen>
          )}
        </Tab.Screen>
        <Tab.Screen name="Points">
          {(props) => (
            <SwipeableTabScreen
              navigation={props.navigation}
              currentIndex={3}
              totalTabs={5}
            >
              <PointsScreen />
            </SwipeableTabScreen>
          )}
        </Tab.Screen>
        <Tab.Screen name="Profile">
          {(props) => (
            <SwipeableTabScreen
              navigation={props.navigation}
              currentIndex={4}
              totalTabs={5}
            >
              <ProfileScreen />
            </SwipeableTabScreen>
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarRoot: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  tabBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "100%",
  },
  sceneWrapper: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: "hidden",
    position: "relative",
  },
  sceneContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: 32,
    borderTopWidth: 0,
    backgroundColor: "transparent",
    height: 72,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  floatingIndicator: {
    position: "absolute",
    bottom: 8,
    height: 3,
    width: 30,
    borderRadius: 2,
    backgroundColor: colors.accentPurple,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
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
  encryptionBadge: {
    position: "absolute",
    top: -2,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(46, 230, 169, 0.2)",
    borderWidth: 1.5,
    borderColor: colors.accentTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255, 68, 97, 0.2)",
    borderWidth: 2,
    borderColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 8,
  },
});
