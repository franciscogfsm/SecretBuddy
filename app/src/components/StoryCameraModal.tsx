import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography } from "../theme";

type StoryCameraModalProps = {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
};

export const StoryCameraModal: React.FC<StoryCameraModalProps> = ({
  visible,
  onClose,
  onCapture,
}) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const openCamera = async () => {
    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Camera Permission",
          "We need camera permission to let you post stories"
        );
        setIsCapturing(false);
        onClose();
        return;
      }

      // Launch camera (back camera, full vertical 9:16 format)
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // No editing to capture full 9:16 format
        quality: 0.8,
        cameraType: ImagePicker.CameraType.back,
      });

      // Check if user canceled
      if (result.canceled) {
        // User closed camera without taking photo
        setIsCapturing(false);
        onClose();
        return;
      }

      if (result.assets && result.assets[0]) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsCapturing(false);
        onCapture(result.assets[0].uri);
      } else {
        setIsCapturing(false);
        onClose();
      }
    } catch (error) {
      console.error("Error opening camera:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to open camera. Please try again.");
      setIsCapturing(false);
      onClose();
    }
  };

  // Auto-open camera when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      openCamera();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={["rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.95)"]}
          style={styles.loadingGradient}
        >
          {isCapturing && (
            <>
              <ActivityIndicator size="large" color="#9C6BFF" />
              <Text style={styles.loadingText}>Opening camera...</Text>
            </>
          )}

          {/* Close button - always visible to dismiss modal */}
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingGradient: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...typography.body,
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 16,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
