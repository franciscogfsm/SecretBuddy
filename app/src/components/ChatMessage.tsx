import { Ionicons } from "@expo/vector-icons";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef } from "react";

import { colors, typography } from "../theme";

export type MessageType = {
  id: string;
  text: string;
  timestamp: Date;
  isFromUser: boolean;
  status?: "sending" | "sent" | "delivered" | "read";
};

type ChatMessageProps = {
  message: MessageType;
};

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(
    new Animated.Value(message.isFromUser ? 20 : -20)
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, message.id]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case "sending":
        return (
          <Ionicons
            name="time-outline"
            size={12}
            color={colors.textSecondary}
          />
        );
      case "sent":
        return (
          <Ionicons name="checkmark" size={12} color={colors.textSecondary} />
        );
      case "delivered":
        return (
          <Ionicons
            name="checkmark-done"
            size={12}
            color={colors.textSecondary}
          />
        );
      case "read":
        return (
          <Ionicons name="checkmark-done" size={12} color={colors.accentTeal} />
        );
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        message.isFromUser ? styles.sentContainer : styles.receivedContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          message.isFromUser ? styles.sentBubble : styles.receivedBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            message.isFromUser ? styles.sentText : styles.receivedText,
          ]}
        >
          {message.text}
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
        {message.isFromUser && (
          <View style={styles.statusContainer}>{getStatusIcon()}</View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    maxWidth: "82%",
  },
  sentContainer: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  receivedContainer: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  sentBubble: {
    backgroundColor: colors.accentPurple,
    borderRadius: 22,
  },
  receivedBubble: {
    backgroundColor: "rgba(13, 8, 40, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.16)",
    borderRadius: 22,
  },
  messageText: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  sentText: {
    color: colors.textPrimary,
  },
  receivedText: {
    color: colors.textPrimary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 6,
  },
  timestamp: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 11,
  },
  statusContainer: {
    marginLeft: 6,
  },
});
