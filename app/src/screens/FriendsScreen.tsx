import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  ScrollView,
  Modal,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { GradientBackground } from "../components/GradientBackground";
import { TopHeader } from "../components/TopHeader";
import { ReportModal } from "../components/ReportModal";
import { BlockConfirmModal } from "../components/BlockConfirmModal";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

/**
 * FriendsScreen - Manage your SecretBuddy connections
 *
 * Friend System Logic:
 * - Friends are for adding and managing your network of connections
 * - Only ONE friend can be paired at a time for anonymous chatting
 * - You don't know who you're paired with until identity is revealed
 * - This screen is purely for friend management, not for knowing pairing status
 * - The objective is to build and manage your friend network for future pairings
 *
 * Friend Status:
 * - friend: Confirmed friend (available for pairing)
 * - pending_sent: You sent them a friend request
 * - pending_received: They sent you a friend request (accept/decline)
 * - none: No connection yet (can send friend request)
 */

type Friend = {
  id: string;
  name: string;
  username: string;
  country: string;
  status: "friend" | "pending_sent" | "pending_received" | "none";
  avatar?: string;
  initials: string;
  lastActive?: string;
  bio?: string;
};

export const FriendsScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const scrollRef = useRef<ScrollView>(null);
  const wasFocusedRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([
    {
      id: "1",
      name: "Alice",
      username: "alice_cooper",
      country: "United States",
      status: "friend",
      initials: "A",
      lastActive: "2 hours ago",
      bio: "Love mystery adventures and coffee ☕ Always up for a good chat!",
    },
    {
      id: "2",
      name: "Bob",
      username: "bob_smith",
      country: "Canada",
      status: "pending_sent",
      initials: "B",
      lastActive: "1 day ago",
      bio: "Photographer and travel enthusiast 📸 Exploring the world one mystery at a time.",
    },
    {
      id: "3",
      name: "Charlie",
      username: "charlie_brown",
      country: "United Kingdom",
      status: "pending_received",
      initials: "C",
      lastActive: "3 hours ago",
      bio: "Book lover and puzzle solver 📚 Let's discover secrets together!",
    },
    {
      id: "4",
      name: "Diana",
      username: "diana_prince",
      country: "Australia",
      status: "friend",
      initials: "D",
      lastActive: "Active now",
      bio: "Mystery enthusiast and nature lover 🌿 Always ready for adventure!",
    },
    {
      id: "5",
      name: "Emma",
      username: "emma_watson",
      country: "France",
      status: "friend",
      initials: "E",
      lastActive: "15 min ago",
      bio: "Art student with a passion for creativity 🎨 Let's create beautiful mysteries!",
    },
    {
      id: "6",
      name: "Frank",
      username: "frank_ocean",
      country: "Germany",
      status: "friend",
      initials: "F",
      lastActive: "1 hour ago",
      bio: "Music producer and mystery solver 🎵 Life is a beautiful enigma.",
    },
    {
      id: "7",
      name: "Grace",
      username: "grace_hopper",
      country: "Japan",
      status: "pending_received",
      initials: "G",
      lastActive: "30 min ago",
      bio: "Tech enthusiast and coding wizard 💻 Debugging mysteries one line at a time!",
    },
    {
      id: "8",
      name: "Henry",
      username: "henry_ford",
      country: "Brazil",
      status: "friend",
      initials: "H",
      lastActive: "5 hours ago",
      bio: "Engineer and innovation lover ⚙️ Building the future, solving mysteries!",
    },
    {
      id: "9",
      name: "Ivy",
      username: "ivy_league",
      country: "Spain",
      status: "pending_sent",
      initials: "I",
      lastActive: "2 days ago",
      bio: "Academic and knowledge seeker 📖 Every mystery is a lesson waiting to be learned.",
    },
    {
      id: "10",
      name: "Jack",
      username: "jack_frost",
      country: "Norway",
      status: "friend",
      initials: "J",
      lastActive: "Just now",
      bio: "Winter sports enthusiast and adventurer ❄️ Chillin' and solving mysteries!",
    },
  ]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);

  // Calculate statistics
  const friendsList = friends.filter((f) => f.status === "friend");
  const receivedRequests = friends.filter(
    (f) => f.status === "pending_received"
  );
  const sentRequests = friends.filter((f) => f.status === "pending_sent");

  // Only show received requests in the main list
  const pendingRequests = receivedRequests;

  // Limit display for "see more" functionality
  const maxDisplayItems = 4;
  const displayedFriends = showAllFriends
    ? friendsList
    : friendsList.slice(0, maxDisplayItems);
  const displayedRequests = showAllRequests
    ? pendingRequests
    : pendingRequests.slice(0, maxDisplayItems);

  useEffect(() => {
    if (searchQuery.trim()) {
      // Mock search results
      setSearchResults([
        {
          id: "4",
          name: "Diana",
          username: "diana_prince",
          country: "Australia",
          status: "none",
          initials: "D",
        },
        {
          id: "5",
          name: "Eve",
          username: "eve_online",
          country: "Sweden",
          status: "none",
          initials: "E",
        },
      ]);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      if (wasFocusedRef.current && isFocused) {
        // User tapped the tab again, scroll to top
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
      wasFocusedRef.current = isFocused;
    }, [isFocused])
  );

  const handleImportContacts = () => {
    Alert.alert(
      "Import Contacts",
      "This will access your contacts to find friends on SecretBuddy. Allow permission?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Allow",
          onPress: () => {
            // Mock importing contacts
            Alert.alert("Success", "Contacts imported! Found 3 friends.");
            setFriends([
              ...friends,
              {
                id: "6",
                name: "Frank",
                username: "frank_ocean",
                country: "Germany",
                status: "friend",
                initials: "F",
                lastActive: "5 min ago",
              },
              {
                id: "7",
                name: "Grace",
                username: "grace_hopper",
                country: "Japan",
                status: "pending_sent",
                initials: "G",
                lastActive: "1 hour ago",
              },
            ]);
          },
        },
      ]
    );
  };

  const handleSendRequest = (friend: Friend) => {
    // Mock sending request
    Alert.alert("Request Sent", `Friend request sent to ${friend.name}!`);
    setSearchResults(searchResults.filter((f) => f.id !== friend.id));
  };

  const handleFriendPress = (friend: Friend) => {
    setSelectedFriend(friend);
    setProfileModalVisible(true);
  };

  const closeProfileModal = () => {
    setProfileModalVisible(false);
    setSelectedFriend(null);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "friend":
        return "You're friends";
      case "pending_received":
        return "Pending request";
      case "pending_sent":
        return "Request sent";
      default:
        return "Not connected";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "friend":
        return colors.accentTeal;
      case "pending_received":
        return colors.accentPurple;
      case "pending_sent":
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.friendCard}
      onPress={() => handleFriendPress(item)}
    >
      <LinearGradient
        colors={["rgba(6, 0, 18, 0.9)", "rgba(11, 5, 32, 0.8)"]}
        style={styles.friendCardGradient}
      >
        <View style={styles.friendInfo}>
          <View style={styles.friendAvatar}>
            <Text style={styles.friendInitials}>{item.initials}</Text>
          </View>
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.name}</Text>
            <Text style={styles.friendUsername}>@{item.username}</Text>
            <Text style={styles.friendStatus}>
              {item.status === "friend"
                ? `Last active ${item.lastActive}`
                : item.status === "pending_sent"
                ? "Request sent"
                : "Friend request"}
            </Text>
          </View>
        </View>
        <View style={styles.friendActions}>
          {item.status === "friend" ? (
            <TouchableOpacity style={styles.friendActionButton}>
              <Ionicons
                name="person-outline"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ) : item.status === "pending_received" ? (
            <View style={styles.pendingActions}>
              <TouchableOpacity style={styles.acceptIconButton}>
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={colors.accentTeal}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineIconButton}>
                <Ionicons name="close" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.pendingButton}>
              <Ionicons
                name="time-outline"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderStatCard = (title: string, count: number, color: string) => (
    <View style={styles.statCard}>
      <Text style={[styles.statNumber, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );

  const renderSeeMoreButton = (
    show: boolean,
    setShow: (value: boolean) => void,
    currentCount: number,
    totalCount: number
  ) => {
    if (totalCount <= maxDisplayItems) return null;

    return (
      <TouchableOpacity
        style={styles.seeMoreButton}
        onPress={() => setShow(!show)}
      >
        <Text style={styles.seeMoreText}>
          {show ? "Show Less" : `See ${totalCount - currentCount} More`}
        </Text>
        <Ionicons
          name={show ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.accentPurple}
        />
      </TouchableOpacity>
    );
  };

  const renderSearchResult = ({ item }: { item: Friend }) => (
    <TouchableOpacity style={styles.searchResultCard}>
      <LinearGradient
        colors={["rgba(11, 5, 32, 0.9)", "rgba(6, 0, 18, 0.8)"]}
        style={styles.friendCardGradient}
      >
        <View style={styles.friendInfo}>
          <View style={styles.friendAvatar}>
            <Text style={styles.friendInitials}>{item.initials}</Text>
          </View>
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.name}</Text>
            <Text style={styles.friendStatus}>Available to add as friend</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleSendRequest(item)}
        >
          <Ionicons name="add" size={21} color={colors.textPrimary} />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <GradientBackground gradient="midnight">
      <TopHeader />
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Friends</Text>
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={handleImportContacts}
            >
              <Ionicons
                name="person-add-outline"
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* Statistics Row */}
          <View style={styles.statsContainer}>
            {renderStatCard("Friends", friendsList.length, colors.textPrimary)}
            {renderStatCard(
              "Requests",
              receivedRequests.length,
              colors.textPrimary
            )}
            {renderStatCard("Sent", sentRequests.length, colors.textPrimary)}
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search for friends"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {searchQuery.trim() ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search Results</Text>
              {searchResults.map((item) => (
                <View key={item.id}>{renderSearchResult({ item })}</View>
              ))}
              {searchResults.length === 0 && (
                <Text style={styles.emptyText}>No users found</Text>
              )}
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Your Friends ({friendsList.length})
                </Text>
                {displayedFriends.map((item) => (
                  <View key={item.id}>{renderFriend({ item })}</View>
                ))}
                {friendsList.length === 0 && (
                  <Text style={styles.emptyText}>No friends yet</Text>
                )}
                {renderSeeMoreButton(
                  showAllFriends,
                  setShowAllFriends,
                  displayedFriends.length,
                  friendsList.length
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Friend Requests ({pendingRequests.length})
                </Text>
                {displayedRequests.map((item) => (
                  <View key={item.id}>{renderFriend({ item })}</View>
                ))}
                {pendingRequests.length === 0 && (
                  <Text style={styles.emptyText}>No pending requests</Text>
                )}
                {renderSeeMoreButton(
                  showAllRequests,
                  setShowAllRequests,
                  displayedRequests.length,
                  pendingRequests.length
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={closeProfileModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeProfileModal}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            {selectedFriend && (
              <>
                <View style={styles.profileModalContent}>
                  <View style={styles.profileAvatarLarge}>
                    <Text style={styles.profileAvatarTextLarge}>
                      {selectedFriend.initials}
                    </Text>
                  </View>

                  <Text style={styles.profileNameLarge}>
                    {selectedFriend.name}
                  </Text>
                  <Text style={styles.profileUsernameLarge}>
                    @{selectedFriend.username}
                  </Text>

                  <View style={styles.profileInfoCard}>
                    <View style={styles.profileInfoRow}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.profileCountryText}>
                        {selectedFriend.country}
                      </Text>
                    </View>
                  </View>

                  {selectedFriend.bio && (
                    <View style={styles.bioCard}>
                      <View style={styles.bioHeader}>
                        <Ionicons
                          name="document-text-outline"
                          size={20}
                          color={colors.accentPurple}
                        />
                        <Text style={styles.bioTitle}>About</Text>
                      </View>
                      <Text style={styles.bioText}>{selectedFriend.bio}</Text>
                    </View>
                  )}

                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            getStatusColor(selectedFriend.status) + "20",
                          borderColor:
                            getStatusColor(selectedFriend.status) + "60",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(selectedFriend.status) },
                        ]}
                      >
                        {getStatusText(selectedFriend.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Safety Actions */}
                  <View style={styles.safetyActionsContainer}>
                    <TouchableOpacity
                      style={styles.reportButton}
                      onPress={() => {
                        setReportModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="flag-outline"
                        size={20}
                        color={colors.danger}
                      />
                      <Text style={styles.reportButtonText}>Report User</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.blockButton}
                      onPress={() => {
                        setBlockModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="ban-outline"
                        size={20}
                        color={colors.danger}
                      />
                      <Text style={styles.blockButtonText}>Block User</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={async (category, description) => {
          // TODO: Implement Firebase report submission
          console.log("Report submitted:", {
            userId: selectedFriend?.id,
            category,
            description,
          });
        }}
        reportType="user"
        targetName={selectedFriend?.name}
      />

      {/* Block Confirm Modal */}
      <BlockConfirmModal
        visible={blockModalVisible}
        onClose={() => setBlockModalVisible(false)}
        onConfirm={async (reason) => {
          // TODO: Implement Firebase block logic
          console.log("User blocked:", {
            userId: selectedFriend?.id,
            reason,
          });
          // Remove from friends list after blocking
          if (selectedFriend) {
            setFriends(friends.filter((f) => f.id !== selectedFriend.id));
          }
          setBlockModalVisible(false);
          closeProfileModal();
        }}
        userName={selectedFriend?.name || "User"}
      />
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 100, // Extra space for bottom navigation
  },

  container: {
    padding: 16,
    gap: 16,
    paddingTop: 100,
    minHeight: "100%",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  title: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  inviteButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(156, 107, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(156, 107, 255, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(156, 107, 255, 0.5)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  searchInput: {
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "rgba(156, 107, 255, 0.25)",
    backgroundColor: "rgba(6, 0, 18, 0.9)",
    paddingHorizontal: 22,
    paddingVertical: 16,
    color: colors.textPrimary,
    ...typography.body,
    fontSize: 16,
    shadowColor: "rgba(0, 0, 0, 0.4)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  section: {
    gap: 8,
  },

  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    paddingHorizontal: 4,
    letterSpacing: 0.3,
  },

  // Friend Card Styles
  friendCard: {
    borderRadius: 24,
    marginBottom: 4,
    overflow: "hidden",
    shadowColor: "rgba(0, 0, 0, 0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(11, 5, 32, 0.95)",
  },

  friendCardGradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  searchResultCard: {
    borderRadius: 24,
    marginBottom: 4,
    overflow: "hidden",
    shadowColor: "rgba(0, 0, 0, 0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(11, 5, 32, 0.95)",
  },

  // Friend Info Styles
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },

  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "rgba(156, 107, 255, 0.6)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },

  friendInitials: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },

  friendDetails: {
    flex: 1,
    gap: 4,
  },

  friendName: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 2,
  },

  friendUsername: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.7,
    marginBottom: 6,
  },

  friendStatus: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    opacity: 0.85,
  },

  // Action Button Styles
  friendActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  friendActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  pendingActions: {
    flexDirection: "row",
    gap: 10,
  },

  acceptIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(46, 230, 169, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46, 230, 169, 0.3)",
    shadowColor: "rgba(46, 230, 169, 0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },

  declineIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 107, 138, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 138, 0.3)",
    shadowColor: "rgba(255, 107, 138, 0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },

  pendingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(185, 177, 234, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(185, 177, 234, 0.3)",
    shadowColor: "rgba(185, 177, 234, 0.3)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  addButton: {
    width: 42,
    height: 42,
    backgroundColor: colors.accentPurple,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(156, 107, 255, 0.6)",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 7,
    borderWidth: 1.5,
    borderColor: "rgba(156, 107, 255, 0.5)",
  },

  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 40,
    fontSize: 16,
    opacity: 0.7,
    lineHeight: 24,
  },

  // Statistics Styles
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  statNumber: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 2,
  },

  statLabel: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // See More Button Styles
  seeMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(156, 107, 255, 0.1)",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.2)",
    gap: 6,
  },

  seeMoreText: {
    color: colors.accentPurple,
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalContainer: {
    backgroundColor: "rgba(6, 0, 18, 0.95)",
    borderRadius: 32,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.3)",
    shadowColor: "rgba(156, 107, 255, 0.4)",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 20,
  },

  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  profileModalContent: {
    alignItems: "center",
    gap: 16,
    marginTop: 20,
  },

  profileAvatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "rgba(156, 107, 255, 0.5)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 8,
  },

  profileAvatarTextLarge: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: "900",
  },

  profileNameLarge: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  profileUsernameLarge: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.8,
    marginTop: -8,
  },

  profileInfoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginTop: 8,
  },

  profileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
  },

  profileCountryText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  statusContainer: {
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },

  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },

  statusText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Bio Card Styles
  bioCard: {
    backgroundColor: "rgba(156, 107, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.2)",
    marginTop: 8,
  },

  bioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  bioTitle: {
    ...typography.subtitle,
    color: colors.accentPurple,
    fontSize: 16,
    fontWeight: "700",
  },

  bioText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },

  // Safety Actions Styles
  safetyActionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    width: "100%",
  },

  reportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 107, 138, 0.1)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 138, 0.3)",
  },

  reportButtonText: {
    ...typography.body,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },

  blockButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 107, 138, 0.1)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 138, 0.3)",
  },

  blockButtonText: {
    ...typography.body,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
});
