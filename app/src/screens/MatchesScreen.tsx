import { useState, useRef, useEffect, useMemo } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { ChatInput } from "../components/ChatInput";
import { ChatMessage, MessageType } from "../components/ChatMessage";
import { GradientBackground } from "../components/GradientBackground";
import { colors, typography } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TIMED_CHAT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

const historyMessagesSeed: MessageType[] = [
  {
    id: "m-1",
    text: "Hey! I loved your response to today's prompt 😊",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    isFromUser: false,
    status: "read",
  },
  {
    id: "m-2",
    text: "Thanks! That sunset video was amazing 🌅",
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    isFromUser: true,
    status: "read",
  },
  {
    id: "m-3",
    text: "Haha, it was such a beautiful evening! Where did you capture that?",
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
    isFromUser: false,
    status: "read",
  },
  {
    id: "m-4",
    text: "From my balcony! The view is incredible at that time",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    isFromUser: true,
    status: "read",
  },
  {
    id: "m-5",
    text: "Sounds perfect! We should plan a sunset walk sometime ✨",
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    isFromUser: false,
    status: "delivered",
  },
];

const timedChatSeed: MessageType[] = historyMessagesSeed.slice(0, 3);

export const MatchesScreen = () => {
  const [messages, setMessages] = useState<MessageType[]>(timedChatSeed);
  const historyMessagesRef = useRef<MessageType[]>(historyMessagesSeed);
  const [isEphemeralMode, setIsEphemeralMode] = useState(true);
  const [remainingMs, setRemainingMs] = useState<number>(
    TIMED_CHAT_DURATION_MS
  );
  const [hasExpired, setHasExpired] = useState(false);
  const flatListRef = useRef<FlatList<MessageType>>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Track keyboard visibility to adjust spacing dynamically
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const chatOffsets = useMemo(() => {
    const tabBarVisibleHeight = Math.max(tabBarHeight - insets.bottom, 0);
    // When keyboard is open, remove extra clearance so input sits closer to the keyboard
    const chatInputClearance = keyboardVisible
      ? -100
      : tabBarVisibleHeight + 40;
    const listBottomPadding = chatInputClearance + 120;

    return {
      chatInputClearance,
      listBottomPadding,
    };
  }, [insets.bottom, tabBarHeight, keyboardVisible]);

  useEffect(() => {
    if (!isEphemeralMode) {
      return;
    }

    setRemainingMs(TIMED_CHAT_DURATION_MS);

    const interval = setInterval(() => {
      setRemainingMs((prev) => Math.max(prev - 1000, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isEphemeralMode]);

  useEffect(() => {
    if (!isEphemeralMode && hasExpired) {
      return;
    }

    if (isEphemeralMode && remainingMs === 0) {
      setIsEphemeralMode(false);
      setHasExpired(true);
      setMessages(historyMessagesRef.current);
    }
  }, [isEphemeralMode, remainingMs, hasExpired]);

  useEffect(() => {
    const animation = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => clearTimeout(animation);
  }, [messages]);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const statusLabel = isEphemeralMode
    ? `Timed chat • ${formatCountdown(remainingMs)}`
    : "Active • 7 day streak";

  const handleSendMessage = (text: string) => {
    const newMessage: MessageType = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      isFromUser: true,
      status: "sending",
    };

    setMessages((prev) => [...prev, newMessage]);
    historyMessagesRef.current = [...historyMessagesRef.current, newMessage];

    // Simulate message being sent
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: "sent" as const } : msg
        )
      );
      historyMessagesRef.current = historyMessagesRef.current.map((msg) =>
        msg.id === newMessage.id ? { ...msg, status: "sent" as const } : msg
      );

      // Simulate reply after a delay
      setTimeout(() => {
        const replyMessage: MessageType = {
          id: (Date.now() + 1).toString(),
          text: "That sounds like a great idea! 🌟",
          timestamp: new Date(),
          isFromUser: false,
          status: "delivered",
        };
        setMessages((prev) => [...prev, replyMessage]);
        historyMessagesRef.current = [
          ...historyMessagesRef.current,
          replyMessage,
        ];
      }, 2000);
    }, 1000);
  };

  const renderMessage = ({ item }: { item: MessageType }) => (
    <ChatMessage message={item} />
  );

  return (
    <View style={styles.fullScreenContainer}>
      <GradientBackground gradient="midnight" noPadding>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          // Avoid double-padding when the keyboard is visible on iOS by dropping the offset
          keyboardVerticalOffset={
            Platform.OS === "ios" ? (keyboardVisible ? 0 : tabBarHeight) : 0
          }
        >
          <View
            style={[
              styles.header,
              {
                paddingTop: insets.top + 16,
              },
            ]}
          >
            <Pressable style={styles.backButton} hitSlop={12}>
              <Text style={styles.backText}>‹ Matches</Text>
            </Pressable>
            <View style={styles.buddyInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>N</Text>
              </View>
              <View>
                <Text style={styles.buddyName}>Neon Fox</Text>
                <View
                  style={[
                    styles.statusPill,
                    isEphemeralMode
                      ? styles.statusPillEphemeral
                      : styles.statusPillActive,
                  ]}
                >
                  <Text style={styles.buddyStatus}>{statusLabel}</Text>
                </View>
              </View>
            </View>

            {isEphemeralMode && (
              <View style={styles.ephemeralIndicator}>
                <Text style={styles.ephemeralText}>⚡</Text>
              </View>
            )}
          </View>

          {isEphemeralMode && (
            <View style={styles.ephemeralWarning}>
              <Text style={styles.ephemeralWarningText}>
                💫 Messages disappear after reveal window ends
              </Text>
            </View>
          )}

          {!isEphemeralMode && hasExpired && (
            <View style={styles.persistedNotice}>
              <Text style={styles.persistedNoticeText}>
                🔒 Timed chat ended • Conversation saved to Matches
              </Text>
            </View>
          )}

          <View style={styles.chatArea}>
            <FlatList<MessageType>
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={[
                styles.messagesContainer,
                { paddingBottom: chatOffsets.listBottomPadding },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={<View style={{ height: 12 }} />}
            />
            <ChatInput
              onSendMessage={handleSendMessage}
              bottomInset={Math.max(insets.bottom - 6, 0)}
              style={{ marginBottom: chatOffsets.chatInputClearance }}
            />
          </View>
        </KeyboardAvoidingView>
      </GradientBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.overlay,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  backText: {
    ...typography.body,
    color: colors.accentPurple,
    fontSize: 16,
  },
  buddyInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 18,
  },
  buddyName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 20,
  },
  buddyStatus: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },
  statusPillEphemeral: {
    backgroundColor: "rgba(255, 111, 138, 0.2)",
  },
  statusPillActive: {
    backgroundColor: "rgba(46, 230, 169, 0.18)",
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 4,
  },
  messagesContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 120,
    gap: 6,
  },
  ephemeralIndicator: {
    marginRight: 20,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(46, 230, 169, 0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  ephemeralText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  ephemeralWarning: {
    backgroundColor: "rgba(6, 0, 18, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(255, 111, 138, 0.38)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  ephemeralWarningText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
    fontSize: 14,
  },
  persistedNotice: {
    backgroundColor: "rgba(6, 0, 18, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(46, 230, 169, 0.38)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  persistedNoticeText: {
    ...typography.caption,
    color: colors.accentTeal,
    textAlign: "center",
    fontSize: 14,
  },
});
