import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, spacing, typography } from "../theme";

type ChatInputProps = {
  onSendMessage: (text: string) => void;
  placeholder?: string;
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
};

export const ChatInput = ({
  onSendMessage,
  placeholder = "Type a message...",
  bottomInset = 0,
  style,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
      Keyboard.dismiss();
    }
  };

  const handleEmojiPress = () => {
    // For now, just add a heart emoji as example
    setMessage((prev) => prev + "❤️");
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: spacing.md + bottomInset,
        },
        style,
      ]}
    >
      <View style={styles.inputContainer}>
        <Pressable
          style={styles.emojiButton}
          onPress={handleEmojiPress}
          hitSlop={8}
        >
          <Ionicons
            name="happy-outline"
            size={24}
            color={colors.textSecondary}
          />
        </Pressable>

        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />

        <Pressable
          style={[
            styles.sendButton,
            message.trim()
              ? styles.sendButtonActive
              : styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!message.trim()}
          hitSlop={8}
        >
          <Ionicons
            name="send"
            size={20}
            color={message.trim() ? colors.accentPurple : colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(6, 0, 18, 0.85)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 52,
    maxHeight: 130,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  emojiButton: {
    marginRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: spacing.xs,
    maxHeight: 80,
  },
  sendButton: {
    marginLeft: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: "rgba(156, 107, 255, 0.28)",
  },
  sendButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});
