import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from "react-native";
import { useEffect, useRef, useState } from "react";

import { colors, typography } from "../theme";

export type MessageType = {
  id: string;
  text?: string;
  timestamp: Date;
  isFromUser: boolean;
  status?: "sending" | "sent" | "delivered" | "read";
  photoUrl?: string;
  photoPrompt?: string;
};

type ChatMessageProps = {
  message: MessageType;
  onReportPhoto?: (messageId: string) => void;
};

export const ChatMessage = ({ message, onReportPhoto }: ChatMessageProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(
    new Animated.Value(message.isFromUser ? 20 : -20)
  ).current;
  const [showReportButton, setShowReportButton] = useState(false);

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
          message.photoUrl && styles.photoBubble,
        ]}
      >
        {message.photoUrl ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowReportButton(!showReportButton)}
          >
            {message.photoPrompt && (
              <View style={styles.promptBadge}>
                <Ionicons name="camera" size={14} color={colors.accentPurple} />
                <Text style={styles.promptText}>{message.photoPrompt}</Text>
              </View>
            )}
            <Image
              source={{ uri: message.photoUrl }}
              style={styles.photo}
              resizeMode="cover"
            />
            {!message.isFromUser && showReportButton && onReportPhoto && (
              <TouchableOpacity
                style={styles.reportPhotoButton}
                onPress={() => {
                  onReportPhoto(message.id);
                  setShowReportButton(false);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="flag" size={16} color={colors.danger} />
                <Text style={styles.reportPhotoText}>Report</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ) : (
          <Text
            style={[
              styles.messageText,
              message.isFromUser ? styles.sentText : styles.receivedText,
            ]}
          >
            {message.text}
          </Text>
        )}
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
  photoBubble: {
    padding: 0,
    overflow: "hidden",
  },
  photo: {
    width: 220,
    height: 220,
    borderRadius: 18,
  },
  promptBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(11, 7, 32, 0.92)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.3)",
    zIndex: 10,
  },
  promptText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "600",
  },
  reportPhotoButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(11, 7, 32, 0.95)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: colors.danger,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  reportPhotoText: {
    ...typography.caption,
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
});
