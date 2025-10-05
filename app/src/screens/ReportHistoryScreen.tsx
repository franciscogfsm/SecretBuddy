import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GradientBackground } from "../components/GradientBackground";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";
import {
  getUserSubmittedReports,
  type Report,
  getReasonText,
  getStatusText,
  getStatusColor,
} from "../services/reportService";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 375;

export const ReportHistoryScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userReports = await getUserSubmittedReports(user.uid);
      setReports(userReports);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const pendingReports = reports.filter((r) => r.status === "pending").length;
  const reviewedReports = reports.filter((r) => r.status !== "pending").length;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown date";
    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <GradientBackground gradient="midnight">
      {/* Header - Rounded gradient (matches Settings/Matches) */}
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
          <Text style={styles.title}>Report History</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <LinearGradient
            colors={["rgba(6, 182, 212, 0.15)", "rgba(139, 92, 246, 0.15)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoGradient}
          >
            <View style={styles.infoIconWrapper}>
              <Ionicons name="flag" size={28} color="#06B6D4" />
            </View>
            <Text style={styles.infoTitle}>Your Reports</Text>
            <Text style={styles.infoText}>
              We take all reports seriously. Our team reviews each report within
              24-48 hours and takes appropriate action to maintain a safe
              community.
            </Text>
          </LinearGradient>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={styles.statIconWrapper}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color="#8B5CF6"
              />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{reports.length}</Text>
              <Text style={styles.statLabel}>Total Reports</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={styles.statIconWrapper}>
              <Ionicons name="time-outline" size={24} color="#F59E0B" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{pendingReports}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={styles.statIconWrapper}>
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color="#10B981"
              />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{reviewedReports}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </View>
        </View>

        {/* Reports List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accentPurple} />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : reports.length > 0 ? (
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>
              {reports.length} {reports.length === 1 ? "Report" : "Reports"}{" "}
              Submitted
            </Text>

            {reports.map((report) => {
              const statusColor = getStatusColor(report.status);
              const statusLabel = getStatusText(report.status);

              return (
                <View key={report.id} style={styles.reportCard}>
                  {/* Report Header */}
                  <View style={styles.reportHeader}>
                    <View style={styles.reportUserInfo}>
                      <View style={styles.reportAvatar}>
                        <Ionicons name="person" size={20} color="#EF4444" />
                      </View>
                      <View style={styles.reportUserDetails}>
                        <Text style={styles.reportedUserName}>
                          User ID: {report.reportedUserId.substring(0, 8)}...
                        </Text>
                        <View style={styles.reportMeta}>
                          <Ionicons
                            name="calendar-outline"
                            size={12}
                            color={colors.textSecondary}
                          />
                          <Text style={styles.reportMetaText}>
                            Reported on {formatDate(report.timestamp)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusColor + "20",
                          borderColor: statusColor + "40",
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          report.status === "pending"
                            ? "time-outline"
                            : report.status === "reviewed"
                            ? "checkmark-circle-outline"
                            : "shield-checkmark-outline"
                        }
                        size={14}
                        color={statusColor}
                      />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Reason Badge */}
                  <View style={styles.reasonBadge}>
                    <Ionicons name="warning" size={14} color="#F59E0B" />
                    <Text style={styles.reasonText}>
                      {getReasonText(report.reason)}
                    </Text>
                  </View>

                  {/* Description */}
                  {report.details && (
                    <Text style={styles.reportDescription}>
                      {report.details}
                    </Text>
                  )}

                  {/* Action Message */}
                  {report.status === "reviewed" && (
                    <View style={styles.actionMessage}>
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color="#10B981"
                      />
                      <Text style={styles.actionMessageText}>
                        Our team has reviewed your report. Thank you for helping
                        keep SecretBuddy safe.
                      </Text>
                    </View>
                  )}

                  {report.status === "dismissed" && (
                    <View style={styles.actionMessage}>
                      <Ionicons
                        name="information-circle"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={styles.actionMessageText}>
                        After review, this report was dismissed.
                      </Text>
                    </View>
                  )}

                  {report.status === "pending" && (
                    <View style={styles.actionMessage}>
                      <Ionicons name="time" size={16} color="#F59E0B" />
                      <Text style={styles.actionMessageText}>
                        Your report is being reviewed by our team. We'll update
                        the status soon.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="shield-checkmark" size={64} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>No Reports Yet</Text>
            <Text style={styles.emptyText}>
              You haven't submitted any reports. If you encounter inappropriate
              behavior, use the report feature to let us know.
            </Text>
          </View>
        )}

        {/* Help Box */}
        <View style={styles.helpBox}>
          <View style={styles.helpHeader}>
            <Ionicons name="help-circle" size={24} color="#8B5CF6" />
            <Text style={styles.helpTitle}>Need Help?</Text>
          </View>
          <Text style={styles.helpText}>
            If you need immediate assistance or have questions about a report,
            contact our support team. We're here to help keep you safe.
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => {
              const email = "thesecretbuddyapp@gmail.com";
              const subject = encodeURIComponent(
                "Support request from SecretBuddy"
              );
              const body = encodeURIComponent(
                `Hi SecretBuddy support,%0D%0A%0D%0AI need help with... (please describe your issue)%0D%0A%0D%0AUser ID: ${
                  user?.uid ?? "unknown"
                }`
              );
              const mailto = `mailto:${email}?subject=${subject}&body=${body}`;
              // Open mail app
              try {
                //@ts-ignore
                Linking.openURL(mailto);
              } catch (error) {
                console.error("Error opening mail app:", error);
              }
            }}
          >
            <Ionicons name="mail-outline" size={18} color="#8B5CF6" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

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

  // (Replaced old inline header with roundedHeader above)

  // Info Card
  infoCard: {
    marginBottom: isSmallScreen ? 16 : 20,
  },

  infoGradient: {
    borderRadius: 24,
    padding: isSmallScreen ? 20 : 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
  },

  infoIconWrapper: {
    width: isSmallScreen ? 56 : 64,
    height: isSmallScreen ? 56 : 64,
    borderRadius: isSmallScreen ? 28 : 32,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: isSmallScreen ? 12 : 16,
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.3)",
  },

  infoTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: "700",
    marginBottom: isSmallScreen ? 8 : 10,
    textAlign: "center",
  },

  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 13 : 14,
    lineHeight: isSmallScreen ? 19 : 21,
    textAlign: "center",
    paddingHorizontal: isSmallScreen ? 8 : 12,
  },

  // Stats Card
  statsCard: {
    flexDirection: "row",
    backgroundColor: "rgba(6, 0, 18, 0.7)",
    borderRadius: 20,
    padding: isSmallScreen ? 14 : 16,
    marginBottom: isSmallScreen ? 20 : 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
    gap: isSmallScreen ? 6 : 8,
  },

  statIconWrapper: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 10 : 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  statContent: {
    alignItems: "center",
  },

  statValue: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: "800",
    marginBottom: 2,
  },

  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 11 : 12,
  },

  statDivider: {
    width: 1,
    height: "70%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignSelf: "center",
  },

  // List Container
  listContainer: {
    gap: isSmallScreen ? 10 : 12,
  },

  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "700",
    marginBottom: isSmallScreen ? 8 : 12,
    marginLeft: 4,
  },

  // Report Card
  reportCard: {
    backgroundColor: "rgba(6, 0, 18, 0.7)",
    borderRadius: 20,
    padding: isSmallScreen ? 16 : 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    gap: isSmallScreen ? 12 : 14,
  },

  reportHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  reportUserInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallScreen ? 10 : 12,
  },

  reportAvatar: {
    width: isSmallScreen ? 40 : 44,
    height: isSmallScreen ? 40 : 44,
    borderRadius: isSmallScreen ? 12 : 14,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },

  reportUserDetails: {
    flex: 1,
  },

  reportedUserName: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: "600",
    marginBottom: 4,
  },

  reportMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  reportMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 11 : 12,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 7,
    borderRadius: 12,
    borderWidth: 1,
  },

  statusText: {
    ...typography.caption,
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: "600",
  },

  reasonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: isSmallScreen ? 12 : 14,
    paddingVertical: isSmallScreen ? 8 : 9,
    borderRadius: 14,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },

  reasonText: {
    ...typography.subtitle,
    color: "#F59E0B",
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: "600",
  },

  reportDescription: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 13 : 14,
    lineHeight: isSmallScreen ? 19 : 21,
  },

  actionMessage: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: isSmallScreen ? 10 : 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  actionMessageText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 12 : 13,
    lineHeight: isSmallScreen ? 17 : 19,
    flex: 1,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: isSmallScreen ? 48 : 64,
    paddingHorizontal: isSmallScreen ? 24 : 32,
  },

  emptyIconWrapper: {
    width: isSmallScreen ? 96 : 120,
    height: isSmallScreen ? 96 : 120,
    borderRadius: isSmallScreen ? 48 : 60,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: isSmallScreen ? 20 : 24,
    borderWidth: 2,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },

  emptyTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: "700",
    marginBottom: isSmallScreen ? 10 : 12,
    textAlign: "center",
  },

  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: isSmallScreen ? 14 : 15,
    lineHeight: isSmallScreen ? 20 : 22,
    textAlign: "center",
    maxWidth: 280,
  },

  // Help Box
  helpBox: {
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 20,
    padding: isSmallScreen ? 18 : 20,
    borderWidth: 1.5,
    borderColor: "rgba(139, 92, 246, 0.3)",
    marginTop: isSmallScreen ? 16 : 20,
    gap: isSmallScreen ? 12 : 14,
  },

  helpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  helpTitle: {
    ...typography.subtitle,
    color: "#8B5CF6",
    fontSize: isSmallScreen ? 16 : 17,
    fontWeight: "700",
  },

  helpText: {
    ...typography.body,
    color: "rgba(196, 181, 253, 0.9)",
    fontSize: isSmallScreen ? 13 : 14,
    lineHeight: isSmallScreen ? 19 : 21,
  },

  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingVertical: isSmallScreen ? 10 : 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(139, 92, 246, 0.4)",
  },

  contactButtonText: {
    ...typography.subtitle,
    color: "#8B5CF6",
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: "600",
  },

  footerSpace: {
    height: 20,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },

  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
  },
  // Rounded header styles (copied from Matches/Settings)
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
  headerInnerLeft: {
    flexDirection: "column",
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  headerCentered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
});
