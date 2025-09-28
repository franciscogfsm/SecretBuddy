import { useState, useEffect, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useNavigation } from "@react-navigation/native";
import { GradientBackground } from "../components/GradientBackground";
import { colors, typography } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.avatarInitial}</Text>
          {isRevealed && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.chatName, isRevealed && styles.chatNameRevealed]}
            >
              {item.name}
            </Text>
            {isRevealed && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {isRevealed
              ? "Identity revealed! Tap to chat ✨"
              : item.lastMessage}
          </Text>
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleDateString()}
          </Text>
          {isRevealed && <View style={styles.notificationDot} />}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.fullScreenContainer}>
      <GradientBackground gradient="midnight">
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
          <FlatList
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
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(6, 0, 18, 0.72)",
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chatItemRevealed: {
    borderColor: colors.accentPurple,
    borderWidth: 2,
    backgroundColor: "rgba(156, 107, 255, 0.08)",
    shadowColor: colors.accentPurple,
    shadowOpacity: 0.2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 20,
  },
  onlineIndicator: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accentTeal,
    borderWidth: 2,
    borderColor: "rgba(6, 0, 18, 0.9)",
  },
  chatInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 18,
  },
  chatNameRevealed: {
    color: colors.accentPurple,
    fontWeight: "700",
  },
  urgentBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  urgentText: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  lastMessage: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  rightSection: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 60,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
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
