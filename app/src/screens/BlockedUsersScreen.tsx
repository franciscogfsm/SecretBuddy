import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";

import { GradientBackground } from "../components/GradientBackground";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 375;

type BlockedUser = {
  id: string;
  username: string;
  blockedDate: string;
  reason: string;
};

// Demo blocked users data
const initialBlockedUsers: BlockedUser[] = [
  {
    id: "1",
    username: "SecretUser#4582",
    blockedDate: "Sep 28, 2025",
    reason: "Inappropriate content",
  },
  {
    id: "2",
    username: "SecretUser#7823",
    blockedDate: "Sep 15, 2025",
    reason: "Harassment",
  },
];

export const BlockedUsersScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [blockedUsers, setBlockedUsers] =
    useState<BlockedUser[]>(initialBlockedUsers);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock ${user.username}? They will be able to contact you again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          style: "destructive",
          onPress: () => {
            setBlockedUsers((prev) => prev.filter((u) => u.id !== user.id));
            Alert.alert(
              "User Unblocked",
              `${user.username} has been unblocked.`
            );
          },
        },
      ]
    );
  };

  return (
    <GradientBackground gradient="midnight">
      {/* Header - Fixed at top */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <LinearGradient
            colors={["rgba(239, 68, 68, 0.15)", "rgba(236, 72, 153, 0.15)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoGradient}
          >
            <View style={styles.infoIconWrapper}>
              <Ionicons name="person-remove" size={28} color="#EF4444" />
            </View>
            <Text style={styles.infoTitle}>Managing Blocked Users</Text>
            <Text style={styles.infoText}>
              Blocked users cannot send you messages, view your profile, or
              match with you. You can unblock them at any time.
            </Text>
          </LinearGradient>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={styles.statIconWrapper}>
              <Ionicons name="people-outline" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{blockedUsers.length}</Text>
              <Text style={styles.statLabel}>Blocked Users</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={styles.statIconWrapper}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color="#10B981"
              />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>Active</Text>
              <Text style={styles.statLabel}>Protection Status</Text>
            </View>
          </View>
        </View>

        {/* Blocked Users List */}
        {blockedUsers.length > 0 ? (
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>
              {blockedUsers.length}{" "}
              {blockedUsers.length === 1 ? "User" : "Users"} Blocked
            </Text>

            {blockedUsers.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <Ionicons name="person" size={24} color="#EF4444" />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.username}</Text>
                    <View style={styles.userMeta}>
                      <Ionicons
                        name="calendar-outline"
                        size={12}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.userMetaText}>
                        Blocked on {user.blockedDate}
                      </Text>
                    </View>
                    <View style={styles.reasonBadge}>
                      <Ionicons name="warning" size={12} color="#F59E0B" />
                      <Text style={styles.reasonText}>{user.reason}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.unblockButton}
                  onPress={() => handleUnblock(user)}
                >
                  <Text style={styles.unblockButtonText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>No Blocked Users</Text>
            <Text style={styles.emptyText}>
              You haven't blocked anyone yet. When you block someone, they'll
              appear here.
            </Text>
          </View>
        )}

        {/* Footer Space */}
        <View style={styles.footerSpace} />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingTop: 20,
    paddingBottom: 100,
  },

  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "rgba(6, 0, 18, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },

  headerTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  headerSpacer: {
    width: 44,
  },

  // Info Card
  infoCard: {
    marginBottom: isSmallScreen ? 16 : 20,
  },

  infoGradient: {
    borderRadius: 24,
    padding: isSmallScreen ? 20 : 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },

  infoIconWrapper: {
    width: isSmallScreen ? 56 : 64,
    height: isSmallScreen ? 56 : 64,
    borderRadius: isSmallScreen ? 28 : 32,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: isSmallScreen ? 12 : 16,
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },

  infoTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: "700",
    marginBottom: isSmallScreen ? 8 : 10,
    textAlign: "center",
  },

  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 13 : 14,
    lineHeight: isSmallScreen ? 19 : 21,
    textAlign: "center",
    paddingHorizontal: isSmallScreen ? 8 : 12,
  },

  // Stats Card
  statsCard: {
    flexDirection: "row",
    backgroundColor: "rgba(6, 0, 18, 0.7)",
    borderRadius: 20,
    padding: isSmallScreen ? 18 : 20,
    marginBottom: isSmallScreen ? 20 : 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallScreen ? 10 : 12,
  },

  statIconWrapper: {
    width: isSmallScreen ? 44 : 48,
    height: isSmallScreen ? 44 : 48,
    borderRadius: isSmallScreen ? 12 : 14,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  statContent: {
    flex: 1,
  },

  statValue: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: "800",
    marginBottom: 2,
  },

  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 11 : 12,
  },

  statDivider: {
    width: 1,
    height: "70%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: isSmallScreen ? 12 : 16,
  },

  // List Container
  listContainer: {
    gap: isSmallScreen ? 10 : 12,
  },

  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "700",
    marginBottom: isSmallScreen ? 8 : 12,
    marginLeft: 4,
  },

  // User Card
  userCard: {
    backgroundColor: "rgba(6, 0, 18, 0.7)",
    borderRadius: 20,
    padding: isSmallScreen ? 14 : 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  userInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: isSmallScreen ? 12 : 14,
  },

  userAvatar: {
    width: isSmallScreen ? 48 : 56,
    height: isSmallScreen ? 48 : 56,
    borderRadius: isSmallScreen ? 14 : 16,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: isSmallScreen ? 12 : 14,
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },

  userDetails: {
    flex: 1,
  },

  userName: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: "600",
    marginBottom: 6,
  },

  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },

  userMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 12 : 13,
  },

  reasonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },

  reasonText: {
    ...typography.caption,
    color: "#F59E0B",
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: "600",
  },

  unblockButton: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderRadius: 14,
    paddingVertical: isSmallScreen ? 10 : 12,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },

  unblockButtonText: {
    ...typography.subtitle,
    color: "#8B5CF6",
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: "600",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: isSmallScreen ? 48 : 64,
    paddingHorizontal: isSmallScreen ? 24 : 32,
  },

  emptyIconWrapper: {
    width: isSmallScreen ? 96 : 120,
    height: isSmallScreen ? 96 : 120,
    borderRadius: isSmallScreen ? 48 : 60,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: isSmallScreen ? 20 : 24,
    borderWidth: 2,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },

  emptyTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: "700",
    marginBottom: isSmallScreen ? 10 : 12,
    textAlign: "center",
  },

  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 14 : 15,
    lineHeight: isSmallScreen ? 20 : 22,
    textAlign: "center",
    maxWidth: 280,
  },

  footerSpace: {
    height: 20,
  },
});
