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
  Share,
  KeyboardAvoidingView,
  Platform,
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
import {
  getFriendSuggestions,
  invalidateSuggestionsCache,
  type FriendSuggestion,
} from "../services/friendSuggestionsService";
import SuggestionCard from "../components/SuggestionCard";

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
  const [selectedReportTarget, setSelectedReportTarget] =
    useState<FriendProfile | null>(null);
  const [selectedBlockTarget, setSelectedBlockTarget] =
    useState<FriendProfile | null>(null);

  // Cache for profile data to reduce API calls
  const profileCacheRef = useRef<Record<string, any>>({});

  // Real data from backend
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendProfile[]>([]);
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);

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

  // Real-time listener for friend requests and friendships (optimized)
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Use a debounce to avoid rapid successive API calls
    let timeoutId: NodeJS.Timeout;

    const loadFriendData = async () => {
      try {
        // Use cached data from friendService (30-minute TTL)
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
    };

    // Listen to friendships where user is involved
    const friendshipsQuery = query(
      collection(db, "friendships"),
      or(where("userId1", "==", user.uid), where("userId2", "==", user.uid))
    );

    const unsubscribe = onSnapshot(friendshipsQuery, () => {
      // Debounce to avoid rapid successive calls
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        loadFriendData();
      }, 500); // Wait 500ms before loading data
    });

    // Initial load
    loadFriendData();

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [user]);

  // Load friend suggestions
  useEffect(() => {
    if (!user) return;

    const loadSuggestions = async () => {
      try {
        console.log("🔍 Loading friend suggestions...");
        setSuggestionsLoading(true);
        const suggestions = await getFriendSuggestions(user.uid, false); // Use real suggestions
        console.log("📋 Got suggestions:", suggestions.length);
        setSuggestions(suggestions);
      } catch (error) {
        console.error("Error loading suggestions:", error);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    loadSuggestions();
  }, [user]); // Load once when user is available

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

  const handleShareUsername = async () => {
    if (!user) return;

    try {
      // Get the user's profile to fetch their username
      const profile = await getUserProfile(user.uid);
      const username = profile?.username || "unknown";

      const shareMessage = `Hey! Add me on SecretBuddy! 🎭\n\nMy username: @${username}\n\nDownload SecretBuddy and connect with me anonymously!`;

      await Share.share({
        message: shareMessage,
        title: "Add me on SecretBuddy!",
      });
    } catch (error: any) {
      if (error.message !== "User did not share") {
        console.error("Error sharing:", error);
      }
    }
  };

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

  const handleSendSuggestionRequest = async (userId: string) => {
    if (!user) return;

    try {
      setSendingRequestTo(userId);

      // For demo users, just remove from suggestions
      if (userId.startsWith("demo_")) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
        setSuggestions((prev) => prev.filter((s) => s.uid !== userId));
        setSendingRequestTo(null);
        return;
      }

      // Real friend request
      await sendFriendRequest(user.uid, userId);
      setSuggestions((prev) => prev.filter((s) => s.uid !== userId));
      await invalidateSuggestionsCache();

      // Refresh sent requests to update search results
      const sentData = await getSentFriendRequests(user.uid);
      setSentRequests(sentData);
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", error.message || "Failed to send friend request");
    } finally {
      setSendingRequestTo(null);
    }
  };

  const handleSendRequest = async (friend: FriendProfile) => {
    if (!user || actionLoading) return;
    try {
      setActionLoading(true);
      const friendshipId = await sendFriendRequest(user.uid, friend.uid);

      // Update the search result to show "Sent" status
      setSearchResults((prev) =>
        prev.map((f) =>
          f.uid === friend.uid
            ? { ...f, friendshipStatus: "pending_sent", friendshipId }
            : f
        )
      );

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

  const handleCancelRequest = async (friend: FriendProfile) => {
    if (!user || !friend.friendshipId || actionLoading) return;
    try {
      setActionLoading(true);
      await declineFriendRequest(friend.friendshipId);

      // Update the search result back to "none" status
      setSearchResults((prev) =>
        prev.map((f) =>
          f.uid === friend.uid
            ? { ...f, friendshipStatus: "none", friendshipId: undefined }
            : f
        )
      );

      // Refresh sent requests
      const sentData = await getSentFriendRequests(user.uid);
      setSentRequests(sentData);
    } catch (error) {
      console.error("Error canceling friend request:", error);
      Alert.alert(
        "Error",
        "Failed to cancel friend request. Please try again."
      );
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

    // Check if profile is already cached
    if (profileCacheRef.current[friend.uid]) {
      setSelectedFriendPrivacy(profileCacheRef.current[friend.uid]);
      return;
    }

    // Load full user profile with privacy settings only if not cached
    try {
      const fullProfile = await getUserProfile(friend.uid);
      // Cache the profile to avoid future API calls
      profileCacheRef.current[friend.uid] = fullProfile || {};
      setSelectedFriendPrivacy(fullProfile || {});
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
    const isPendingSent = item.friendshipStatus === "pending_sent";
    const isPendingReceived = item.friendshipStatus === "pending_received";
    const isFriend = item.friendshipStatus === "friend";

    return (
      <TouchableOpacity
        style={styles.searchResultCard}
        onPress={() => handleFriendPress(item)}
        activeOpacity={0.7}
      >
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
              onPress={(e) => {
                e.stopPropagation();
                handleSendRequest(item);
              }}
              disabled={actionLoading}
            >
              <LinearGradient
                colors={["rgba(156, 107, 255, 0.8)", "rgba(147, 51, 234, 0.9)"]}
                style={styles.addButtonGradient}
              >
                <Ionicons
                  name="person-add"
                  size={18}
                  color={colors.textPrimary}
                />
              </LinearGradient>
            </TouchableOpacity>
          )}
          {isPendingSent && (
            <TouchableOpacity
              style={styles.sentButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCancelRequest(item);
              }}
              disabled={actionLoading}
            >
              <Text style={styles.sentButtonText}>Sent</Text>
            </TouchableOpacity>
          )}
          {isPendingReceived && (
            <View style={styles.friendBadge}>
              <Ionicons
                name="person-add"
                size={18}
                color={colors.accentPurple}
              />
              <Text style={styles.friendBadgeText}>Pending</Text>
            </View>
          )}
          {isFriend && (
            <View style={styles.friendBadge}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.accentTeal}
              />
              <Text style={styles.friendBadgeText}>Friend</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <GradientBackground gradient="midnight">
      <TopHeader />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={
            !profileModalVisible && !reportModalVisible && !blockModalVisible
          }
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
                  style={styles.shareButton}
                  onPress={handleShareUsername}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={20}
                    color={colors.accentPurple}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inviteButton}
                  onPress={handleImportContacts}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={22}
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

            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="rgba(255,255,255,0.5)"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for friends"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color="rgba(255,255,255,0.5)"
                  />
                </TouchableOpacity>
              )}
            </View>

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
                {/* Friend Suggestions - Show if 3 or more available */}
                {suggestions.length >= 3 && (
                  <View style={styles.suggestionsSection}>
                    <View style={styles.suggestionHeader}>
                      <Text style={styles.sectionTitle}>Suggested for you</Text>
                      <Text style={styles.suggestionSubtitle}>
                        Based on mutual friends
                      </Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.suggestionsScroll}
                    >
                      {suggestions.map((suggestion) => (
                        <SuggestionCard
                          key={suggestion.uid}
                          suggestion={suggestion}
                          onSendRequest={handleSendSuggestionRequest}
                          onDiscard={(uid) =>
                            setSuggestions((prev) =>
                              prev.filter((s) => s.uid !== uid)
                            )
                          }
                          loading={sendingRequestTo === suggestion.uid}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

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

                  {/* Lifetime Buddies - Small inline stat - Always show */}
                  {selectedFriendPrivacy && (
                    <View style={styles.lifetimeBuddiesInline}>
                      <Ionicons
                        name="people-outline"
                        size={12}
                        color={colors.accentTeal}
                      />
                      <Text style={styles.lifetimeBuddiesInlineText}>
                        {selectedFriendPrivacy.lifetimeBuddiesCount || 0}{" "}
                        buddies
                      </Text>
                    </View>
                  )}

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
                    {selectedFriendPrivacy && (
                      <View style={styles.profileInfoRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={20}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.profileCountryText}>
                          {selectedFriendPrivacy.ageVisible === false
                            ? "Private"
                            : selectedFriendPrivacy.age
                            ? `${selectedFriendPrivacy.age} years`
                            : "Not specified"}
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
                        // Preserve the current friend as the report target, close the profile modal
                        // then open the report modal after the profile modal is dismissed to avoid
                        // modal stacking and touch-blocking issues.
                        if (selectedFriend) {
                          setSelectedReportTarget(selectedFriend);
                        }
                        setProfileModalVisible(false);
                        // small delay to ensure the first modal has been dismissed
                        setTimeout(() => setReportModalVisible(true), 220);
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
                        // Preserve block target then close profile modal before opening block confirm
                        if (selectedFriend) {
                          setSelectedBlockTarget(selectedFriend);
                        }
                        setProfileModalVisible(false);
                        setTimeout(() => setBlockModalVisible(true), 220);
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
              )}
            </View>
          </View>
        </Modal>

        {/* Report Modal */}
        <ReportModal
          visible={reportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            // Clear preserved target after closing so it doesn't linger
            setSelectedReportTarget(null);
          }}
          reportType="user"
          targetName={
            selectedReportTarget?.displayName || selectedFriend?.displayName
          }
          reportedUserId={
            selectedReportTarget?.uid || selectedFriend?.uid || ""
          }
          reportingUserId={user?.uid || ""}
        />

        {/* Block Confirm Modal */}
        <BlockConfirmModal
          visible={blockModalVisible}
          onClose={() => {
            setBlockModalVisible(false);
            setSelectedBlockTarget(null);
          }}
          onConfirm={async () => {
            // Use preserved block target if available; fall back to selectedFriend
            const target = selectedBlockTarget || selectedFriend;
            if (target && user) {
              try {
                setActionLoading(true);
                await blockUser(user.uid, target.uid);
                // Remove from friends list after blocking
                setFriends((prev) => prev.filter((f) => f.uid !== target.uid));
              } catch (error) {
                console.error("Error blocking user:", error);
                Alert.alert("Error", "Failed to block user. Please try again.");
              } finally {
                setActionLoading(false);
              }
            }
            setBlockModalVisible(false);
            // ensure we clear preserved block target
            setSelectedBlockTarget(null);
          }}
          userName={
            selectedBlockTarget?.displayName ||
            selectedFriend?.displayName ||
            "User"
          }
        />
      </KeyboardAvoidingView>
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
    padding: 12,
    gap: 14,
    paddingTop: 100,
    minHeight: "100%",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  title: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.5,
    flexShrink: 1,
  },

  inviteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(156, 107, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(156, 107, 255, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(156, 107, 255, 0.5)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    flexShrink: 0,
  },

  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(156, 107, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(156, 107, 255, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(156, 107, 255, 0.5)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    flexShrink: 0,
  },

  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },

  testChatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
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
    fontSize: 13,
    fontWeight: "700",
  },

  searchContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },

  searchIcon: {
    position: "absolute",
    left: 18,
    zIndex: 1,
  },

  searchInput: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "rgba(156, 107, 255, 0.25)",
    backgroundColor: "rgba(6, 0, 18, 0.9)",
    paddingLeft: 50,
    paddingRight: 50,
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

  clearButton: {
    position: "absolute",
    right: 18,
    zIndex: 1,
    padding: 4,
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
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    gap: 10,
    minWidth: 0,
  },

  friendInfoColumn: {
    flex: 1,
    gap: 4,
  },

  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "rgba(156, 107, 255, 0.6)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
    flexShrink: 0,
  },

  friendInitials: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  friendDetails: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },

  friendName: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 2,
    flexShrink: 1,
  },

  friendUsername: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.7,
    flexShrink: 1,
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
    padding: 16,
    width: "100%",
    maxWidth: 380,
    maxHeight: "90%",
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
    gap: 8,
    marginTop: 4,
  },

  profileAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "rgba(156, 107, 255, 0.5)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 2,
    overflow: "hidden",
  },

  profileAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },

  profileAvatarTextLarge: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "900",
  },

  profileNameLarge: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  profileUsernameLarge: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.8,
    marginTop: -3,
  },

  profileInfoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 8,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginTop: 4,
    gap: 6,
  },

  profileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },

  profileCountryText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },

  statusContainer: {
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },

  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },

  statusText: {
    ...typography.body,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Bio Card Styles
  bioCard: {
    backgroundColor: "rgba(156, 107, 255, 0.05)",
    borderRadius: 16,
    padding: 10,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.2)",
    marginTop: 6,
  },

  bioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  bioTitle: {
    ...typography.subtitle,
    color: colors.accentPurple,
    fontSize: 14,
    fontWeight: "700",
  },

  bioText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
  },

  // Stats Card Styles
  statsCard: {
    backgroundColor: "rgba(46, 230, 169, 0.05)",
    borderRadius: 16,
    padding: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(46, 230, 169, 0.2)",
    marginTop: 12,
    alignItems: "center",
  },

  statItem: {
    alignItems: "center",
    gap: 4,
  },

  statValue: {
    ...typography.caption,
    color: colors.accentTeal,
    fontSize: 18,
    fontWeight: "700",
  },

  lifetimeBuddiesLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },

  // Inline Lifetime Buddies Style
  lifetimeBuddiesInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(46, 230, 169, 0.08)",
    alignSelf: "center",
  },

  lifetimeBuddiesInlineText: {
    ...typography.caption,
    color: colors.accentTeal,
    fontSize: 12,
    fontWeight: "600",
  },

  // Safety Actions Styles
  safetyActionsContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    width: "100%",
  },

  reportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255, 107, 138, 0.1)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 138, 0.3)",
  },

  reportButtonText: {
    ...typography.body,
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },

  blockButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255, 107, 138, 0.1)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 138, 0.3)",
  },

  blockButtonText: {
    ...typography.body,
    color: colors.danger,
    fontSize: 12,
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
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "rgba(156, 107, 255, 0.6)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
    flexShrink: 0,
  },

  addButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.4)",
    borderRadius: 20,
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

  // Friend Suggestions
  suggestionsSection: {
    marginBottom: 20,
  },

  suggestionHeader: {
    marginBottom: 12,
  },

  suggestionSubtitle: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 13,
    marginTop: 2,
  },

  suggestionsScroll: {
    paddingRight: 16,
  },

  countdownContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "rgba(156, 107, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(156, 107, 255, 0.2)",
    marginHorizontal: 0,
    gap: 12,
  },

  countdownText: {
    ...typography.title,
    fontSize: 28,
    fontWeight: "700",
    color: colors.accentPurple,
    letterSpacing: 0.5,
  },

  countdownSubtext: {
    ...typography.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },

  // Button for "Sent" status
  sentButton: {
    backgroundColor: "rgba(147, 51, 234, 0.3)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(147, 51, 234, 0.5)",
    flexShrink: 0,
  },

  sentButtonText: {
    ...typography.body,
    color: colors.accentPurple,
    fontSize: 12,
    fontWeight: "600",
  },

  // Friend badge for existing friends
  friendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 230, 169, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 4,
    flexShrink: 0,
  },

  friendBadgeText: {
    ...typography.body,
    color: colors.accentTeal,
    fontSize: 12,
    fontWeight: "600",
  },
});
