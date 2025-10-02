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

export const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isTimed } = route.params as { isTimed: boolean };
  const [messages, setMessages] = useState<MessageType[]>(historyMessagesSeed);
  const historyMessagesRef = useRef<MessageType[]>(historyMessagesSeed);
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

  // Calculate time until midnight
  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m until midnight`;
  };

  const statusLabel = `Active • ${getTimeUntilMidnight()}`;

  // Only scroll to bottom when user sends a new message
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

    // Scroll to bottom when sending a message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

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
        // Scroll to show the reply
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
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
                <View style={styles.statusPill}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={colors.textPrimary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.buddyStatus}>{statusLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* End Conversation - Subtle link style */}
          <View style={styles.endConversationContainer}>
            <View style={styles.endConversationRow}>
              <View style={styles.expirationInfo}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.expirationText}>
                  Chat expires at midnight
                </Text>
              </View>
              <Pressable
                style={styles.endConversationLink}
                onPress={() => {
                  Alert.alert(
                    "End Conversation?",
                    "This will permanently close the chat and cannot be undone. Are you absolutely sure?",
                    [
                      {
                        text: "Cancel",
                        style: "cancel",
                      },
                      {
                        text: "Yes, End Chat",
                        style: "destructive",
                        onPress: () => navigation.goBack(),
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.endConversationLinkText}>End chat</Text>
              </Pressable>
            </View>
          </View>

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
                disabled={false}
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
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
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
  endConversationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(6, 0, 18, 0.4)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  endConversationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expirationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  expirationText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  endConversationLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  endConversationLinkText: {
    ...typography.caption,
    color: "rgba(239, 68, 68, 0.7)",
    fontSize: 12,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
