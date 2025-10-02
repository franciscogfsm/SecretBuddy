import { useState, useEffect, useRef } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";

import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GradientBackground } from "../components/GradientBackground";
import { TopHeader } from "../components/TopHeader";
import { colors, typography } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 375;

type ChatItem = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  expired: boolean;
  avatarInitial: string;
};

const dummyChats: ChatItem[] = [
  {
    id: "1",
    name: "Neon Fox",
    lastMessage: "Sounds perfect! We should plan a sunset walk sometime ✨",
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    expired: false,
    avatarInitial: "N",
  },
  {
    id: "2",
    name: "Blue Whale",
    lastMessage: "That sounds like a great idea! �",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    expired: true,
    avatarInitial: "B",
  },
  {
    id: "3",
    name: "Green Gecko",
    lastMessage: "Haha, it was such a beautiful evening!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    expired: true,
    avatarInitial: "G",
  },
  {
    id: "4",
    name: "Red Panda",
    lastMessage: "Thanks! That sunset video was amazing 🌅",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    expired: true,
    avatarInitial: "R",
  },
  {
    id: "5",
    name: "Yellow Yak",
    lastMessage: "Hey! I loved your response to today's prompt 😊",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    expired: true,
    avatarInitial: "Y",
  },
  {
    id: "6",
    name: "Purple Parrot",
    lastMessage: "From my balcony! The view is incredible at that time",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
    expired: true,
    avatarInitial: "P",
  },
  {
    id: "7",
    name: "Orange Owl",
    lastMessage:
      "Haha, it was such a beautiful evening! Where did you capture that?",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    expired: true,
    avatarInitial: "O",
  },
  {
    id: "8",
    name: "Pink Flamingo",
    lastMessage: "Thanks! That sunset video was amazing 🌅",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
    expired: true,
    avatarInitial: "F",
  },
  {
    id: "9",
    name: "Silver Swan",
    lastMessage: "Sounds perfect! We should plan a sunset walk sometime ✨",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    expired: true,
    avatarInitial: "S",
  },
  {
    id: "10",
    name: "Gold Goose",
    lastMessage: "That sounds like a great idea! 🌟",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
    expired: true,
    avatarInitial: "G",
  },
];

export const MatchesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<ChatItem[]>(dummyChats);
  const flatListRef = useRef<FlatList>(null);

  // Scroll to top whenever screen comes into focus
  useFocusEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  });

  // Filter out the last 7 expired chats
  const visibleChats = chats
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .filter((chat, index) => !(chat.expired && index < 7));

  const handleChatPress = (chat: ChatItem) => {
    // Only the first non-expired chat is timed
    const isTimed =
      !chat.expired && visibleChats.findIndex((c) => c.id === chat.id) === 0;
    (navigation as any).navigate("Chat", { isTimed });
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    const isRevealed =
      !item.expired && visibleChats.findIndex((c) => c.id === item.id) === 0;

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
        <View
          style={[
            styles.container,
            {
              paddingTop: insets.top + 20,
              paddingHorizontal: Math.max(16, insets.left + 4),
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Matches</Text>
            <Text style={styles.subtitle}>Your secret connections</Text>
          </View>

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

          <FlatList
            ref={flatListRef}
            data={visibleChats}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
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
});
