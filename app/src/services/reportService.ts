import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getUserProfile } from "./userService";

export type ReportReason =
  | "inappropriate_content"
  | "harassment"
  | "spam"
  | "fake_profile"
  | "offensive_language"
  | "other";

export interface Report {
  id: string;
  reportedUserId: string;
  reportingUserId: string;
  reason: ReportReason;
  details?: string;
  timestamp: any;
  status: "pending" | "reviewed" | "dismissed";
  reviewedAt?: any;
  reviewedBy?: string;
  photoUrl?: string; // For photo reports
  reportType?: "user" | "photo" | "message"; // Type of report
}

export interface UserReportSummary {
  userId: string;
  reportCount: number;
  lastReportedAt: any;
  activeReports: string[];
  isBanned: boolean;
}

const REPORTS_COLLECTION = "reports";
const USER_REPORTS_COLLECTION = "userReports";
const AUTO_BAN_THRESHOLD = 5; // Ban after 5 unique reports

/**
 * Report a user or content (photo/message)
 * Prevents duplicate reports from the same user
 */
export const reportUser = async (
  reportingUserId: string,
  reportedUserId: string,
  reason: ReportReason,
  details?: string,
  photoUrl?: string,
  reportType?: "user" | "photo" | "message"
): Promise<{ success: boolean; message: string; reportId?: string }> => {
  try {
    // 1. Check if user has already reported this person
    const existingReport = await hasUserReported(
      reportingUserId,
      reportedUserId
    );

    if (existingReport && !photoUrl) {
      // Allow multiple photo reports, but not duplicate user reports
      return {
        success: false,
        message: "You have already reported this user",
      };
    }

    // 2. Create new report document
    const reportsRef = collection(db, REPORTS_COLLECTION);
    const newReportRef = doc(reportsRef);

    const reportData: Omit<Report, "id"> = {
      reportedUserId,
      reportingUserId,
      reason,
      details,
      timestamp: serverTimestamp(),
      status: "pending",
      ...(photoUrl && { photoUrl }), // Add photo URL if provided
      ...(reportType && { reportType }), // Add report type if provided
    };

    await setDoc(newReportRef, reportData);

    console.log(`✅ ${reportType || "User"} report created:`, newReportRef.id);

    // 3. Update or create userReports summary
    const userReportRef = doc(db, USER_REPORTS_COLLECTION, reportedUserId);
    const userReportDoc = await getDoc(userReportRef);

    if (userReportDoc.exists()) {
      // Update existing summary
      const currentData = userReportDoc.data() as UserReportSummary;
      const newReportCount = (currentData.reportCount || 0) + 1;

      await updateDoc(userReportRef, {
        reportCount: increment(1),
        lastReportedAt: serverTimestamp(),
        activeReports: arrayUnion(newReportRef.id),
        // Auto-ban if threshold reached
        isBanned: newReportCount >= AUTO_BAN_THRESHOLD,
      });

      console.log(
        `✅ Report added. User now has ${newReportCount} reports${
          newReportCount >= AUTO_BAN_THRESHOLD ? " - AUTO BANNED" : ""
        }`
      );
    } else {
      // Create new summary
      await setDoc(userReportRef, {
        userId: reportedUserId,
        reportCount: 1,
        lastReportedAt: serverTimestamp(),
        activeReports: [newReportRef.id],
        isBanned: false,
      });

      console.log("✅ First report created for user");
    }

    return {
      success: true,
      message: "Report submitted successfully",
      reportId: newReportRef.id,
    };
  } catch (error) {
    console.error("❌ Error reporting user:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to submit report",
    };
  }
};

/**
 * Check if a user has already reported another user
 */
