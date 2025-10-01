import { useState, useRef, useEffect, useMemo } from "react";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ChatInput } from "../components/ChatInput";
import { ChatMessage, MessageType } from "../components/ChatMessage";
import { GradientBackground } from "../components/GradientBackground";
import { ReportModal } from "../components/ReportModal";
import { colors, typography } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TIMED_CHAT_DURATION_MS = 1 * 60 * 1000; // 1 minute

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

export const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isTimed } = route.params as { isTimed: boolean };
  const [messages, setMessages] = useState<MessageType[]>(
    isTimed ? timedChatSeed : historyMessagesSeed
  );
  const historyMessagesRef = useRef<MessageType[]>(historyMessagesSeed);
  const [isEphemeralMode, setIsEphemeralMode] = useState(isTimed);
  const [remainingMs, setRemainingMs] = useState<number>(
    isTimed ? TIMED_CHAT_DURATION_MS : 0
  );
  const [hasExpired, setHasExpired] = useState(!isTimed);
  const flatListRef = useRef<FlatList<MessageType>>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 0; // ChatScreen is not in bottom tab navigator
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(
    null
  );

  // Track keyboard visibility and height to adjust spacing dynamically
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
        // Auto-scroll to show latest message when keyboard opens
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const tabBarVisibleHeight = useMemo(
    () => Math.max(tabBarHeight - insets.bottom, 0),
    [tabBarHeight, insets.bottom]
  );

  const closedMarginBottom = useMemo(
    () => (tabBarVisibleHeight > 0 ? -(tabBarVisibleHeight - 130) : 0),
    [tabBarVisibleHeight]
  );
  const openMarginBottom = 8;

  const closedPaddingBottom = useMemo(
    () => Math.max(insets.bottom, 8),
    [insets.bottom]
  );
  const openPaddingBottom = 8;

  const listBottomPadding = useMemo(
    () => (keyboardVisible ? 180 : tabBarVisibleHeight + 100),
    [keyboardVisible, tabBarVisibleHeight]
  );

  const chatInputMarginAnim = useRef(
    new Animated.Value(keyboardVisible ? openMarginBottom : closedMarginBottom)
  ).current;
  const chatInputPaddingAnim = useRef(
    new Animated.Value(
      keyboardVisible ? openPaddingBottom : closedPaddingBottom
    )
  ).current;

  useEffect(() => {
    const toMargin = keyboardVisible ? openMarginBottom : closedMarginBottom;
    const toPadding = keyboardVisible ? openPaddingBottom : closedPaddingBottom;

    Animated.timing(chatInputMarginAnim, {
      toValue: toMargin,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    Animated.timing(chatInputPaddingAnim, {
      toValue: toPadding,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [
    keyboardVisible,
    openMarginBottom,
    closedMarginBottom,
    openPaddingBottom,
    closedPaddingBottom,
    chatInputMarginAnim,
    chatInputPaddingAnim,
  ]);

  useEffect(() => {
    if (!isEphemeralMode || !isTimed) {
      return;
    }

    setRemainingMs(TIMED_CHAT_DURATION_MS);

    const interval = setInterval(() => {
      setRemainingMs((prev) => Math.max(prev - 1000, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isEphemeralMode, isTimed]);

  useEffect(() => {
    if ((!isEphemeralMode && hasExpired) || !isTimed) {
      return;
    }

    if (isEphemeralMode && remainingMs === 0) {
      setIsEphemeralMode(false);
      setHasExpired(true);
      setMessages(historyMessagesRef.current.slice(-7));
      // Navigate back to Matches after expiration
      setTimeout(() => {
        navigation.goBack();
      }, 2000); // Delay to show the ended message
    }
  }, [isEphemeralMode, remainingMs, hasExpired, navigation, isTimed]);

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

  const statusLabel = isTimed
    ? isEphemeralMode
      ? `Timed chat • ${formatCountdown(remainingMs)}`
      : hasExpired
      ? "Chat ended"
      : "Active • 7 day streak"
    : "Conversation history";

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

  const handleReportPhoto = (messageId: string) => {
    setReportingMessageId(messageId);
    setReportModalVisible(true);
  };

  const renderMessage = ({ item }: { item: MessageType }) => (
    <ChatMessage message={item} onReportPhoto={handleReportPhoto} />
  );

  return (
    <View style={styles.fullScreenContainer}>
      <GradientBackground gradient="midnight" noPadding>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View
            style={[
              styles.header,
              {
                paddingTop: insets.top + 16,
              },
            ]}
          >
            <Pressable
              style={styles.backButton}
              hitSlop={12}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={colors.accentPurple}
              />
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

            <Pressable
              style={styles.endChatButton}
              hitSlop={8}
              onPress={() => {
                Alert.alert(
                  "End Conversation",
                  "Are you sure you want to end this conversation? This cannot be undone.",
                  [
                    {
                      text: "Cancel",
                      style: "cancel",
                    },
                    {
                      text: "End Chat",
                      style: "destructive",
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            </Pressable>

            {isTimed && isEphemeralMode && (
              <View style={styles.ephemeralIndicator}>
                <Text style={styles.ephemeralText}>⚡</Text>
              </View>
            )}
          </View>

          {isTimed && isEphemeralMode && (
            <View style={styles.ephemeralWarning}>
              <Text style={styles.ephemeralWarningText}>
                💫 Chat ends after 1 minute
              </Text>
            </View>
          )}

          {isTimed && !isEphemeralMode && hasExpired && (
            <View style={styles.persistedNotice}>
              <Text style={styles.persistedNoticeText}>
                🔒 Chat ended • Old messages deleted
              </Text>
            </View>
          )}

          <View style={styles.chatArea}>
            <View style={styles.messagesWrapper}>
              <FlatList<MessageType>
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={[
                  styles.messagesContainer,
                  { paddingBottom: listBottomPadding },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListFooterComponent={<View style={{ height: 12 }} />}
              />
            </View>
            <Animated.View
              style={[
                styles.chatInputContainer,
                {
                  marginBottom: chatInputMarginAnim,
                  paddingBottom: chatInputPaddingAnim,
                },
              ]}
            >
              <ChatInput
                onSendMessage={handleSendMessage}
                bottomInset={0}
                disabled={isTimed && hasExpired}
              />
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </GradientBackground>

      {/* Report Modal for Photos */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => {
          setReportModalVisible(false);
          setReportingMessageId(null);
        }}
        onSubmit={async (category, description) => {
          // TODO: Implement Firebase photo report submission
          console.log("Photo reported:", {
            messageId: reportingMessageId,
            category,
            description,
          });
        }}
        reportType="photo"
      />
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(156, 107, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  endChatButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 71, 87, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
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
  messagesWrapper: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 120,
    gap: 6,
  },
  chatInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
