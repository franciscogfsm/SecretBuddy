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
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ChatInput } from "../components/ChatInput";
import { ChatMessage, MessageType } from "../components/ChatMessage";
import { GradientBackground } from "../components/GradientBackground";
import { ReportModal } from "../components/ReportModal";
import { SecurityBadge } from "../components/SecurityBadge";
import { colors, typography } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import * as chatService from "../services/chatService";
import type { ChatMessage as FirebaseChatMessage } from "../services/chatService";
import { getUserProfile } from "../services/userService";

export const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, matchedUserId, matchedUserName } = route.params as {
    conversationId: string;
    matchedUserId: string;
    matchedUserName?: string;
  };
  const { user } = useAuth();

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationExpired, setConversationExpired] = useState(false);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [partnerName, setPartnerName] = useState(matchedUserName || "");
  const [partnerPhoto, setPartnerPhoto] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [partnerProfileData, setPartnerProfileData] = useState<any>(null);

  const flatListRef = useRef<FlatList<MessageType>>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 0;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(
    null
  );
  const [showEncryptionNotice, setShowEncryptionNotice] = useState(true);
  const [actualConversationId, setActualConversationId] = useState<
    string | null
  >(conversationId);
  const encryptionNoticeOpacity = useRef(new Animated.Value(1)).current;

  // Hide encryption notice after 4 seconds with smooth animation
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(encryptionNoticeOpacity, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setShowEncryptionNotice(false);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Initialize conversation if it doesn't exist (for test/new chats)
  useEffect(() => {
    const initializeConversation = async () => {
      if (!conversationId || !user || !matchedUserId) return;

      try {
        // Try to get the conversation
        const result = await chatService.getConversationWithPartner(
          conversationId,
          user.uid
        );

        // If conversation doesn't exist, create it
        if (!result) {
          console.log("📝 Creating new conversation...");
          const newConversationId = await chatService.createConversation(
            user.uid,
            matchedUserId,
            conversationId // Use conversationId as matchId for test chats
          );
          console.log("✅ Conversation created:", newConversationId);
          setActualConversationId(newConversationId);
        } else {
          setActualConversationId(result.conversation.id);
        }
      } catch (error) {
        console.error("Error initializing conversation:", error);
      }
    };

    initializeConversation();
  }, [conversationId, user, matchedUserId]);

  // Load partner profile data
  useEffect(() => {
    const loadPartnerProfile = async () => {
      // Validate matchedUserId before calling getUserProfile
      if (!matchedUserId || !matchedUserId.trim()) {
        console.warn("⚠️ Invalid matchedUserId, cannot load partner profile");
        return;
      }

      try {
        const profile = await getUserProfile(matchedUserId);
        if (profile) {
          setPartnerName(profile.username || "Anonymous");
          setPartnerPhoto(profile.profilePhotoUrl || null);
          setPartnerProfileData(profile);
        }
      } catch (error) {
        console.error("Error loading partner profile:", error);
      }
    };
    loadPartnerProfile();
  }, [matchedUserId]);

  // Subscribe to messages
  useEffect(() => {
    if (!actualConversationId || !user) return;

    const unsubscribe = chatService.subscribeToMessages(
      actualConversationId,
      (firebaseMessages: FirebaseChatMessage[]) => {
        // Convert Firebase messages to UI format
        const uiMessages: MessageType[] = firebaseMessages.map((msg) => ({
          id: msg.id!,
          text: msg.text,
          // Handle null timestamp (happens with serverTimestamp() initially)
          timestamp: msg.timestamp?.toDate() || new Date(),
          isFromUser: msg.senderId === user.uid,
          status: msg.read
            ? "read"
            : msg.senderId === user.uid
            ? "sent"
            : "delivered",
        }));

        setMessages((prevMessages) => {
          // Keep only optimistic messages (temp_* IDs) that are still sending or failed
          const pendingOptimistic = prevMessages.filter(
            (msg) =>
              msg.id.startsWith("temp_") &&
              (msg.status === "sending" || msg.status === "failed")
          );

          // Merge Firebase messages with pending optimistic ones
          return [...uiMessages, ...pendingOptimistic];
        });

        setLoading(false);

        // Mark unread messages as read
        const unreadCount = firebaseMessages.filter(
          (msg) => msg.senderId !== user.uid && !msg.read
        ).length;

        if (unreadCount > 0) {
          chatService
            .markMessagesAsRead(actualConversationId, user.uid)
            .catch(console.error);
        }
      },
      (error) => {
        console.error("Error subscribing to messages:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [actualConversationId, user]);

  // Check if conversation is expired or ended
  useEffect(() => {
    const checkConversationStatus = async () => {
      if (!actualConversationId) return;
      try {
        const result = await chatService.getConversationWithPartner(
          actualConversationId,
          user!.uid
        );
        if (result) {
          const expired = chatService.isConversationExpired(
            result.conversation
          );
          setConversationExpired(expired);
          setConversationEnded(!result.conversation.isActive);
        }
      } catch (error) {
        console.error("Error checking conversation status:", error);
      }
    };
    checkConversationStatus();

    // Check every minute
    const interval = setInterval(checkConversationStatus, 60000);
    return () => clearInterval(interval);
  }, [actualConversationId, user]);

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

  const listBottomPadding = useMemo(() => {
    // If conversation ended/expired, no input box - less padding needed
    if (conversationEnded || conversationExpired) {
      return 20; // Just some bottom spacing
    }
    return keyboardVisible ? 180 : tabBarVisibleHeight + 100;
  }, [
    keyboardVisible,
    tabBarVisibleHeight,
    conversationEnded,
    conversationExpired,
  ]);

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
  const handleSendMessage = async (text: string) => {
    if (
      !user ||
      !actualConversationId ||
      sending ||
      conversationEnded ||
      conversationExpired
    )
      return;

    // Create optimistic message ID
    const optimisticId = `temp_${Date.now()}`;

    // Add message immediately to UI (optimistic update)
    const optimisticMessage: MessageType = {
      id: optimisticId,
      text,
      timestamp: new Date(),
      isFromUser: true,
      status: "sending",
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    setSending(true);

    try {
      // Send message in background
      await chatService.sendMessage(actualConversationId, user.uid, text);

      // Remove the optimistic message - Firebase will provide the real one
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
    } catch (error: any) {
      console.error("Error sending message:", error);

      // Update status to failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticId
            ? { ...msg, status: "failed", error: error.message }
            : msg
        )
      );

      // Show offline/error message
      Alert.alert(
        "Message Failed",
        error.message?.includes("offline") || error.message?.includes("network")
          ? "You appear to be offline. The message will be retried when you're back online."
          : "Could not send message. Tap the retry button to try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSending(false);
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = async (messageId: string) => {
    const failedMessage = messages.find((msg) => msg.id === messageId);
    if (!failedMessage || !user || !actualConversationId) return;

    // Update status to sending
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, status: "sending" } : msg
      )
    );

    try {
      await chatService.sendMessage(
        actualConversationId,
        user.uid,
        failedMessage.text || ""
      );

      // Remove the optimistic message - Firebase will provide the real one
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (error: any) {
      console.error("Error retrying message:", error);

      // Update status back to failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, status: "failed", error: error.message }
            : msg
        )
      );

      Alert.alert(
        "Retry Failed",
        "Still unable to send message. Please check your connection.",
        [{ text: "OK" }]
      );
    }
  };

  const handleReportPhoto = (messageId: string) => {
    setReportingMessageId(messageId);
    setReportModalVisible(true);
  };

  const handleEndConversation = async () => {
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
          onPress: async () => {
            try {
              if (!actualConversationId || !user) return;
              await chatService.endConversation(actualConversationId, user.uid);
              Alert.alert("Chat Ended", "This conversation has been closed.", [
                {
                  text: "OK",
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              console.error("Error ending conversation:", error);
              Alert.alert(
                "Error",
                "Failed to end conversation. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = async () => {
    if (!matchedUserId) return;
    setProfileModalVisible(true);
  };

  const renderMessage = ({ item }: { item: MessageType }) => (
    <ChatMessage
      message={item}
      onReportPhoto={handleReportPhoto}
      onRetry={handleRetryMessage}
    />
  );

  return (
    <View style={styles.fullScreenContainer}>
      <GradientBackground gradient="midnight" noPadding>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          enabled
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
            <Pressable style={styles.buddyInfo} onPress={handleViewProfile}>
              <View style={styles.avatar}>
                {partnerPhoto ? (
                  <Image
                    source={{ uri: partnerPhoto }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {partnerName[0]?.toUpperCase() || "?"}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.buddyName}>{partnerName}</Text>
                  <View style={styles.encryptedBadge}>
                    <Ionicons
                      name="lock-closed"
                      size={10}
                      color={colors.accentTeal}
                    />
                  </View>
                </View>
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
            </Pressable>
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
                  {conversationExpired
                    ? "Chat has expired"
                    : conversationEnded
                    ? "Chat has ended"
                    : "Chat expires at midnight"}
                </Text>
              </View>
              {!conversationEnded && !conversationExpired && (
                <Pressable
                  style={styles.endConversationLink}
                  onPress={handleEndConversation}
                >
                  <Text style={styles.endConversationLinkText}>End chat</Text>
                </Pressable>
              )}
            </View>
            {/* Security Badge */}
            <View style={{ marginTop: 8 }}>
              <SecurityBadge variant="compact" />
            </View>
          </View>

          <View style={styles.chatArea}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accentPurple} />
                <Text style={styles.loadingText}>Loading messages...</Text>
              </View>
            ) : (
              <>
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
                    ListEmptyComponent={
                      <View style={styles.emptyMessagesContainer}>
                        {showEncryptionNotice && (
                          <Animated.View
                            style={[
                              styles.encryptionNotice,
                              { opacity: encryptionNoticeOpacity },
                            ]}
                          >
                            <Ionicons
                              name="shield-checkmark"
                              size={32}
                              color="#10B981"
                            />
                            <Text style={styles.encryptionNoticeTitle}>
                              🔐 End-to-End Encrypted
                            </Text>
                            <Text style={styles.encryptionNoticeText}>
                              All messages are encrypted with AES-256
                              encryption. Only you and {partnerName} can read
                              them.
                            </Text>
                            <SecurityBadge variant="compact" />
                          </Animated.View>
                        )}
                        <Text style={styles.emptyMessagesText}>
                          Start chatting! Your first message will begin the
                          conversation.
                        </Text>
                      </View>
                    }
                    ListFooterComponent={<View style={{ height: 12 }} />}
                  />
                </View>
                {/* Show "Chat Ended" banner when conversation is no longer active */}
                {(conversationEnded || conversationExpired) && (
                  <View style={styles.chatEndedBanner}>
                    <Ionicons
                      name="lock-closed"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.chatEndedText}>
                      {conversationExpired
                        ? "Chat expired • View only"
                        : "Chat ended • View only"}
                    </Text>
                  </View>
                )}
                {/* Only show input if conversation is active */}
                {!conversationEnded && !conversationExpired && (
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
                      disabled={sending}
                    />
                  </Animated.View>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </GradientBackground>

      {/* Report Modal for Photos */}
      {user && matchedUserId && (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            setReportingMessageId(null);
          }}
          reportType="photo"
          targetName={matchedUserName}
          reportedUserId={matchedUserId}
          reportingUserId={user.uid}
        />
      )}

      {/* Profile Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setProfileModalVisible(false)}
        >
          <Pressable
            style={styles.profileModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.profileModalHeader}>
              <Text style={styles.profileModalTitle}>Profile</Text>
              <Pressable
                hitSlop={12}
                onPress={() => setProfileModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            {partnerProfileData && (
              <View style={styles.profileContent}>
                <View style={styles.profileAvatarContainer}>
                  {partnerPhoto ? (
                    <Image
                      source={{ uri: partnerPhoto }}
                      style={styles.profileAvatarImage}
                    />
                  ) : (
                    <View style={styles.profileAvatarPlaceholder}>
                      <Text style={styles.profileAvatarText}>
                        {partnerName[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.profileName}>{partnerName}</Text>

                {partnerProfileData.bio && (
                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>About</Text>
                    <Text style={styles.profileBio}>
                      {partnerProfileData.bio}
                    </Text>
                  </View>
                )}

                {partnerProfileData.country && (
                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>Location</Text>
                    <Text style={styles.profileText}>
                      {partnerProfileData.country}
                    </Text>
                  </View>
                )}

                <View style={styles.profileStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {partnerProfileData.points || 0}
                    </Text>
                    <Text style={styles.statLabel}>Points</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {partnerProfileData.streakDays || 0}
                    </Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                  </View>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  encryptedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(46, 230, 169, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(46, 230, 169, 0.4)",
    alignItems: "center",
    justifyContent: "center",
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
  chatEndedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  chatEndedText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
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
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  profileModalContent: {
    backgroundColor: colors.overlay,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  profileModalTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 24,
  },
  profileContent: {
    alignItems: "center",
  },
  profileAvatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 16,
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
  },
  profileAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.accentPurple,
    justifyContent: "center",
    alignItems: "center",
  },
  profileAvatarText: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 48,
  },
  profileName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 28,
    marginBottom: 24,
  },
  profileSection: {
    width: "100%",
    marginBottom: 20,
  },
  profileSectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  profileBio: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  profileText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  profileStats: {
    flexDirection: "row",
    gap: 32,
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    ...typography.title,
    color: colors.accentPurple,
    fontSize: 32,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  emptyMessagesContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  encryptionNotice: {
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    marginBottom: 24,
    gap: 12,
  },
  encryptionNoticeTitle: {
    ...typography.subtitle,
    color: "#10B981",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  encryptionNoticeText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  emptyMessagesText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
});
