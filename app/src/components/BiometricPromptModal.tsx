import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { colors } from "../theme";

interface BiometricPromptModalProps {
  visible: boolean;
  biometricName: string;
  email: string;
  isDifferentAccount: boolean;
  onEnable: () => void;
  onCancel: () => void;
}

export const BiometricPromptModal: React.FC<BiometricPromptModalProps> = ({
  visible,
  biometricName,
  email,
  isDifferentAccount,
  onEnable,
  onCancel,
}) => {
  const iconName =
    biometricName.toLowerCase().includes("face") ||
    biometricName.toLowerCase().includes("facial")
      ? "face-recognition"
      : "fingerprint";

  const title = isDifferentAccount
    ? `Switch to ${biometricName}?`
    : `Enable ${biometricName}?`;

  const message = isDifferentAccount
    ? `Replace saved account with ${email} for quick login?`
    : `Use ${biometricName} for quick and secure login next time.`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill}>
          <View style={styles.centeredView}>
            <View style={styles.modalContent}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={iconName}
                  size={48}
                  color={colors.accentPurple}
                />
              </View>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Message */}
              <Text style={styles.message}>{message}</Text>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Not Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.enableButton]}
                  onPress={onEnable}
                  activeOpacity={0.7}
                >
                  <Text style={styles.enableButtonText}>
                    {isDifferentAccount ? "Switch" : "Enable"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.accentPurple}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  enableButton: {
    backgroundColor: colors.accentPurple,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
