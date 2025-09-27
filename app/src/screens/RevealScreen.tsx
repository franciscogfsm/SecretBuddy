import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CountdownChip } from "../components/CountdownChip";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../navigation/types";
import { useAppState } from "../store/AppStateContext";
import { colors, typography } from "../theme";

const revealWindowSeconds = 60;

type Props = NativeStackScreenProps<RootStackParamList, "Reveal">;

export const RevealScreen = ({ navigation }: Props) => {
  const { buddy } = useAppState();
  const [decision, setDecision] = useState<"continue" | "pass" | null>(null);

  const revealEndsAt = useMemo(() => {
    const now = new Date();
    now.setSeconds(now.getSeconds() + revealWindowSeconds);
    return now.toISOString();
  }, []);

  if (!buddy) {
    navigation.goBack();
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>It&apos;s {buddy.codename}</Text>
        <Text style={styles.subtitle}>
          You both responded today. Decide within a minute if you want to keep
          talking.
        </Text>
        <View style={styles.countdownWrapper}>
          <CountdownChip
            targetISO={revealEndsAt}
            label="Chat unlocks if you both continue"
          />
        </View>
        <View style={styles.actions}>
          <PrimaryButton
            label={decision === "continue" ? "Selected" : "Continue"}
            onPress={() => setDecision("continue")}
            disabled={decision === "continue"}
          />
          <PrimaryButton
            label={decision === "pass" ? "Selected" : "Pass"}
            variant="ghost"
            onPress={() => setDecision("pass")}
            disabled={decision === "pass"}
          />
        </View>
        <Pressable onPress={() => navigation.goBack()} style={styles.dismiss}>
          <Text style={styles.dismissText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(9, 0, 24, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    width: "100%",
    borderRadius: 28,
    padding: 28,
    backgroundColor: colors.surface,
    gap: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  countdownWrapper: {
    alignItems: "flex-start",
  },
  actions: {
    gap: 12,
  },
  dismiss: {
    alignItems: "center",
    marginTop: 4,
  },
  dismissText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
