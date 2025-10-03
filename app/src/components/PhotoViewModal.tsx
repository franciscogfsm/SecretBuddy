import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme";
import type { PhotoChallenge } from "../services/photoService";
import { ReportModal } from "./ReportModal";

interface PhotoViewModalProps {
  visible: boolean;
  photo: PhotoChallenge | null;
  onClose: () => void;
  onView: (photoId: string) => void;
  currentUserId: string; // For reporting
}

const { width, height } = Dimensions.get("window");

export const PhotoViewModal: React.FC<PhotoViewModalProps> = ({
  visible,
  photo,
  onClose,
  onView,
  currentUserId,
}) => {
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    // Preload image when modal opens
    if (visible && photo) {
      setLoading(true);
      setImageLoaded(false);

      // Preload image to avoid line-by-line loading
      if (photo.photoUrl) {
        Image.prefetch(photo.photoUrl)
          .then(() => {
            setImageLoaded(true);
            setLoading(false);
          })
          .catch((error) => {
            console.error("Error preloading image:", error);
            setLoading(false);
          });
      }
    }
  }, [visible, photo]);

  const handleGotIt = () => {
    if (photo && !photo.viewed) {
      onView(photo.id);
    }
    // The parent component will handle closing the modal
  };

  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleReportClose = () => {
    setShowReportModal(false);
    // Don't close the photo modal - let user decide
  };

  if (!photo) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          {/* Full screen image container */}
          <View style={styles.container}>
            {/* Challenge prompt badge - Top */}
            <View style={styles.topBar}>
              <View style={styles.promptBadge}>
                <Ionicons name="camera" size={16} color={colors.accentPurple} />
                <Text style={styles.promptLabel}>CHALLENGE</Text>
              </View>
            </View>

            {/* Photo - Full screen */}
            <View style={styles.photoContainer}>
              {loading && !imageLoaded ? (
                // Loading state
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.accentTeal} />
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : (
                // Show photo directly - full screen
                <Image
                  source={{ uri: photo.photoUrl }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              )}
            </View>

            {/* Bottom bar with prompt text and buttons */}
            <View style={styles.bottomBar}>
              <Text style={styles.promptText}>{photo.prompt}</Text>

              {/* Action buttons row */}
              <View style={styles.actionButtonsRow}>
                {/* Report button */}
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={handleReport}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flag" size={20} color={colors.danger} />
                  <Text style={styles.reportButtonText}>Report</Text>
                </TouchableOpacity>

                {/* Got it button */}
                <TouchableOpacity
                  style={styles.gotItButton}
                  onPress={handleGotIt}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#000000" />
                  <Text style={styles.gotItButtonText}>Got it!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      {photo && (
        <ReportModal
          visible={showReportModal}
          onClose={handleReportClose}
          reportType="photo"
          reportedUserId={photo.senderId}
          reportingUserId={currentUserId}
          targetName="Photo"
          photoUrl={photo.photoUrl} // Pass the photo URL
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000000", // Pure black background
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
    backgroundColor:
      "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
  },
  promptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
    alignSelf: "flex-start",
  },
  promptLabel: {
    ...typography.caption,
    color: colors.accentPurple,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  photoContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 30,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  promptText: {
    ...typography.title,
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 107, 138, 0.15)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 138, 0.3)",
    flex: 1,
  },
  reportButtonText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: "700",
    fontSize: 15,
  },
  gotItButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.accentTeal,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    flex: 2,
    shadowColor: colors.accentTeal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  gotItButtonText: {
    ...typography.body,
    color: "#000000",
    fontWeight: "700",
    fontSize: 16,
  },
});
