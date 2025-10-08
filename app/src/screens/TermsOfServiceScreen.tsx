import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientBackground } from "../components/GradientBackground";
import { TopHeader } from "../components/TopHeader";
import { colors, typography } from "../theme";

export const TermsOfServiceScreen = () => {
  return (
    <GradientBackground gradient="midnight">
      <TopHeader />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last Updated: October 5, 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.body}>
            By accessing or using SecretBuddy, you agree to be bound by these
            Terms of Service. If you do not agree to these Terms, you may not
            use the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Eligibility</Text>
          <Text style={styles.body}>
            You must be at least 13 years old to use SecretBuddy. Users between
            13-17 years old must have parental or guardian consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Conduct</Text>
          <Text style={styles.body}>
            You agree not to upload, share, or transmit content that contains:
          </Text>
          <Text style={styles.bullet}>
            • Nudity, sexual content, or sexually suggestive material
          </Text>
          <Text style={styles.bullet}>
            • Violence, harm, or illegal activities
          </Text>
          <Text style={styles.bullet}>
            • Hate speech, harassment, bullying, or discrimination
          </Text>
          <Text style={styles.bullet}>
            • Personal information of others without consent
          </Text>
          <Text style={styles.bullet}>• Spam, fraud, or deceptive content</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Photo Guidelines</Text>
          <Text style={styles.bullet}>
            • Photos must be appropriate for all ages
          </Text>
          <Text style={styles.bullet}>
            • No screenshots or photos of private content
          </Text>
          <Text style={styles.bullet}>
            • Photos must be taken by you (no copyrighted images)
          </Text>
          <Text style={styles.bullet}>
            • No identifying information of minors
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Content Rights</Text>
          <Text style={styles.body}>
            You retain all rights to the photos and content you upload. You
            grant SecretBuddy a license to use, store, and display your content
            for operating the App. This license ends when you delete your
            content or account.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Photo Handling</Text>
          <Text style={styles.body}>
            Photos are stored temporarily (up to 24 hours) and automatically
            deleted after being viewed or after expiration. Deleted photos
            cannot be recovered.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Points and Virtual Items</Text>
          <Text style={styles.body}>
            Points, streaks, hearts, and badges have no real-world monetary
            value and cannot be exchanged for cash. We reserve the right to
            modify or discontinue virtual items at any time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Safety Features</Text>
          <Text style={styles.body}>
            Users can report inappropriate content or behavior and block others
            to prevent future pairing. We investigate all reports and may
            suspend or terminate accounts that violate these Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Account Termination</Text>
          <Text style={styles.body}>
            You may delete your account at any time. Account deletion is
            permanent and cannot be undone. We may suspend or terminate your
            account if you violate these Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Disclaimers</Text>
          <Text style={styles.body}>
            THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES. We do not control
            user behavior or content and are not responsible for interactions
            between users.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
          <Text style={styles.body}>
            To the maximum extent permitted by law, we are not liable for any
            indirect, incidental, or consequential damages arising from your use
            of the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Changes to Terms</Text>
          <Text style={styles.body}>
            We may modify these Terms at any time. Changes will be effective
            upon posting. Continued use after changes constitutes acceptance.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Contact Information</Text>
          <Text style={styles.body}>
            For questions about these Terms:{"\n"}
            Email: thesecretbuddyapp@gmail.com{"\n"}
            Legal inquiries: thesecretbuddyapp@gmail.com
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using SecretBuddy, you acknowledge that you have read,
            understood, and agree to be bound by these Terms of Service.
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
  body: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.85,
    lineHeight: 22,
  },
  bullet: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.85,
    lineHeight: 22,
    marginLeft: 8,
    marginTop: 4,
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
