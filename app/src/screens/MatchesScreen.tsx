import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
} from "react-native";

import { useNavigation, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GradientBackground } from "../components/GradientBackground";
import { TopHeader } from "../components/TopHeader";
import { colors, typography } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import * as chatService from "../services/chatService";
import { getUserProfile } from "../services/userService";
import * as encryptionService from "../services/encryptionService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Conversation } from "../services/chatService";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 375;

type ChatItem = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  expired: boolean;
  avatarInitial: string;
  conversationId: string;
  partnerId: string;
  isActive: boolean;
};

export const MatchesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const isFocused = useIsFocused();

  // Clear notification badge when screen is focused
  useEffect(() => {
    if (isFocused && user) {
      AsyncStorage.setItem(
        `last_viewed_matches_${user.uid}`,
        Date.now().toString()
      ).catch(console.error);
    }
  }, [isFocused, user]);

  // Subscribe to conversations in real-time
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    console.log("📡 Setting up real-time conversation listener...");

    const unsubscribe = chatService.subscribeToUserConversations(
      user.uid,
      async (conversations) => {
        console.log(`🔄 Conversations updated: ${conversations.length} found`);

        // Convert to ChatItem format
        const chatItems: ChatItem[] = await Promise.all(
          conversations.map(async (conv) => {
            // Get partner ID
            const partnerId =
              conv.participants.find((id) => id !== user.uid) || "";

            // Load partner profile - only if partnerId is valid
            let partnerName = "Anonymous";
            if (partnerId && partnerId.trim()) {
              try {
                const profile = await getUserProfile(partnerId);
                if (profile) {
                  partnerName = profile.username || "Anonymous";
                }
              } catch (error) {
                console.error("Error loading partner profile:", error);
              }
            }

            const expired = chatService.isConversationExpired(conv);

            // Decrypt last message preview (if it exists and is encrypted)
            let lastMessageText = "No messages yet";
            if (conv.lastMessage) {
              try {
                // Try to decrypt the last message
                lastMessageText = await encryptionService.decryptMessage(
                  conv.lastMessage,
                  conv.id!
                );
              } catch (error) {
                // If decryption fails, show a placeholder (don't show encrypted text)
                console.warn("Failed to decrypt last message preview:", error);
                lastMessageText = "🔒 New message";
              }
            }

            return {
              id: conv.id!,
              name: partnerName,
              lastMessage: lastMessageText,
              timestamp:
                conv.lastMessageTimestamp?.toDate() ||
                conv.createdAt?.toDate() ||
                new Date(),
              expired,
              avatarInitial: partnerName[0]?.toUpperCase() || "?",
              conversationId: conv.id!,
              partnerId,
              isActive: conv.isActive,
            };
          })
        );

        setChats(chatItems);
        setLoading(false);
      }
    );

    return () => {
      console.log("🔌 Unsubscribing from conversation listener");
      unsubscribe();
    };
  }, [user]);

  // Filter and sort chats
  const visibleChats = chats.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  const handleChatPress = (chat: ChatItem) => {
    // Navigate to chat with real data
    (navigation as any).navigate("Chat", {
      conversationId: chat.conversationId,
      matchedUserId: chat.partnerId,
      matchedUserName: chat.name,
    });
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    const isRevealed = !item.expired && item.isActive;

    return (
      <Pressable
        style={[styles.chatItem, isRevealed && styles.chatItemRevealed]}
        onPress={() => handleChatPress(item)}
      >
        {/* Avatar with badge */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, isRevealed && styles.avatarRevealed]}>
            <Text style={styles.avatarText}>{item.avatarInitial}</Text>
          </View>
          {isRevealed && <View style={styles.onlineIndicator} />}
        </View>

        {/* Chat Info */}
        <View style={styles.chatInfo}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.chatName, isRevealed && styles.chatNameRevealed]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {isRevealed && (
              <View style={styles.revealedBadge}>
                <Ionicons
                  name="eye"
                  size={10}
                  color="#8B5CF6"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.revealedBadgeText}>REVEALED</Text>
              </View>
            )}
          </View>

          <Text style={styles.lastMessage} numberOfLines={2}>
            {isRevealed
              ? "Identity revealed! Chat is active until midnight"
              : item.lastMessage}
          </Text>

          {/* Status Row */}
          <View style={styles.statusRow}>
            <Ionicons
              name={isRevealed ? "time" : "checkmark-done"}
              size={14}
              color={isRevealed ? colors.accentTeal : colors.textSecondary}
            />
            <Text
              style={[styles.statusText, isRevealed && styles.statusTextActive]}
            >
              {isRevealed
                ? "Active • Expires at midnight"
                : item.timestamp.toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Right Indicator */}
        <View style={styles.rightIndicator}>
          {isRevealed && <View style={styles.notificationDot} />}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              isRevealed ? colors.accentPurple : "rgba(255, 255, 255, 0.3)"
            }
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.fullScreenContainer}>
      <GradientBackground gradient="midnight">
        <TopHeader />
        {/* Header - Rounded gradient matching Settings */}
        <LinearGradient
          colors={["rgba(0,0,0,0.9)", "#070319", "#1C0E3C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.roundedHeader, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.headerInnerLeft}>
            <Text style={styles.title}>Matches</Text>
            <Text style={styles.subtitle}>Your secret connections</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View
          style={[
            styles.container,
            {
              paddingTop: (insets.top || 0) + 110,
              paddingHorizontal: Math.max(16, insets.left + 4),
            },
          ]}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <LinearGradient
              colors={["rgba(139, 92, 246, 0.12)", "rgba(236, 72, 153, 0.12)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoGradient}
            >
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="timer-outline" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>How it works</Text>
                  <Text style={styles.infoText}>
                    Chat until midnight • End conversation anytime you want
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accentPurple} />
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : visibleChats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubbles-outline"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No active chats</Text>
              <Text style={styles.emptyText}>
                When you reveal identities with your matches, chats will appear
                here!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={visibleChats}
              keyExtractor={(item) => item.id}
              renderItem={renderChatItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </GradientBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 100,
  },
  infoCard: {
    marginBottom: 20,
  },
  infoGradient: {
    borderRadius: 16,
    padding: isSmallScreen ? 14 : 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.25)",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconWrapper: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 10 : 12,
    backgroundColor: "rgba(139, 92, 246, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 12 : 13,
    lineHeight: isSmallScreen ? 17 : 18,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: isSmallScreen ? 14 : 16,
    paddingHorizontal: isSmallScreen ? 16 : 18,
    backgroundColor: "rgba(6, 0, 18, 0.75)",
    borderRadius: 20,
    marginBottom: isSmallScreen ? 10 : 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  chatItemRevealed: {
    borderColor: "rgba(139, 92, 246, 0.4)",
    borderWidth: 2,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    shadowColor: colors.accentPurple,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarContainer: {
    position: "relative",
    marginRight: isSmallScreen ? 12 : 14,
  },
  avatar: {
    width: isSmallScreen ? 52 : 58,
    height: isSmallScreen ? 52 : 58,
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: "rgba(139, 92, 246, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  avatarRevealed: {
    backgroundColor: colors.accentPurple,
    borderColor: colors.accentPurple,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: "700",
  },
  onlineIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: isSmallScreen ? 14 : 16,
    height: isSmallScreen ? 14 : 16,
    borderRadius: isSmallScreen ? 7 : 8,
    backgroundColor: colors.accentTeal,
    borderWidth: 2.5,
    borderColor: "rgba(6, 0, 18, 0.9)",
    shadowColor: colors.accentTeal,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  chatInfo: {
    flex: 1,
    gap: isSmallScreen ? 6 : 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 16 : 17,
    fontWeight: "600",
    flex: 1,
    letterSpacing: -0.3,
  },
  chatNameRevealed: {
    color: colors.accentPurple,
    fontWeight: "700",
  },
  revealedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: isSmallScreen ? 8 : 10,
    paddingVertical: isSmallScreen ? 4 : 5,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.35)",
  },
  revealedBadgeText: {
    fontSize: isSmallScreen ? 9 : 10,
    color: "#8B5CF6",
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  lastMessage: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 13 : 14,
    lineHeight: isSmallScreen ? 18 : 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 11 : 12,
  },
  statusTextActive: {
    color: colors.accentTeal,
    fontWeight: "600",
  },
  rightIndicator: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginLeft: 8,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 20,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  roundedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerInnerLeft: {
    flexDirection: "column",
  },
  headerSpacer: {
    width: 44,
  },
});
