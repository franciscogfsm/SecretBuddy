/**
 * TestChatButton Component
 *
 * Add this button to your MatchesScreen to quickly create a test conversation
 * with your friend for testing real-time chat.
 *
 * Usage:
 * import { TestChatButton } from '../components/TestChatButton';
 *
 * <TestChatButton friendUserId="YOUR_FRIEND_USER_ID" />
 */

import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import * as chatService from "../services/chatService";
import { colors, typography } from "../theme";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

interface TestChatButtonProps {
  friendUserId: string; // Your friend's Firebase Auth UID
}

export const TestChatButton = ({ friendUserId }: TestChatButtonProps) => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [creating, setCreating] = useState(false);

  const createTestConversation = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    setCreating(true);

    try {
      console.log("🚀 Creating test conversation...");

      // Get tomorrow at midnight (extended expiration for testing)
      const getTomorrowMidnight = (): Date => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);
        return tomorrow;
      };

      // Step 1: Create conversation
      const conversationData = {
        participants: [user.uid, friendUserId].sort(),
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(getTomorrowMidnight()),
        isActive: true,
        matchId: `test_match_${Date.now()}`,
        isRevealed: true,
        lastMessage: "Hey! This is a test message 👋",
        lastMessageTimestamp: serverTimestamp(),
      };

      const conversationRef = await addDoc(
        collection(db, "conversations"),
        conversationData
      );

      console.log("✅ Conversation created:", conversationRef.id);

      // Step 2: Add test messages
      const testMessages = [
        {
          conversationId: conversationRef.id,
          senderId: user.uid,
          text: "Hey! This is a test message 👋",
          timestamp: serverTimestamp(),
          read: true,
          type: "text",
        },
        {
          conversationId: conversationRef.id,
          senderId: friendUserId,
          text: "Hi! Testing real-time chat 🚀",
          timestamp: serverTimestamp(),
          read: false,
          type: "text",
        },
      ];

      for (const message of testMessages) {
        await addDoc(collection(db, "messages"), message);
      }

      console.log("✅ Test messages added");

      // Navigate to the chat
      Alert.alert(
        "Test Chat Created! 🎉",
        "Opening chat with your friend. Try sending messages!",
        [
          {
            text: "Open Chat",
            onPress: () => {
              (navigation as any).navigate("Chat", {
                conversationId: conversationRef.id,
                matchedUserId: friendUserId,
                matchedUserName: "Test Friend",
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("❌ Error creating test chat:", error);
      Alert.alert(
        "Error",
        "Failed to create test conversation. Check console for details."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, creating && styles.buttonDisabled]}
        onPress={createTestConversation}
        disabled={creating}
      >
        <Ionicons
          name="flask"
          size={20}
          color={creating ? colors.textSecondary : colors.textPrimary}
        />
        <Text
          style={[styles.buttonText, creating && styles.buttonTextDisabled]}
        >
          {creating ? "Creating Test Chat..." : "Create Test Chat with Friend"}
        </Text>
      </Pressable>
      <Text style={styles.helperText}>
        Creates a test conversation that expires tomorrow
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.accentPurple,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "rgba(156, 107, 255, 0.3)",
    opacity: 0.6,
  },
  buttonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
});
