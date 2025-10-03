import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, typography } from "../theme";
import { ENCRYPTION_INFO } from "../services/encryptionService";

/**
 * 🔐 Security Badge Component
 *
 * Displays security information to give users confidence
 * Shows encryption status and security features
 */

type SecurityBadgeProps = {
  variant?: "compact" | "full";
  showModal?: boolean;
};

export const SecurityBadge = ({
  variant = "compact",
  showModal = true,
}: SecurityBadgeProps) => {
  const [modalVisible, setModalVisible] = useState(false);

  if (variant === "compact") {
    return (
      <>
        <Pressable
          style={styles.compactBadge}
          onPress={() => showModal && setModalVisible(true)}
        >
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={styles.compactText}>End-to-End Encrypted</Text>
        </Pressable>

        {showModal && (
          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setModalVisible(false)}
            >
              <Pressable
                style={styles.modalContent}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.modalHeader}>
                  <Ionicons name="shield-checkmark" size={32} color="#10B981" />
                  <Text style={styles.modalTitle}>
                    Your Privacy is Protected
                  </Text>
                </View>

                <ScrollView style={styles.modalBody}>
                  <SecurityFeature
                    icon="lock-closed"
                    title="End-to-End Encryption"
                    description="All messages are encrypted with AES-256 before being sent. Only you and your chat partner can read them."
                  />

                  <SecurityFeature
                    icon="shield-half"
                    title="Secure Storage"
                    description="Encryption keys are stored in your device's secure hardware (Keychain/Keystore)."
                  />

                  <SecurityFeature
                    icon="trash"
                    title="Auto-Delete"
                    description="Conversations automatically delete 3 days after creation for privacy."
                  />

                  <SecurityFeature
                    icon="eye-off"
                    title="No Message Storage"
                    description="Even we can't read your messages. They're encrypted on your device."
                  />

                  <SecurityFeature
                    icon="checkmark-done"
                    title="Tamper Detection"
                    description="HMAC verification ensures messages haven't been modified."
                  />

                  <View style={styles.techSpecs}>
                    <Text style={styles.techTitle}>
                      Technical Specifications
                    </Text>
                    <View style={styles.techItem}>
                      <Text style={styles.techLabel}>Algorithm:</Text>
                      <Text style={styles.techValue}>
                        {ENCRYPTION_INFO.algorithm}
                      </Text>
                    </View>
                    <View style={styles.techItem}>
                      <Text style={styles.techLabel}>Key Size:</Text>
                      <Text style={styles.techValue}>
                        {ENCRYPTION_INFO.keySize} bits
                      </Text>
                    </View>
                    <View style={styles.techItem}>
                      <Text style={styles.techLabel}>Integrity:</Text>
                      <Text style={styles.techValue}>
                        {ENCRYPTION_INFO.integrity}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <Pressable
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Got it</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </>
    );
  }

  // Full variant - for settings page
  return (
    <View style={styles.fullBadge}>
      <View style={styles.fullHeader}>
        <Ionicons name="shield-checkmark" size={24} color="#10B981" />
        <Text style={styles.fullTitle}>Security & Privacy</Text>
      </View>

      <SecurityFeature
        icon="lock-closed"
        title="End-to-End Encryption"
        description="Military-grade AES-256 encryption"
        compact
      />

      <SecurityFeature
        icon="shield-half"
        title="Secure Storage"
        description="Hardware-backed key storage"
        compact
      />

      <SecurityFeature
        icon="trash"
        title="Auto-Delete"
        description="Messages delete after 3 days"
        compact
      />

      {showModal && (
        <Pressable
          style={styles.learnMoreButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.learnMoreText}>Learn More</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.accentPurple}
          />
        </Pressable>
      )}
    </View>
  );
};

type SecurityFeatureProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  compact?: boolean;
};

const SecurityFeature = ({
  icon,
  title,
  description,
  compact = false,
}: SecurityFeatureProps) => {
  return (
    <View style={[styles.feature, compact && styles.featureCompact]}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color="#10B981" />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact badge styles
  compactBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    gap: 6,
  },
  compactText: {
    ...typography.caption,
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },

  // Full badge styles
  fullBadge: {
    backgroundColor: "rgba(6, 0, 18, 0.6)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  fullHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  fullTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },

  // Feature styles
  feature: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  featureCompact: {
    marginBottom: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  featureDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1A1A2E",
    borderRadius: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  modalHeader: {
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
  modalBody: {
    padding: 24,
  },

  // Tech specs styles
  techSpecs: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  techTitle: {
    ...typography.body,
    color: "#10B981",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  techItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  techLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  techValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },

  // Button styles
  closeButton: {
    margin: 24,
    marginTop: 16,
    padding: 16,
    backgroundColor: "#10B981",
    borderRadius: 12,
    alignItems: "center",
  },
  closeButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  learnMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 6,
  },
  learnMoreText: {
    ...typography.body,
    color: colors.accentPurple,
    fontSize: 14,
    fontWeight: "600",
  },
});
