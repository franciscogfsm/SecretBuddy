import { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { CountryDropdown } from "../components/CountryDropdown";
import { GradientBackground } from "../components/GradientBackground";
import { MysteryCard } from "../components/MysteryCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { TopHeader } from "../components/TopHeader";
import { useAppState } from "../store/AppStateContext";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type PairingStatus =
  | "waiting"
  | "submitting"
  | "submitted"
  | "pairing"
  | "paired"
  | "revealing";

export const HomeScreen = () => {
  const { prompt, buddy, profile, setProfile } = useAppState();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [pairingStatus, setPairingStatus] = useState<PairingStatus>("waiting");
  const [timeUntilWindow, setTimeUntilWindow] = useState<string>("");
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const checkDailyWindow = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Submission window: 12:00 - 14:30
      const isSubmissionWindow =
        currentHour >= 12 &&
        (currentHour < 14 || (currentHour === 14 && currentMinute <= 30));

      // Reveal window: 21:00 - 22:00
      const isRevealWindow = currentHour >= 21 && currentHour < 22;

      // Pairing happens after submission window closes
      const isPairingTime = currentHour >= 14 && currentHour < 21;

      if (isSubmissionWindow) {
        if (buddy && prompt) {
          setPairingStatus("paired");
        } else {
          setPairingStatus("submitting");
        }
      } else if (isPairingTime) {
        setPairingStatus("pairing");
      } else if (isRevealWindow) {
        setPairingStatus("revealing");
      } else {
        setPairingStatus("waiting");
      }

      // Calculate time until next window
      if (pairingStatus === "waiting") {
        const nextWindow = new Date();
        nextWindow.setHours(12, 0, 0, 0);
        if (now >= nextWindow) {
          nextWindow.setDate(nextWindow.getDate() + 1);
        }
        const diff = nextWindow.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeUntilWindow(`${hours}h ${minutes}m`);
      }
    };

    checkDailyWindow();
    const interval = setInterval(checkDailyWindow, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [buddy, prompt, pairingStatus]);

  useEffect(() => {
    if (pairingStatus === "pairing") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [pairingStatus, pulseAnim]);

  const handlePairingPress = () => {
    switch (pairingStatus) {
      case "waiting":
        Alert.alert(
          "Daily Window",
          "The submission window opens at 12:00. You'll get a notification when it's time!",
          [{ text: "OK" }]
        );
        break;
      case "submitting":
        // Navigate to submission screen or show modal
        Alert.alert(
          "Submit Response",
          "Time to share your mood with your Secret Buddy!"
        );
        break;
      case "pairing":
        Alert.alert(
          "Finding Your Match",
          "We're pairing you with someone special. Check back later!"
        );
        break;
      case "paired":
        Alert.alert(
          "You're Paired!",
          "Your Secret Buddy is ready. Check back tonight for the reveal!"
        );
        break;
      case "revealing":
        Alert.alert(
          "Reveal Time!",
          "Your Secret Buddy's identity is being revealed!"
        );
        break;
    }
  };

  const getStatusText = () => {
    switch (pairingStatus) {
      case "waiting":
        return `Next window in ${timeUntilWindow}`;
      case "submitting":
        return "Submit your response now!";
      case "submitted":
        return "Response submitted ✓";
      case "pairing":
        return "Finding your perfect match...";
      case "paired":
        return "Paired! Reveal tonight";
      case "revealing":
        return "Identity reveal in progress!";
      default:
        return "";
    }
  };

  const handleModeSelect = (mode: string) => {
    if (profile) {
      setProfile({ ...profile, mode: mode as any });
    }
  };

  const getModeOptions = () => [
    {
      label: "Friends",
      value: "friends",
      description: "Connect with your friends only",
    },
    {
      label: "Country",
      value: "country",
      description: "Pair with someone from your selected country",
    },
    {
      label: "World",
      value: "world",
      description: "Connect with anyone worldwide",
    },
  ];

  const getButtonText = () => {
    switch (pairingStatus) {
      case "waiting":
        return "Set Reminder";
      case "submitting":
        return "Submit Response";
      case "pairing":
        return "Check Status";
      case "paired":
        return "View Buddy";
      case "revealing":
        return "Reveal Now";
      default:
        return "Pair Me";
    }
  };

  return (
    <GradientBackground gradient="midnight">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Prompt - Top Priority */}
        {pairingStatus === "submitting" && prompt && (
          <View style={styles.promptCard}>
            <Text style={styles.promptTitle}>Today's Prompt</Text>
            <Text style={styles.promptText}>{prompt.text}</Text>
            <Text style={styles.promptTime}>Submit by 14:30</Text>
          </View>
        )}

        {/* Pairing Status Card */}
        <Animated.View
          style={[
            styles.pairingCard,
            pairingStatus === "pairing" && {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Daily Connection</Text>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(pairingStatus) },
              ]}
            />
          </View>
          <Text style={styles.statusText}>{getStatusText()}</Text>

          <PrimaryButton
            label={getButtonText()}
            onPress={handlePairingPress}
            variant={pairingStatus === "submitting" ? "primary" : "ghost"}
            disabled={pairingStatus === "waiting"}
          />

          {pairingStatus === "pairing" && (
            <View style={styles.searchingIndicator}>
              <Text style={styles.searchingText}>🔍 Searching...</Text>
            </View>
          )}
        </Animated.View>

        {/* Mystery Card - Only show when paired */}
        {pairingStatus === "paired" && prompt && buddy && (
          <MysteryCard prompt={prompt} buddy={buddy} />
        )}

        {/* Game Mode Selection */}
        <View style={styles.modeCard}>
          <Text style={styles.modeTitle}>Game Mode</Text>
          <Text style={styles.modeSubtitle}>
            Choose how you want to connect with others
          </Text>
          <View style={styles.modeOptions}>
            {getModeOptions().map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modeOption,
                  profile?.mode === option.value && styles.modeOptionSelected,
                ]}
                onPress={() => handleModeSelect(option.value)}
              >
                <Text
                  style={[
                    styles.modeOptionLabel,
                    profile?.mode === option.value &&
                      styles.modeOptionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.modeOptionDesc,
                    profile?.mode === option.value &&
                      styles.modeOptionDescSelected,
                  ]}
                >
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {profile?.mode === "country" && (
            <CountryDropdown
              label="Select Country"
              value={profile?.country || ""}
              onSelect={(country) => {
                if (profile) {
                  setProfile({ ...profile, country });
                }
              }}
              placeholder="Choose your pairing country"
            />
          )}
          {profile?.mode === "friends" && (
            <TouchableOpacity
              style={styles.manageFriendsButton}
              onPress={() => navigation.navigate("Friends")}
            >
              <Text style={styles.manageFriendsText}>Manage Friends</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.metaSection}>
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Streak</Text>
            <Text style={styles.metaValue}>5 days 🔥</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Points</Text>
            <Text style={styles.metaValue}>420 pts</Text>
          </View>
        </View>
      </ScrollView>
    </GradientBackground>
  );
};

