import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, typography } from "../theme";

interface BlockConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  userName: string;
}

export const BlockConfirmModal = ({
  visible,
  onClose,
  onConfirm,
  userName,
}: BlockConfirmModalProps) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim() || undefined);
      Alert.alert(
        "User Blocked",
        `${userName} has been blocked. They won't be able to contact you or see your profile.`,
        [{ text: "OK", onPress: handleClose }]
      );
    } catch (error) {
      Alert.alert(
        "Block Failed",
        "Unable to block this user. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <FontAwesome name="ban" size={48} color={colors.danger} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Block {userName}?</Text>

          {/* Warning */}
          <View style={styles.warningBox}>
            <MaterialIcons
              name="warning"
              size={20}
              color="rgba(255, 179, 0, 0.9)"
            />
            <Text style={styles.warningText}>
              This action will prevent {userName} from:
            </Text>
          </View>

          {/* Consequences List */}
          <View style={styles.consequencesList}>
            <View style={styles.consequenceItem}>
              <FontAwesome
                name="times-circle"
                size={14}
                color={colors.danger}
              />
              <Text style={styles.consequenceText}>
                Seeing your profile or activity
              </Text>
            </View>
            <View style={styles.consequenceItem}>
              <FontAwesome
                name="times-circle"
                size={14}
                color={colors.danger}
              />
              <Text style={styles.consequenceText}>
                Sending you messages or friend requests
              </Text>
            </View>
            <View style={styles.consequenceItem}>
              <FontAwesome
                name="times-circle"
                size={14}
                color={colors.danger}
              />
              <Text style={styles.consequenceText}>
                Being matched with you in future pools
              </Text>
            </View>
          </View>

          {/* Optional Reason */}
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Reason (Optional)</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Why are you blocking this user?"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              maxLength={200}
              editable={!isSubmitting}
              textAlignVertical="top"
            />
          </View>

          {/* Note */}
          <Text style={styles.noteText}>
            You can unblock users anytime from Settings → Blocked Users
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.blockButton,
                isSubmitting && styles.blockButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={isSubmitting}
            >
              <FontAwesome
                name="ban"
                size={16}
                color={colors.textPrimary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.blockButtonText}>
                {isSubmitting ? "Blocking..." : "Block User"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "rgba(11, 7, 32, 0.98)",
    borderRadius: 28,
    width: "100%",
    maxWidth: 420,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 138, 0.3)",
    shadowColor: "#FF6B8A",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
    gap: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 107, 138, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 107, 138, 0.3)",
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255, 179, 0, 0.1)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 179, 0, 0.3)",
  },
  warningText: {
    ...typography.body,
    color: "rgba(255, 179, 0, 0.95)",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  consequencesList: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  consequenceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  consequenceText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  reasonContainer: {
    gap: 10,
  },
  reasonLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  reasonInput: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  noteText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  blockButton: {
    flex: 1,
    backgroundColor: colors.danger,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  blockButtonDisabled: {
    opacity: 0.5,
  },
  blockButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