export const hasUserReported = async (
  reportingUserId: string,
  reportedUserId: string
): Promise<boolean> => {
  try {
    const reportsRef = collection(db, REPORTS_COLLECTION);
    const q = query(
      reportsRef,
      where("reportingUserId", "==", reportingUserId),
      where("reportedUserId", "==", reportedUserId)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("❌ Error checking existing report:", error);
    return false; // Fail safe - allow report if check fails
  }
};

/**
 * Get all reports submitted by a user (for history screen)
 */
export const getUserSubmittedReports = async (
  userId: string
): Promise<Report[]> => {
  try {
    const reportsRef = collection(db, REPORTS_COLLECTION);
    const q = query(reportsRef, where("reportingUserId", "==", userId));

    const querySnapshot = await getDocs(q);
    const reports: Report[] = [];

    for (const docSnap of querySnapshot.docs) {
      const reportData = docSnap.data() as Omit<Report, "id">;
      reports.push({
        id: docSnap.id,
        ...reportData,
      });
    }

    // Sort by timestamp descending (newest first)
    reports.sort((a, b) => {
      const timeA =
        a.timestamp?.seconds || a.timestamp?._seconds || Date.now() / 1000;
      const timeB =
        b.timestamp?.seconds || b.timestamp?._seconds || Date.now() / 1000;
      return timeB - timeA;
    });

    console.log(`✅ Found ${reports.length} reports submitted by user`);
    return reports;
  } catch (error) {
    console.error("❌ Error getting user reports:", error);
    throw error;
  }
};

/**
 * Get all reports against a specific user (for admin review)
 */
export const getReportsAgainstUser = async (
  userId: string
): Promise<Report[]> => {
  try {
    const reportsRef = collection(db, REPORTS_COLLECTION);
    const q = query(reportsRef, where("reportedUserId", "==", userId));

    const querySnapshot = await getDocs(q);
    const reports: Report[] = [];

    for (const docSnap of querySnapshot.docs) {
      const reportData = docSnap.data() as Omit<Report, "id">;
      reports.push({
        id: docSnap.id,
        ...reportData,
      });
    }

    console.log(`✅ Found ${reports.length} reports against user`);
    return reports;
  } catch (error) {
    console.error("❌ Error getting reports against user:", error);
    throw error;
  }
};

/**
 * Get report summary for a user
 */
export const getUserReportSummary = async (
  userId: string
): Promise<UserReportSummary | null> => {
  try {
    const userReportRef = doc(db, USER_REPORTS_COLLECTION, userId);
    const userReportDoc = await getDoc(userReportRef);

    if (!userReportDoc.exists()) {
      return null;
    }

    return userReportDoc.data() as UserReportSummary;
  } catch (error) {
    console.error("❌ Error getting user report summary:", error);
    return null;
  }
};

/**
 * Check if a user is banned
 */
export const isUserBanned = async (userId: string): Promise<boolean> => {
  try {
    const summary = await getUserReportSummary(userId);
    return summary?.isBanned || false;
  } catch (error) {
    console.error("❌ Error checking ban status:", error);
    return false;
  }
};

/**
 * Delete a report (admin only - for dismissing false reports)
 */
export const deleteReport = async (
  reportId: string,
  reportedUserId: string
): Promise<void> => {
  try {
    // 1. Delete the report document
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    await deleteDoc(reportRef);

    // 2. Update userReports summary
    const userReportRef = doc(db, USER_REPORTS_COLLECTION, reportedUserId);
    const userReportDoc = await getDoc(userReportRef);

    if (userReportDoc.exists()) {
      const currentData = userReportDoc.data() as UserReportSummary;
      const newReportCount = Math.max((currentData.reportCount || 1) - 1, 0);

      await updateDoc(userReportRef, {
        reportCount: increment(-1),
        activeReports: arrayRemove(reportId),
        // Unban if count drops below threshold
        isBanned: newReportCount >= AUTO_BAN_THRESHOLD,
      });
    }

    console.log("✅ Report deleted");
  } catch (error) {
    console.error("❌ Error deleting report:", error);
    throw error;
  }
};

/**
 * Get report reason display text
 */
export const getReasonText = (reason: ReportReason): string => {
  const reasonMap: Record<ReportReason, string> = {
    inappropriate_content: "Inappropriate Content",
    harassment: "Harassment",
    spam: "Spam",
    fake_profile: "Fake Profile",
    offensive_language: "Offensive Language",
    other: "Other",
  };

  return reasonMap[reason] || "Unknown";
};

/**
 * Get report status display text
 */
export const getStatusText = (
  status: "pending" | "reviewed" | "dismissed"
): string => {
  const statusMap = {
    pending: "Under Review",
    reviewed: "Action Taken",
    dismissed: "Dismissed",
  };

  return statusMap[status] || "Unknown";
};

/**
 * Get report status color
 */
export const getStatusColor = (
  status: "pending" | "reviewed" | "dismissed"
): string => {
  const colorMap = {
    pending: "#F59E0B", // Amber
    reviewed: "#10B981", // Green
    dismissed: "#6B7280", // Gray
  };

  return colorMap[status] || "#6B7280";
};
