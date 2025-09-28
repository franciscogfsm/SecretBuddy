import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { GradientBackground } from "../components/GradientBackground";
import { PrimaryButton } from "../components/PrimaryButton";
import { TopHeader } from "../components/TopHeader";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Friend = {
  id: string;
  name: string;
  status: "friend" | "pending" | "requested" | "none";
};

export const FriendsScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([
    { id: "1", name: "Alice", status: "friend" },
    { id: "2", name: "Bob", status: "pending" },
    { id: "3", name: "Charlie", status: "requested" },
  ]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);

  useEffect(() => {
    if (searchQuery.trim()) {
      // Mock search results
      setSearchResults([
        { id: "4", name: "Diana", status: "none" },
        { id: "5", name: "Eve", status: "none" },
      ]);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

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
              { id: "6", name: "Frank", status: "friend" },
              { id: "7", name: "Grace", status: "pending" },
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

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.friendCard}>
      <Text style={styles.friendName}>{item.name}</Text>
      <Text style={styles.friendStatus}>
        {item.status === "friend"
          ? "Friend"
          : item.status === "pending"
          ? "Request Pending"
          : "Request Sent"}
      </Text>
    </View>
  );

  const renderSearchResult = ({ item }: { item: Friend }) => (
    <View style={styles.searchResultCard}>
      <Text style={styles.friendName}>{item.name}</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleSendRequest(item)}
      >
        <Text style={styles.addButtonText}>Add Friend</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <GradientBackground gradient="midnight">
      <TopHeader />
      <View style={styles.container}>
        <Text style={styles.title}>Friends</Text>

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
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchResult}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No users found</Text>
              }
            />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Friends</Text>
              <FlatList
                data={friends.filter((f) => f.status === "friend")}
                keyExtractor={(item) => item.id}
                renderItem={renderFriend}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No friends yet</Text>
                }
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <FlatList
                data={friends.filter((f) => f.status !== "friend")}
                keyExtractor={(item) => item.id}
                renderItem={renderFriend}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No pending requests</Text>
                }
              />
            </View>

            <PrimaryButton
              label="Import from Contacts"
              onPress={handleImportContacts}
              variant="ghost"
            />
          </>
        )}
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 20,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  searchInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(11, 5, 32, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    ...typography.body,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  friendCard: {
    borderRadius: 16,
    backgroundColor: "rgba(11, 5, 32, 0.7)",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  searchResultCard: {
    borderRadius: 16,
    backgroundColor: "rgba(11, 5, 32, 0.7)",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  friendName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  friendStatus: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  addButton: {
    backgroundColor: colors.accentPurple,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 20,
  },
});
