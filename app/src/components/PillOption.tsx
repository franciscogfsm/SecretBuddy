import { Pressable, StyleSheet, Text } from "react-native";

import { colors, typography } from "../theme";

type PillOptionProps = {
  label: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
};

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
  </Pressable>
);

const styles = StyleSheet.create({
  root: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10, 6, 28, 0.65)",
    marginBottom: 12,
  },
  selected: {
    borderColor: colors.accentPurple,
    backgroundColor: "rgba(156, 107, 255, 0.22)",
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 4,
  },
  deselected: {
    opacity: 0.82,
  },
  label: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  description: {
    ...typography.body,
    marginTop: 4,
    color: colors.textSecondary,
  },
  selectedLabel: {
    color: colors.textPrimary,
  },
  selectedDescription: {
    color: colors.textPrimary,
  },
});
