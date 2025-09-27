import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useRef } from "react";

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
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSearching) {
      const animation = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();

      return () => {
        animation.stop();
        rotation.setValue(0);
      };
    }

    rotation.stopAnimation(() => {
      rotation.setValue(0);
    });
  }, [isSearching, rotation]);

  const animatedStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "360deg"],
        }),
      },
    ],
  };

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
