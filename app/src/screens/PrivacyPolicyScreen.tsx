import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientBackground } from "../components/GradientBackground";
import { TopHeader } from "../components/TopHeader";
import { colors, typography } from "../theme";

export const PrivacyPolicyScreen = () => {
  return (
    <GradientBackground gradient="midnight">
      <TopHeader />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: October 5, 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.body}>
            SecretBuddy is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your
            information when you use our mobile application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.subtitle}>Account Information:</Text>
          <Text style={styles.bullet}>• Display name and email address</Text>
          <Text style={styles.bullet}>• Username, age, and country</Text>
          <Text style={styles.bullet}>• Profile photo and bio (optional)</Text>

          <Text style={styles.subtitle}>User-Generated Content:</Text>
          <Text style={styles.bullet}>• Photos you upload and share</Text>
          <Text style={styles.bullet}>• Messages sent through chat</Text>

          <Text style={styles.subtitle}>Automatically Collected:</Text>
          <Text style={styles.bullet}>• Device information and IP address</Text>
          <Text style={styles.bullet}>• Usage data and app interactions</Text>
          <Text style={styles.bullet}>
            • Points, streaks, and pairing history
          </Text>
          <Text style={styles.bullet}>
            • Country/region (NOT precise GPS location)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            3. How We Use Your Information
          </Text>
          <Text style={styles.bullet}>
            • Match you with other users (mystery buddies)
          </Text>
          <Text style={styles.bullet}>
            • Enable photo sharing and messaging
          </Text>
          <Text style={styles.bullet}>
            • Calculate points, streaks, and leaderboards
          </Text>
          <Text style={styles.bullet}>
            • Send push notifications about matches
          </Text>
          <Text style={styles.bullet}>
            • Analyze app usage and improve features
          </Text>
          <Text style={styles.bullet}>
            • Detect and prevent fraud and abuse
          </Text>
          <Text style={styles.bullet}>• Comply with legal obligations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. How We Share Information</Text>
          <Text style={styles.subtitle}>With Other Users:</Text>
          <Text style={styles.bullet}>
            • Display name and profile photo (after reveal)
          </Text>
          <Text style={styles.bullet}>
            • Photos you share with matched buddies
          </Text>
          <Text style={styles.bullet}>
            • Public profile info (bio, points, badges)
          </Text>
          <Text style={[styles.bullet, styles.highlight]}>
            ✓ We do NOT share your email or private info
          </Text>

          <Text style={styles.subtitle}>With Service Providers:</Text>
          <Text style={styles.bullet}>
            • Firebase (Google) - infrastructure
          </Text>
          <Text style={styles.bullet}>• Expo - push notifications</Text>
          <Text style={[styles.bullet, styles.highlight]}>
            ✓ We do NOT sell your personal information
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Retention</Text>
          <Text style={styles.subtitle}>Photos (Temporary):</Text>
          <Text style={styles.bullet}>
            • Automatically deleted after 24 hours
          </Text>
          <Text style={styles.bullet}>• Deleted when viewed by recipient</Text>
          <Text style={styles.bullet}>• Deleted after 4 hours if unviewed</Text>
          <Text style={[styles.bullet, styles.highlight]}>
            ✓ Deleted photos cannot be recovered
          </Text>

          <Text style={styles.subtitle}>Account Data:</Text>
          <Text style={styles.bullet}>• Retained while account is active</Text>
          <Text style={styles.bullet}>• Can be deleted anytime by you</Text>

          <Text style={styles.subtitle}>Messages:</Text>
          <Text style={styles.bullet}>• Stored for up to 2 days</Text>
          <Text style={styles.bullet}>• Automatically cleaned up daily</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Privacy Rights</Text>
          <Text style={styles.bullet}>
            ✓ Access and view your account information
          </Text>
          <Text style={styles.bullet}>
            ✓ Update or correct your information
          </Text>
          <Text style={styles.bullet}>
            ✓ Delete your account and data (permanent)
          </Text>
          <Text style={styles.bullet}>✓ Opt out of promotional emails</Text>
          <Text style={styles.bullet}>
            ✓ Disable push notifications in settings
          </Text>
          <Text style={styles.bullet}>
            ✓ Request a copy of your data (email us)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
          <Text style={styles.body}>
            SecretBuddy is for users 13 years and older. Users under 18 should
            have parental consent. We comply with COPPA (US) and GDPR (EU) for
            minors.
          </Text>
          <Text style={styles.body}>
            If you believe your child is using the App without consent, contact
            us immediately at thesecretbuddyapp@gmail.com
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Data Security</Text>
          <Text style={styles.bullet}>
            ✓ Data encrypted in transit (HTTPS) and at rest
          </Text>
          <Text style={styles.bullet}>
            ✓ Firebase enterprise-grade security
          </Text>
          <Text style={styles.bullet}>✓ Limited employee data access</Text>
          <Text style={styles.bullet}>
            ✓ Secure authentication via Firebase Auth
          </Text>
          <Text style={styles.bullet}>✓ Regular security audits</Text>
          <Text style={styles.body}>
            No system is 100% secure. Use strong passwords and report suspicious
            activity.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
          <Text style={styles.body}>
            The App integrates with Firebase (Google), Expo, and authentication
            providers (Google, Apple). Each has its own privacy policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            10. California & EU Privacy Rights
          </Text>
          <Text style={styles.subtitle}>California (CCPA):</Text>
          <Text style={styles.bullet}>
            • Right to know what data is collected
          </Text>
          <Text style={styles.bullet}>
            • Right to delete personal information
          </Text>
          <Text style={styles.bullet}>• Right to opt out of data "sale"</Text>
          <Text style={[styles.bullet, styles.highlight]}>
            ✓ We do NOT sell personal information
          </Text>

          <Text style={styles.subtitle}>European Union (GDPR):</Text>
          <Text style={styles.bullet}>• Right to access your data</Text>
          <Text style={styles.bullet}>• Right to data portability</Text>
          <Text style={styles.bullet}>
            • Right to erasure ("right to be forgotten")
          </Text>
          <Text style={styles.bullet}>• Right to object to processing</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
          <Text style={styles.body}>
            We may update this Privacy Policy periodically. Material changes
            will be notified via email or in-app notification. Check the "Last
            Updated" date regularly.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.body}>
            Privacy inquiries: thesecretbuddyapp@gmail.com{"\n"}
            Data Protection Officer: thesecretbuddyapp@gmail.com{"\n"}
            Security issues: thesecretbuddyapp@gmail.com{"\n"}
            General support: thesecretbuddyapp@gmail.com
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Summary of Key Points:</Text>
          <Text style={styles.summaryItem}>
            ✅ We collect account info, photos, and usage data
          </Text>
          <Text style={styles.summaryItem}>
            ✅ Photos are automatically deleted after 24 hours
          </Text>
          <Text style={styles.summaryItem}>
            ✅ We do NOT sell your personal information
          </Text>
          <Text style={styles.summaryItem}>
            ✅ We use Firebase for secure infrastructure
          </Text>
          <Text style={styles.summaryItem}>
            ✅ You can delete your account and data anytime
          </Text>
          <Text style={styles.summaryItem}>
            ✅ We comply with GDPR, CCPA, and COPPA
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using SecretBuddy, you consent to the collection and use of
            information as described in this Privacy Policy.
          </Text>
          <Text style={styles.copyright}>
            © 2025 SecretBuddy. All rights reserved.
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  lastUpdated: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.85,
    lineHeight: 22,
    marginTop: 4,
  },
  bullet: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.85,
    lineHeight: 22,
    marginLeft: 8,
    marginTop: 4,
  },
  highlight: {
    color: colors.accentTeal,
    fontWeight: "600",
    opacity: 1,
  },
  summaryBox: {
    backgroundColor: "rgba(11, 5, 32, 0.85)",
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(156, 107, 255, 0.2)",
  },
  summaryTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  summaryItem: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.9,
    lineHeight: 24,
    marginTop: 6,
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  footerText: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.85,
    lineHeight: 22,
    marginBottom: 16,
    fontStyle: "italic",
  },
  copyright: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  spacer: {
    height: 60,
  },
});
