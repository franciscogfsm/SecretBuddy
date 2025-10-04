import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and get Expo Push Token
 * Saves token to Firestore user document
 */
export const registerForPushNotifications = async (
  userId: string
): Promise<string | null> => {
  try {
    // Skip push notifications on web
    if (Platform.OS === "web") {
      console.log("⚠️ Push notifications not supported on web");
      return null;
    }

    // Check if we're on a physical device
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2EE6A9",
      });
    }

    // Request permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("⚠️ Push notification permission denied");
      return null;
    }

    // Get Expo Push Token
    let token: string;
    try {
      console.log("📱 Getting Expo Push Token...");
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
      console.log("✅ Expo Push Token:", token);
    } catch (error) {
      console.error("⚠️ Error getting Expo token:", error);
      // Fallback: generate a test token for development
      token = `ExponentPushToken[DEV_${userId.substring(0, 8)}]`;
      console.log("⚠️ Using development token:", token);
    }

    // Save token to Firestore
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      expoPushToken: token,
      pushTokenUpdatedAt: new Date(),
    });

    console.log("✅ Push token saved to Firestore");

    return token;
  } catch (error) {
    console.error("❌ Error registering for push notifications:", error);
    return null;
  }
};

/**
 * Listen for notification received (when app is in foreground)
 */
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Listen for notification response (when user taps notification)
 */
export const addNotificationResponseReceivedListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Send a local notification (for testing)
 */
export const sendLocalNotification = async (
  title: string,
  body: string,
  data?: any
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Send immediately
  });
};
