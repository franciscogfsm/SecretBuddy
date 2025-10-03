import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { colors, typography } from "../theme";
import { reportUser, type ReportReason } from "../services/reportService";

type ReportCategory = ReportReason;

type ReportType = "user" | "photo" | "message";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportType: ReportType;
  targetName?: string;
  reportedUserId: string; // User being reported
  reportingUserId: string; // User making the report
  photoUrl?: string; // Photo URL for photo reports
}

const reportCategories: {
  key: ReportCategory;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    key: "inappropriate_content",
    label: "Inappropriate Content",
    icon: "warning",
    description: "Sexual, violent, or offensive material",
  },
  {
    key: "harassment",
    label: "Harassment or Bullying",
    icon: "exclamation-triangle",
    description: "Threatening, hateful, or abusive behavior",
  },
  {
    key: "spam",
    label: "Spam or Scam",
    icon: "ban",
    description: "Unwanted promotional content or fraud",
  },
  {
    key: "fake_profile",
    label: "Fake Profile",
    icon: "user-times",
    description: "Impersonation or misleading identity",
  },
  {
    key: "offensive_language",
    label: "Offensive Language",
    icon: "eye-slash",
    description: "Hate speech or discriminatory content",
  },
  {
    key: "other",
    label: "Other",
    icon: "ellipsis-h",
    description: "Something else that violates our policies",
  },
];

export const ReportModal = ({
  visible,
  onClose,
  reportType,
  targetName,
  reportedUserId,
  reportingUserId,
  photoUrl,
}: ReportModalProps) => {
  const [selectedCategory, setSelectedCategory] =
    useState<ReportCategory | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert("Select a Category", "Please select a reason for reporting.");
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert(
        "Add Details",
        "Please provide at least 10 characters describing the issue."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await reportUser(
        reportingUserId,
        reportedUserId,
        selectedCategory,
        description.trim(),
        photoUrl, // Pass photo URL
        reportType // Pass report type
      );

      if (result.success) {
        Alert.alert(
          "Report Submitted",
          "Thank you for helping keep SecretBuddy safe. We'll review this report promptly.",
          [{ text: "OK", onPress: handleClose }]
        );
      } else {
        Alert.alert("Report Failed", result.message);
        setIsSubmitting(false);
      }
    } catch (error) {
      Alert.alert(
        "Submission Failed",
        "Unable to submit your report. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setDescription("");
    setIsSubmitting(false);
    onClose();
  };

  const getReportTitle = () => {
    switch (reportType) {
      case "user":
        return `Report ${targetName || "User"}`;
      case "photo":
        return "Report Photo";
      case "message":
        return "Report Message";
      default:
        return "Report Content";
    }
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="report" size={24} color={colors.danger} />
            </View>
            <Text style={styles.title}>{getReportTitle()}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <FontAwesome
                name="times"
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Subtitle */}
            <Text style={styles.subtitle}>
              Help us understand what's wrong. Your report is confidential.
            </Text>

            {/* Categories */}
            <View style={styles.categoriesContainer}>
              {reportCategories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryCard,
                    selectedCategory === category.key &&
                      styles.categoryCardSelected,
                  ]}
                  onPress={() => setSelectedCategory(category.key)}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeader}>
                    <View
                      style={[
                        styles.categoryIconContainer,
                        selectedCategory === category.key &&
                          styles.categoryIconContainerSelected,
                      ]}
                    >
                      <FontAwesome
                        name={category.icon as any}
                        size={18}
                        color={
                          selectedCategory === category.key
                            ? colors.danger
                            : colors.textSecondary
                        }
                      />
                    </View>
                    <View style={styles.categoryTextContainer}>
                      <Text
                        style={[
                          styles.categoryLabel,
                          selectedCategory === category.key &&
                            styles.categoryLabelSelected,
                        ]}
                      >
                        {category.label}
                      </Text>
                      <Text style={styles.categoryDescription}>
                        {category.description}
                      </Text>
                    </View>
                    {selectedCategory === category.key && (
                      <FontAwesome
                        name="check-circle"
                        size={20}
                        color={colors.danger}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description Input */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>
                Additional Details (Required)
              </Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Please describe what happened..."
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={500}
                editable={!isSubmitting}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {description.length}/500 characters
              </Text>
            </View>

            {/* Warning */}
            <View style={styles.warningContainer}>
              <FontAwesome
                name="info-circle"
                size={16}
                color={colors.accentTeal}
              />
              <Text style={styles.warningText}>
                False reports may result in account suspension. Please only
                report genuine violations.
              </Text>
            </View>
          </ScrollView>

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
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
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
    maxWidth: 500,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 138, 0.3)",
    shadowColor: "#FF6B8A",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 107, 138, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    maxHeight: "70%",
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  categoriesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  categoryCardSelected: {
    backgroundColor: "rgba(255, 107, 138, 0.12)",
    borderColor: colors.danger,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconContainerSelected: {
    backgroundColor: "rgba(255, 107, 138, 0.2)",
  },
  categoryTextContainer: {
    flex: 1,
    gap: 4,
  },
  categoryLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  categoryLabelSelected: {
    color: colors.danger,
  },
  categoryDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  descriptionContainer: {
    gap: 12,
    marginBottom: 20,
  },
  descriptionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  descriptionInput: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 16,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  characterCount: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "right",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(46, 230, 169, 0.08)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(46, 230, 169, 0.2)",
    marginBottom: 20,
  },
  warningText: {
    ...typography.caption,
    color: "rgba(46, 230, 169, 0.9)",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    padding: 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
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
  submitButton: {
    flex: 1,
    backgroundColor: colors.danger,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
