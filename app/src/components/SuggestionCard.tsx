import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FriendSuggestion } from "../services/friendSuggestionsService";

interface SuggestionCardProps {
  suggestion: FriendSuggestion;
  onSendRequest: (userId: string) => void;
  onDiscard: (userId: string) => void;
  loading?: boolean;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onSendRequest,
  onDiscard,
  loading = false,
}) => {
  const [requestSent, setRequestSent] = React.useState(false);
  const [discarded, setDiscarded] = React.useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getMutualFriendsText = () => {
    if (suggestion.mutualFriendsCount === 0) return "";

    if (suggestion.mutualFriendsCount === 1) {
      return `Friends with ${suggestion.mutualFriendNames[0]}`;
    }

    if (suggestion.mutualFriendsCount === 2) {
      return `Friends with ${suggestion.mutualFriendNames[0]} and ${suggestion.mutualFriendNames[1]}`;
    }

    return `Friends with ${suggestion.mutualFriendNames[0]} and ${
      suggestion.mutualFriendsCount - 1
    } other${suggestion.mutualFriendsCount > 2 ? "s" : ""}`;
  };

  const handleAddPress = () => {
    setRequestSent(true);
    onSendRequest(suggestion.uid);
  };

  const handleDiscard = () => {
    setDiscarded(true);
    onDiscard(suggestion.uid);
  };

  const handleCardPress = () => {
    // For demo users, just show alert
    if (suggestion.uid.startsWith("demo_")) {
      console.log("Demo profile - would open profile screen");
      return;
    }
    // Real users would navigate to profile
    // navigation.navigate("Profile", { userId: suggestion.uid });
  };

  if (requestSent || discarded) {
    return null; // Hide the card after sending request or discarding
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleCardPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)"]}
        style={styles.cardGradient}
      >
        {/* Discard Button - Top Left */}
        <TouchableOpacity
          style={styles.discardButton}
          onPress={handleDiscard}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.discardIcon}>×</Text>
        </TouchableOpacity>

        {/* Country Flag - Top Right */}
        {suggestion.country && (
          <View style={styles.flagContainer}>
            <Text style={styles.country}>{suggestion.country}</Text>
          </View>
        )}

        {/* Profile Photo */}
        <View style={styles.photoContainer}>
          {suggestion.profilePhotoUrl ? (
            <Image
              source={{ uri: suggestion.profilePhotoUrl }}
              style={styles.photo}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.initials}>
                {getInitials(suggestion.displayName)}
              </Text>
            </View>
          )}
        </View>

        {/* Name */}
        <Text style={styles.name} numberOfLines={1}>
          {suggestion.displayName}
        </Text>

        {/* Username */}
        {suggestion.username && (
          <Text style={styles.username} numberOfLines={1}>
            @{suggestion.username}
          </Text>
        )}

        {/* Mutual Friends */}
        <Text style={styles.mutualFriends} numberOfLines={2}>
          {getMutualFriendsText()}
        </Text>

        {/* Add Friend Button */}
        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleAddPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.addIcon}>+</Text>
              <Text style={styles.addText}>Add</Text>
            </>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 10,
    paddingBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    minHeight: 200,
  },
  discardButton: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  discardIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  flagContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    padding: 4,
    paddingHorizontal: 6,
  },
  country: {
    fontSize: 16,
  },
  photoContainer: {
    marginTop: 8,
    marginBottom: 6,
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  photoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  initials: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 2,
    paddingHorizontal: 4,
    width: "100%",
  },
  username: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 4,
    paddingHorizontal: 4,
    width: "100%",
  },
  mutualFriends: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
    width: "100%",
    flexGrow: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147, 51, 234, 0.8)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    width: "100%",
    maxWidth: 120,
  },
  addButtonDisabled: {
    backgroundColor: "rgba(147, 51, 234, 0.4)",
  },
  addIcon: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 3,
  },
  addText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default SuggestionCard;
