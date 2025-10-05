import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GradientBackground } from "../components/GradientBackground";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 375;

type Guideline = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  tips: string[];
};

const guidelines: Guideline[] = [
  {
    icon: "camera-outline",
    iconColor: "#8B5CF6",
    title: "Camera Rules",
    description: "Keep your identity mysterious until reveal time",
    tips: [
      "Always use back camera only",
      "Never flip to front camera or take selfies",
      "Keep yourself out of reflections and mirrors",
      "No photos of ID cards or documents",
    ],
  },
  {
    icon: "shield-checkmark-outline",
    iconColor: "#10B981",
    title: "Personal Safety",
    description: "Protect your privacy and stay safe",
    tips: [
      "Never share full name, address, or phone number",
      "Don't reveal your workplace or school location",
      "Keep conversations on the app",
      "Trust your instincts - if something feels wrong, report it",
    ],
  },
  {
    icon: "chatbubbles-outline",
    iconColor: "#F59E0B",
    title: "Respectful Communication",
    description: "Keep conversations friendly and appropriate",
    tips: [
      "Be kind and respectful at all times",
      "No harassment, bullying, or hate speech",
      "Respect boundaries if someone says no",
      "Keep content appropriate and family-friendly",
    ],
  },
  {
    icon: "images-outline",
    iconColor: "#EC4899",
    title: "Content Guidelines",
    description: "Share appropriate and safe content",
    tips: [
      "No explicit, violent, or disturbing content",
      "Don't share others' photos without permission",
      "No spam or promotional content",
      "Keep photos relevant to prompts",
    ],
  },
  {
    icon: "flag-outline",
    iconColor: "#EF4444",
    title: "Reporting & Blocking",
    description: "Use these tools to stay safe",
    tips: [
      "Report any inappropriate behavior immediately",
      "Block users who make you uncomfortable",
      "All reports are reviewed by our team",
      "False reports may result in account suspension",
    ],
  },
  {
    icon: "time-outline",
    iconColor: "#06B6D4",
    title: "Daily Participation",
    description: "Stay active to maintain your experience",
    tips: [
      "Share at least 1 photo daily to unlock reveals",
      "Only active participants can see reveals",
      "Respect the daily time windows",
      "Ghosting may result in temporary restrictions",
    ],
  },
];

