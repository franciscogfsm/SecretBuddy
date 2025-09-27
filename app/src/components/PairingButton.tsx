import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { colors, typography } from "../theme";

type PairingButtonProps = {
  onPress: () => void;
  isSearching?: boolean;
  disabled?: boolean;
};

export const PairingButton = ({
  onPress,
  isSearching = false,
  disabled = false,
}: PairingButtonProps) => {
  const rotation = useSharedValue(0);

  // Start rotation animation when searching
  if (isSearching) {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  } else {
    rotation.value = 0;
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isSearching}
      style={[styles.container, (disabled || isSearching) && styles.disabled]}
    >
      <View style={styles.content}>
        {isSearching ? (
          <>
            <Animated.View style={[styles.searchIcon, animatedStyle]}>
              <Text style={styles.searchIconText}>🔍</Text>
            </Animated.View>
            <Text style={styles.label}>Finding your mystery buddy...</Text>
          </>
        ) : (
          <>
            <Text style={styles.sparkleIcon}>✨</Text>
            <Text style={styles.label}>Find Mystery Buddy</Text>
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    backgroundColor: colors.accentPurple,
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 8,
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  searchIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  searchIconText: {
    fontSize: 16,
  },
  sparkleIcon: {
    fontSize: 20,
  },
  label: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
