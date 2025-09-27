import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CountdownChip } from "./CountdownChip";
import { PrimaryButton } from "./PrimaryButton";
import type { MysteryBuddy, PairingData } from "../store/AppStateContext";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients, typography } from "../theme";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RevealCardProps = {
  buddy: MysteryBuddy;
  pairing: PairingData;
};

export const RevealCard = ({ buddy, pairing }: RevealCardProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleReveal = () => {
    navigation.navigate("Reveal");
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.sunset} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>Time to reveal! 🌟</Text>
          <CountdownChip targetISO={pairing.revealWindowEnd} label="Ends in" />
        </View>

        <View style={styles.buddySection}>
          <BlurView intensity={70} tint="dark" style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>?</Text>
          </BlurView>
          <View style={styles.buddyDetails}>
            <Text style={styles.buddyLabel}>{buddy.codename}</Text>
            <Text style={styles.buddyMeta}>Streak {buddy.streak} 🔥</Text>
          </View>
        </View>

        <PrimaryButton label="Reveal Mystery Buddy" onPress={handleReveal} />

        <Text style={styles.hint}>
          See who you've been mysteriously connected with today
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: colors.accentPink,
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
  title: {
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
  hint: {
    ...typography.caption,
    color: "rgba(245,242,255,0.6)",
    textAlign: "center",
  },
});