export const SafetyGuidelinesScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const insets = useSafeAreaInsets();

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <GradientBackground gradient="midnight">
      {/* Header - Rounded gradient like Settings */}
      <LinearGradient
        colors={["rgba(0,0,0,0.9)", "#070319", "#1C0E3C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.roundedHeader, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}
          style={[
            styles.backButton,
            {
              position: "absolute",
              left: 12,
              top: insets.top + 12,
              zIndex: 30,
              elevation: 30,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCentered} pointerEvents="box-none">
          <Text style={styles.headerTitle}>Safety Guidelines</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={["rgba(139, 92, 246, 0.15)", "rgba(236, 72, 153, 0.15)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroIconWrapper}>
              <Ionicons name="shield-checkmark" size={48} color="#10B981" />
            </View>
            <Text style={styles.heroTitle}>Stay Safe & Have Fun</Text>
            <Text style={styles.heroSubtitle}>
              Follow these guidelines to ensure a positive experience for
              everyone in the SecretBuddy community
            </Text>
          </LinearGradient>
        </View>

        {/* Guidelines List */}
        <View style={styles.guidelinesContainer}>
          {guidelines.map((guideline, index) => (
            <View key={index} style={styles.guidelineCard}>
              <View style={styles.guidelineHeader}>
                <View
                  style={[
                    styles.guidelineIconWrapper,
                    { backgroundColor: guideline.iconColor + "20" },
                  ]}
                >
                  <Ionicons
                    name={guideline.icon}
                    size={24}
                    color={guideline.iconColor}
                  />
                </View>
                <View style={styles.guidelineHeaderText}>
                  <Text style={styles.guidelineTitle}>{guideline.title}</Text>
                  <Text style={styles.guidelineDescription}>
                    {guideline.description}
                  </Text>
                </View>
              </View>

              <View style={styles.guidelineTips}>
                {guideline.tips.map((tip, tipIndex) => (
                  <View key={tipIndex} style={styles.tipItem}>
                    <View style={styles.tipBullet}>
                      <View
                        style={[
                          styles.tipBulletDot,
                          { backgroundColor: guideline.iconColor },
                        ]}
                      />
                    </View>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Warning Box */}
        <View style={styles.warningBox}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={24} color="#F59E0B" />
            <Text style={styles.warningTitle}>Important Notice</Text>
          </View>
          <Text style={styles.warningText}>
            Violating these guidelines may result in warnings, temporary
            restrictions, or permanent account suspension. We review all reports
            carefully to maintain a safe community.
          </Text>
        </View>

        {/* Contact Support */}
        <TouchableOpacity style={styles.supportButton}>
          <View style={styles.supportButtonContent}>
            <Ionicons name="mail-outline" size={20} color="#8B5CF6" />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
        </TouchableOpacity>

        {/* Footer Space */}
        <View style={styles.footerSpace} />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingTop: 20,
    paddingBottom: 100,
  },

  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "rgba(6, 0, 18, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },

  headerTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  headerSpacer: {
    width: 44,
  },

  // Hero Section
  heroSection: {
    marginBottom: isSmallScreen ? 24 : 32,
  },

  heroGradient: {
    borderRadius: 24,
    padding: isSmallScreen ? 24 : 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },

  heroIconWrapper: {
    width: isSmallScreen ? 80 : 96,
    height: isSmallScreen ? 80 : 96,
    borderRadius: isSmallScreen ? 40 : 48,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: isSmallScreen ? 16 : 20,
    borderWidth: 2,
    borderColor: "rgba(16, 185, 129, 0.3)",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  heroTitle: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: "900",
    marginBottom: isSmallScreen ? 8 : 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 14 : 16,
    lineHeight: isSmallScreen ? 20 : 24,
    textAlign: "center",
    paddingHorizontal: isSmallScreen ? 8 : 16,
  },

  // Guidelines Container
  guidelinesContainer: {
    gap: isSmallScreen ? 12 : 16,
  },

  guidelineCard: {
    backgroundColor: "rgba(6, 0, 18, 0.7)",
    borderRadius: 20,
    padding: isSmallScreen ? 16 : 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  guidelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: isSmallScreen ? 14 : 16,
  },

  guidelineIconWrapper: {
    width: isSmallScreen ? 48 : 56,
    height: isSmallScreen ? 48 : 56,
    borderRadius: isSmallScreen ? 14 : 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: isSmallScreen ? 12 : 16,
  },

  guidelineHeaderText: {
    flex: 1,
  },

  guidelineTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.2,
  },

  guidelineDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 13 : 14,
    lineHeight: isSmallScreen ? 18 : 20,
  },

  guidelineTips: {
    gap: isSmallScreen ? 10 : 12,
  },

  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  tipBullet: {
    paddingTop: 6,
    paddingRight: 12,
  },

  tipBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  tipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 14 : 15,
    lineHeight: isSmallScreen ? 20 : 22,
    flex: 1,
  },

  // Warning Box
  warningBox: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 20,
    padding: isSmallScreen ? 18 : 20,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.3)",
    marginTop: isSmallScreen ? 20 : 24,
    marginBottom: isSmallScreen ? 16 : 20,
  },

  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  warningTitle: {
    ...typography.subtitle,
    color: "#F59E0B",
    fontSize: isSmallScreen ? 16 : 17,
    fontWeight: "700",
  },

  warningText: {
    ...typography.body,
    color: "rgba(252, 211, 77, 0.9)",
    fontSize: isSmallScreen ? 14 : 15,
    lineHeight: isSmallScreen ? 20 : 22,
  },

  // Support Button
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 18,
    borderWidth: 1.5,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },

  supportButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  supportButtonText: {
    ...typography.subtitle,
    color: "#8B5CF6",
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: "600",
  },

  footerSpace: {
    height: 20,
  },
  roundedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerCentered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
});
