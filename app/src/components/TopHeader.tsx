import React, { useEffect, useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Text,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import { colors, typography } from "../theme";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";
import { useAppState } from "../store/AppStateContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TopHeaderProps {
  showSettings?: boolean;
  onSettingsPress?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  showSettings = true,
  onSettingsPress,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { profile, setProfile } = useAppState();
  const eyeScaleAnim = useRef(new Animated.Value(1)).current;

  const headerPaddingTop = Math.max(insets.top - 12, 12);

  const userName = user?.displayName || profile?.name;
  const greetingLine = userName ? `Hey, ${userName}` : "New Member";

  useEffect(() => {
    // Eye blink animation
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(eyeScaleAnim, {
          toValue: 0.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(eyeScaleAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    );
    blinkAnimation.start();
  }, [eyeScaleAnim]);

  const handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
      return;
    }

    // Navigate to Settings screen instead of showing logout dialog
    navigation.navigate("Settings");
  };

  return (
    <LinearGradient
      colors={["rgba(0,0,0,0.9)", "#070319", "#1C0E3C"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientContainer, { paddingTop: headerPaddingTop }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.brandSection}>
          <View style={styles.brandBadge}>
            <Animated.View
              style={{
                transform: [{ scaleY: eyeScaleAnim }],
              }}
            >
              <Ionicons
                name="eye-outline"
                size={18}
                color={colors.textPrimary}
              />
            </Animated.View>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              SecretBuddy
            </Text>
            <Text
              style={styles.subtitle}
              numberOfLines={1}
              accessibilityLabel={greetingLine}
            >
              {greetingLine}
            </Text>
          </View>
        </View>

        {showSettings && (
          <Pressable
            style={({ pressed }) => [
              styles.settingsWrapper,
              pressed && styles.settingsWrapperPressed,
            ]}
            onPress={handleSettingsPress}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <BlurView intensity={50} tint="dark" style={styles.settingsBlur}>
              <Ionicons
                name="settings-outline"
                size={22}
                color={colors.textPrimary}
              />
            </BlurView>
            <View style={styles.settingsIndicator} />
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 12,
    overflow: "hidden",
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  brandSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
  brandBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  titleContainer: {
    maxWidth: 220,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 30,
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    opacity: 0.9,
  },
  settingsWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    shadowColor: "rgba(12, 4, 24, 0.6)",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10,
    transform: [{ scale: 1 }],
  },
  settingsWrapperPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  settingsBlur: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentTeal,
    shadowColor: "rgba(46, 230, 169, 0.8)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
});
