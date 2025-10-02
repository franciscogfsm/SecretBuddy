import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography } from "../theme";

interface OfflineModalProps {
  visible: boolean;
}

const { width: screenWidth } = Dimensions.get("window");

export const OfflineModal: React.FC<OfflineModalProps> = ({ visible }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for the icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Fade out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["rgba(6, 0, 18, 0.98)", "rgba(15, 5, 35, 0.98)"]}
            style={styles.modalContent}
          >
            {/* Animated Icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={["rgba(255, 79, 183, 0.2)", "rgba(156, 107, 255, 0.2)"]}
                style={styles.iconBackground}
              >
                <Ionicons name="cloud-offline" size={48} color="#FF4FB7" />
              </LinearGradient>
            </Animated.View>

            {/* Title */}
            <Text style={styles.title}>You're Offline</Text>

            {/* Message */}
            <Text style={styles.message}>
              Looks like you've lost your internet connection. Don't worry,
              we'll reconnect automatically when you're back online.
            </Text>

            {/* Status Indicator */}
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Waiting for connection...</Text>
            </View>

            {/* Bottom decoration */}
            <View style={styles.decoration}>
              <View style={styles.decorationDot} />
              <View style={styles.decorationDot} />
              <View style={styles.decorationDot} />
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  container: {
    width: "100%",
    maxWidth: 360,
  },

  modalContent: {
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.3)",
    shadowColor: "rgba(156, 107, 255, 0.5)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 20,
  },

  iconContainer: {
    marginBottom: 24,
  },

  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 79, 183, 0.3)",
    shadowColor: "#FF4FB7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },

  title: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },

  message: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 79, 183, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 79, 183, 0.2)",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4FB7",
    shadowColor: "#FF4FB7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },

  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },

  decoration: {
    flexDirection: "row",
    gap: 6,
    marginTop: 24,
  },

  decorationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(156, 107, 255, 0.4)",
  },
});
