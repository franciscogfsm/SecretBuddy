import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, typography } from "../theme";

type PillOptionProps = {
  label: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
};

const { height } = Dimensions.get("window");
const isSmallScreen = height < 700;

export const PillOption = ({
  label,
  description,
  selected,
  onPress,
}: PillOptionProps) => (
  <Pressable
    onPress={onPress}
    style={[styles.root, selected ? styles.selected : styles.deselected]}
  >
    <View style={styles.content}>
      <View style={styles.textContainer}>
        <Text style={[styles.label, selected && styles.selectedLabel]}>
          {label}
        </Text>
        {description ? (
          <Text
            style={[styles.description, selected && styles.selectedDescription]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {selected && (
        <View style={styles.checkContainer}>
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={colors.accentPurple}
          />
        </View>
      )}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  root: {
    borderRadius: 16,
    paddingVertical: isSmallScreen ? 14 : 16,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "rgba(10, 6, 28, 0.65)",
  },
  selected: {
    borderColor: colors.accentPurple,
    backgroundColor: "rgba(156, 107, 255, 0.22)",
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
    transform: [{ scale: 1.0 }],
  },
  deselected: {
    opacity: 0.75,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textContainer: {
    flex: 1,
  },
  checkContainer: {
    marginLeft: 12,
  },
  label: {
    ...typography.subtitle,
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  description: {
    ...typography.body,
    marginTop: 4,
    fontSize: isSmallScreen ? 12 : 13,
    color: colors.textSecondary,
    lineHeight: isSmallScreen ? 16 : 18,
  },
  selectedLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  selectedDescription: {
    color: colors.textPrimary,
  },
});
