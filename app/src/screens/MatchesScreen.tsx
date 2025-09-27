import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GradientBackground } from "../components/GradientBackground";
import { colors, typography } from "../theme";

const mockMatches = [
  { id: "c-001", codename: "Neon Fox", status: "Active mystery" },
  { id: "c-002", codename: "Echo Wave", status: "Ongoing chat" },
  { id: "c-003", codename: "Solar Kite", status: "Expired" },
];

export const MatchesScreen = () => (
  <GradientBackground gradient="tealBlue">
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Matches</Text>
      <Text style={styles.subtitle}>
        Keep tabs on today&apos;s buddy and past connections.
      </Text>
      <View style={styles.list}>
        {mockMatches.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.codename}>{item.codename}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  </GradientBackground>
);

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 24,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.85,
  },
  list: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    backgroundColor: "rgba(11, 5, 32, 0.68)",
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codename: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  status: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 6,
  },
});
