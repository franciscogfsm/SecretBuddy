import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import type { MysteryBuddy, Prompt } from "../store/AppStateContext";
import { colors, gradients, typography } from "../theme";
import { CountdownChip } from "./CountdownChip";
import { PrimaryButton } from "./PrimaryButton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

const gradientColors = gradients.purplePink;

type MysteryCardProps = {
  prompt: Prompt;
  buddy: MysteryBuddy;
};

export const MysteryCard = ({ prompt, buddy }: MysteryCardProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.promptLabel}>Today&apos;s Prompt</Text>
          <CountdownChip targetISO={prompt.expiresAt} label="Ends in" />
        </View>
        <Text style={styles.promptText}>{prompt.text}</Text>
        <View style={styles.buddySection}>
          <BlurView intensity={70} tint="dark" style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>?</Text>
          </BlurView>
          <View style={styles.buddyDetails}>
            <Text style={styles.buddyLabel}>{buddy.codename}</Text>
            <Text style={styles.buddyMeta}>Streak {buddy.streak} 🔥</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Record 10s" onPress={() => {}} />
          <PrimaryButton
            label="Send emoji"
            variant="ghost"
            onPress={() => {}}
          />
        </View>
        <Pressable
          style={styles.revealLink}
          onPress={() => navigation.navigate("Reveal")}
        >
          <Text style={styles.revealText}>
            Reveal opens at{" "}
            {new Date(buddy.revealAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: colors.accentPurple,
    shadowOpacity: 0.25,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  gradient: {
    padding: 24,
    gap: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  promptLabel: {
    ...typography.subtitle,
    color: "rgba(245,242,255,0.78)",
  },
  promptText: {
    ...typography.title,
    color: colors.textPrimary,
  },
  buddySection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    ...typography.title,
    color: colors.textPrimary,
  },
  buddyDetails: {
    flex: 1,
  },
  buddyLabel: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  buddyMeta: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  revealLink: {
    alignItems: "center",
  },
  revealText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
