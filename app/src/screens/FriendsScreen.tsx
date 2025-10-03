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
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, query, where, onSnapshot, or } from "firebase/firestore";

import { GradientBackground } from "../components/GradientBackground";
import { TopHeader } from "../components/TopHeader";
import { ReportModal } from "../components/ReportModal";
import { BlockConfirmModal } from "../components/BlockConfirmModal";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";
import { db } from "../config/firebase";
import {
  searchUsersByUsername,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getUserFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
  removeFriend,
  blockUser,
  type FriendProfile,
} from "../services/friendService";
import { getUserProfile } from "../services/userService";
import { getCountryFlag } from "../utils/countryFlags";

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

export const FriendsScreen = () => {
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const scrollRef = useRef<ScrollView>(null);
  const wasFocusedRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(
    null
  );
  const [selectedFriendPrivacy, setSelectedFriendPrivacy] = useState<any>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);

  // Real data from backend
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendProfile[]>([]);
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Limit display for "see more" functionality
  const maxDisplayItems = 4;
  const displayedFriends = showAllFriends
    ? friends
    : friends.slice(0, maxDisplayItems);
  const displayedRequests = showAllRequests
    ? pendingRequests
    : pendingRequests.slice(0, maxDisplayItems);

  // Clear search when leaving the screen
  useEffect(() => {
    if (!isFocused) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isFocused]);

  // Real-time listener for friend requests and friendships
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Listen to friendships where user is involved
    const friendshipsQuery = query(
      collection(db, "friendships"),
      where("userId1", "==", user.uid)
    );

    const friendshipsQuery2 = query(
      collection(db, "friendships"),
      where("userId2", "==", user.uid)
    );

    const unsubscribe1 = onSnapshot(friendshipsQuery, async () => {
      // Reload all friend data when any change occurs
      try {
        const [friendsData, receivedData, sentData] = await Promise.all([
          getUserFriends(user.uid),
          getPendingFriendRequests(user.uid),
          getSentFriendRequests(user.uid),
        ]);
        setFriends(friendsData);
        setPendingRequests(receivedData);
        setSentRequests(sentData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading friends data:", error);
        setLoading(false);
      }
    });

    const unsubscribe2 = onSnapshot(friendshipsQuery2, async () => {
      // Reload all friend data when any change occurs
      try {
        const [friendsData, receivedData, sentData] = await Promise.all([
          getUserFriends(user.uid),
          getPendingFriendRequests(user.uid),
          getSentFriendRequests(user.uid),
        ]);
        setFriends(friendsData);
        setPendingRequests(receivedData);
        setSentRequests(sentData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading friends data:", error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  // Search for users
  useEffect(() => {
    if (!user || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const search = async () => {
      try {
        setSearchLoading(true);
        const results = await searchUsersByUsername(
          searchQuery.trim(),
          user.uid
        );
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setSearchLoading(false);
      }
    };

    const timer = setTimeout(search, 300); // Debounce
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

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
            // In real app, this would call the friend service
            // For now, just show the alert
          },
        },
      ]
    );
  };

  const handleSendRequest = async (friend: FriendProfile) => {
    if (!user || actionLoading) return;
    try {
      setActionLoading(true);
      await sendFriendRequest(user.uid, friend.uid);
      Alert.alert(
        "Request Sent",
        `Friend request sent to ${friend.username || friend.displayName}!`
      );
      setSearchResults(searchResults.filter((f) => f.uid !== friend.uid));
      // Refresh sent requests
      const sentData = await getSentFriendRequests(user.uid);
      setSentRequests(sentData);
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async (friend: FriendProfile) => {
    if (!user || !friend.friendshipId || actionLoading) return;
    try {
      setActionLoading(true);
      await acceptFriendRequest(friend.friendshipId, user.uid);
      // Refresh all lists
      const [friendsData, receivedData] = await Promise.all([
        getUserFriends(user.uid),
        getPendingFriendRequests(user.uid),
      ]);
      setFriends(friendsData);
      setPendingRequests(receivedData);
    } catch (error) {
      console.error("Error accepting friend request:", error);
      Alert.alert(
        "Error",
        "Failed to accept friend request. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineRequest = async (friend: FriendProfile) => {
    if (!user || !friend.friendshipId || actionLoading) return;
    try {
      setActionLoading(true);
      await declineFriendRequest(friend.friendshipId);
      // Refresh pending requests
      const receivedData = await getPendingFriendRequests(user.uid);
      setPendingRequests(receivedData);
    } catch (error) {
      console.error("Error declining friend request:", error);
      Alert.alert(
        "Error",
        "Failed to decline friend request. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleFriendPress = async (friend: FriendProfile) => {
    setSelectedFriend(friend);
    setProfileModalVisible(true);

    // Load full user profile with privacy settings
    try {
      const fullProfile = await getUserProfile(friend.uid);
      // @ts-ignore - privacySettings will be added to UserProfile type
      setSelectedFriendPrivacy(fullProfile?.privacySettings || {});
    } catch (error) {
      console.error("Error loading friend profile:", error);
      setSelectedFriendPrivacy({});
    }
  };

  const closeProfileModal = () => {
    setProfileModalVisible(false);
    setSelectedFriend(null);
    setSelectedFriendPrivacy(null);
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "friend":
        return "You're friends";
      case "pending_received":
        return "Pending request";
      case "pending_sent":
        return "Request sent";
      case "blocked":
        return "Blocked";
      default:
        return "Not connected";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "friend":
        return colors.accentTeal;
      case "pending_received":
        return colors.accentPurple;
      case "pending_sent":
        return colors.textSecondary;
      case "blocked":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const renderFriend = ({ item }: { item: FriendProfile }) => {
    const initials = item.displayName
      ? item.displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "?";

    return (
      <TouchableOpacity
        style={styles.friendCard}
        onPress={() => handleFriendPress(item)}
      >
        <LinearGradient
          colors={["rgba(11, 5, 32, 0.9)", "rgba(6, 0, 18, 0.8)"]}
          style={styles.friendCardGradient}
        >
          <View style={styles.friendAvatar}>
            {item.profilePhotoUrl ? (
              <Image
                source={{ uri: item.profilePhotoUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.friendInitials}>{initials}</Text>
            )}
          </View>

          <View style={styles.friendInfoColumn}>
            <Text style={styles.friendName}>{item.displayName}</Text>
            <Text style={styles.friendUsername}>
              @{item.username || "user"}
            </Text>
            <Text style={styles.friendCountry}>
              {item.country || "Unknown"}
            </Text>
          </View>

          <View style={styles.friendActions}>
            {item.friendshipStatus === "blocked" && (
              <View style={styles.blockedBadge}>
                <Ionicons name="ban" size={16} color={colors.error} />
                <Text style={styles.blockedText}>Blocked</Text>
              </View>
            )}
            {item.friendshipStatus === "pending_received" && (
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={styles.acceptIconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleAcceptRequest(item);
                  }}
                  disabled={actionLoading}
                >
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={colors.accentTeal}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineIconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeclineRequest(item);
                  }}
                  disabled={actionLoading}
                >
                  <Ionicons name="close" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
            {item.friendshipStatus === "friend" && (
              <TouchableOpacity
                style={styles.removeFriendButton}
                onPress={(e) => {
                  e.stopPropagation();
                  Alert.alert(
                    "Remove Friend",
                    `Remove ${item.displayName} from your friends?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: async () => {
                          if (user && item.friendshipId) {
                            try {
                              setActionLoading(true);
                              await removeFriend(
                                item.friendshipId,
                                user.uid,
                                item.uid
                              );
                              // Refresh friends list
                              const friendsData = await getUserFriends(
                                user.uid
                              );
                              setFriends(friendsData);
                            } catch (error) {
                              console.error("Error removing friend:", error);
                              Alert.alert("Error", "Failed to remove friend");
                            } finally {
                              setActionLoading(false);
                            }
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons
                  name="person-remove-outline"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

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

  const renderSearchResult = ({ item }: { item: FriendProfile }) => {
    const initials = item.displayName
      ? item.displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "?";

    const canSendRequest = item.friendshipStatus === "none";

    return (
      <TouchableOpacity style={styles.searchResultCard}>
        <LinearGradient
          colors={["rgba(11, 5, 32, 0.9)", "rgba(6, 0, 18, 0.8)"]}
          style={styles.friendCardGradient}
        >
          <View style={styles.friendInfo}>
            <View style={styles.friendAvatar}>
              {item.profilePhotoUrl ? (
                <Image
                  source={{ uri: item.profilePhotoUrl }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
              ) : (
                <Text style={styles.friendInitials}>{initials}</Text>
              )}
            </View>
            <View style={styles.friendDetails}>
              <Text style={styles.friendName}>{item.displayName}</Text>
              <Text style={styles.friendUsername}>
                @{item.username || "unknown"}
              </Text>
              <Text style={styles.friendStatus}>
                {item.country || "Unknown"}
              </Text>
            </View>
          </View>
          {canSendRequest && (
            <TouchableOpacity
              style={styles.addFriendButton}
              onPress={() => handleSendRequest(item)}
              disabled={actionLoading}
            >
              <Ionicons
                name="person-add"
                size={18}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          )}
          {item.friendshipStatus === "pending_sent" && (
            <View style={styles.pendingButton}>
              <Ionicons
                name="time-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

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
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.testChatButton}
                onPress={() => {
                  // Quick test button to chat with specific friend
                  navigation.navigate("Chat", {
                    conversationId: "test_conv_" + Date.now(),
                    matchedUserId: "u4FhcyXndsRiAjTK2VcC0dUhU643",
                    matchedUserName: "Test Friend",
                  });
                }}
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={20}
                  color={colors.accentTeal}
                />
                <Text style={styles.testChatText}>Test</Text>
              </TouchableOpacity>
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
          </View>

          {/* Statistics Row */}
          <View style={styles.statsContainer}>
            {renderStatCard("Friends", friends.length, colors.textPrimary)}
            {renderStatCard(
              "Requests",
              pendingRequests.length,
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
                <View key={item.uid}>{renderSearchResult({ item })}</View>
              ))}
              {searchResults.length === 0 && (
                <Text style={styles.emptyText}>No users found</Text>
              )}
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Your Friends ({friends.length})
                </Text>
                {displayedFriends.map((item) => (
                  <View key={item.uid}>{renderFriend({ item })}</View>
                ))}
                {friends.length === 0 && (
                  <Text style={styles.emptyText}>No friends yet</Text>
                )}
                {renderSeeMoreButton(
                  showAllFriends,
                  setShowAllFriends,
                  displayedFriends.length,
                  friends.length
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Friend Requests ({pendingRequests.length})
                </Text>
                {displayedRequests.map((item) => (
                  <View key={item.uid}>{renderFriend({ item })}</View>
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
                    {selectedFriend.profilePhotoUrl ? (
                      <Image
                        source={{ uri: selectedFriend.profilePhotoUrl }}
                        style={styles.profileAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.profileAvatarTextLarge}>
                        {selectedFriend.displayName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.profileNameLarge}>
                    {selectedFriend.displayName}
                  </Text>
                  <Text style={styles.profileUsernameLarge}>
                    @{selectedFriend.username || "user"}
                  </Text>

                  <View style={styles.profileInfoCard}>
                    <View style={styles.profileInfoRow}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.profileCountryText}>
                        {selectedFriend.country || "Unknown"}
                      </Text>
                    </View>

                    {/* Show age only if not restricted by privacy settings */}
                    {selectedFriendPrivacy &&
                      !selectedFriendPrivacy.hideAge && (
                        <View style={styles.profileInfoRow}>
                          <Ionicons
                            name="calendar-outline"
                            size={20}
                            color={colors.textSecondary}
                          />
                          <Text style={styles.profileCountryText}>
                            {selectedFriend.points
                              ? `${selectedFriend.points} points`
                              : "New user"}
                          </Text>
                        </View>
                      )}
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
                            getStatusColor(selectedFriend.friendshipStatus) +
                            "20",
                          borderColor:
                            getStatusColor(selectedFriend.friendshipStatus) +
                            "60",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: getStatusColor(
                              selectedFriend.friendshipStatus
                            ),
                          },
                        ]}
                      >
                        {getStatusText(selectedFriend.friendshipStatus)}
                      </Text>
                    </View>
                  </View>

                  {/* Safety Actions */}
                  <View style={styles.safetyActionsContainer}>
                    <TouchableOpacity
                      style={styles.reportButton}
                      onPress={() => {
                        setProfileModalVisible(false);
                        setTimeout(() => {
                          setReportModalVisible(true);
                        }, 300);
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
                        setProfileModalVisible(false);
                        setTimeout(() => {
                          setBlockModalVisible(true);
                        }, 300);
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
      {selectedFriend && user && (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          reportType="user"
          targetName={selectedFriend.displayName}
          reportedUserId={selectedFriend.uid}
          reportingUserId={user.uid}
        />
      )}

      {/* Block Confirm Modal */}
      <BlockConfirmModal
        visible={blockModalVisible}
        onClose={() => setBlockModalVisible(false)}
        onConfirm={async () => {
          // TODO: Implement Firebase block logic
          if (selectedFriend && user) {
            await blockUser(user.uid, selectedFriend.uid);
            // Remove from friends list after blocking
            setFriends(friends.filter((f) => f.uid !== selectedFriend.uid));
          }
          setBlockModalVisible(false);
          closeProfileModal();
        }}
        userName={selectedFriend?.displayName || "User"}
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

  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  testChatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(46, 230, 169, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(46, 230, 169, 0.4)",
    shadowColor: "rgba(46, 230, 169, 0.5)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  testChatText: {
    ...typography.body,
    color: colors.accentTeal,
    fontSize: 14,
    fontWeight: "700",
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
    marginBottom: 12,
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
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  searchResultCard: {
    borderRadius: 24,
    marginBottom: 12,
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

  friendInfoColumn: {
    flex: 1,
    gap: 4,
  },

  friendAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 18,
    fontWeight: "800",
  },

  friendDetails: {
    flex: 1,
    gap: 4,
  },

  friendName: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 2,
  },

  friendUsername: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.7,
  },

  friendCountry: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "400",
    opacity: 0.6,
    marginTop: 2,
  },

  friendStatus: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
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

  blockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },

  blockedText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 12,
    fontWeight: "600",
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
    overflow: "hidden",
  },

  profileAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
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

  // New renderFriend styles
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  friendMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
  },

  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },

  acceptBtn: {
    backgroundColor: colors.accentTeal + "20",
    borderWidth: 1,
    borderColor: colors.accentTeal + "60",
  },

  acceptBtnText: {
    ...typography.body,
    color: colors.accentTeal,
    fontSize: 13,
    fontWeight: "600",
  },

  declineBtn: {
    backgroundColor: colors.danger + "20",
    borderWidth: 1,
    borderColor: colors.danger + "60",
  },

  declineBtnText: {
    ...typography.body,
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },

  addFriendButton: {
    backgroundColor: colors.accentPurple + "30",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.accentPurple + "60",
  },

  removeFriendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});