const getStatusColor = (status: PairingStatus) => {
  switch (status) {
    case "waiting":
      return colors.textSecondary;
    case "submitting":
      return colors.accentTeal;
    case "pairing":
      return colors.accentPurple;
    case "paired":
      return colors.accentPink;
    case "revealing":
      return colors.danger;
    default:
      return colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 140,
    gap: 28,
  },
  promptCard: {
    borderRadius: 24,
    backgroundColor: "rgba(6, 0, 18, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 22,
  },
  promptTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  promptText: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: 16,
    lineHeight: 24,
  },
  promptTime: {
    ...typography.caption,
    color: colors.accentTeal,
    fontWeight: "600",
  },
  pairingCard: {
    borderRadius: 24,
    backgroundColor: "rgba(6, 0, 18, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 22,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  searchingIndicator: {
    alignItems: "center",
    marginTop: 12,
  },
  searchingText: {
    ...typography.caption,
    color: colors.accentPurple,
    fontWeight: "600",
  },
  headerTitle: {
    ...typography.display,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
  },
  modeCard: {
    borderRadius: 24,
    backgroundColor: "rgba(6, 0, 18, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 22,
    gap: 14,
  },
  modeTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  modeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  metaSection: {
    flexDirection: "row",
    gap: 16,
  },
  metaCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    backgroundColor: "rgba(11, 5, 32, 0.7)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  metaValue: {
    ...typography.title,
    color: colors.accentPurple,
    marginTop: 8,
  },
  modeOptions: {
    gap: 12,
  },
  modeOption: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(11, 5, 32, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  modeOptionSelected: {
    backgroundColor: "rgba(156, 107, 255, 0.15)",
    borderColor: colors.accentPurple,
  },
  modeOptionLabel: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  modeOptionLabelSelected: {
    color: colors.accentPurple,
  },
  modeOptionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modeOptionDescSelected: {
    color: colors.textPrimary,
  },
  manageFriendsButton: {
    borderRadius: 16,
    backgroundColor: "rgba(156, 107, 255, 0.15)",
    borderWidth: 1,
    borderColor: colors.accentPurple,
    padding: 16,
    alignItems: "center",
  },
  manageFriendsText: {
    ...typography.subtitle,
    color: colors.accentPurple,
  },
});
