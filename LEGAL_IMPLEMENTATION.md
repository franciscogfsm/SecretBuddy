# Legal Documents Implementation Guide

## 📋 Files Created

### Documentation (Root Directory)

1. **TERMS_OF_SERVICE.md** - Complete Terms of Service (22 sections)
2. **PRIVACY_POLICY.md** - Complete Privacy Policy (16 sections)

### App Screens (app/src/screens/)

3. **TermsOfServiceScreen.tsx** - In-app Terms display
4. **PrivacyPolicyScreen.tsx** - In-app Privacy Policy display

## 🔗 How to Add to Your App

### Step 1: Add to Navigation

Add these screens to your navigation stack in `RootNavigator.tsx`:

```typescript
import { TermsOfServiceScreen } from "../screens/TermsOfServiceScreen";
import { PrivacyPolicyScreen } from "../screens/PrivacyPolicyScreen";

// Inside your Stack.Navigator:
<Stack.Screen
  name="TermsOfService"
  component={TermsOfServiceScreen}
  options={{ title: "Terms of Service" }}
/>
<Stack.Screen
  name="PrivacyPolicy"
  component={PrivacyPolicyScreen}
  options={{ title: "Privacy Policy" }}
/>
```

### Step 2: Add Links in Settings Screen

In your `SettingsScreen.tsx`, add navigation options:

```typescript
<TouchableOpacity
  style={styles.settingItem}
  onPress={() => navigation.navigate("TermsOfService")}
>
  <Text style={styles.settingLabel}>Terms of Service</Text>
  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
</TouchableOpacity>

<TouchableOpacity
  style={styles.settingItem}
  onPress={() => navigation.navigate("PrivacyPolicy")}
>
  <Text style={styles.settingLabel}>Privacy Policy</Text>
  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
</TouchableOpacity>
```

### Step 3: Add to Onboarding/Signup

In your `OnboardingScreen.tsx` or signup flow, add acceptance checkboxes:

```typescript
<View style={styles.termsContainer}>
  <TouchableOpacity
    style={styles.checkbox}
    onPress={() => setAcceptTerms(!acceptTerms)}
  >
    <Ionicons
      name={acceptTerms ? "checkbox" : "square-outline"}
      size={24}
      color={colors.accentPurple}
    />
    <Text style={styles.termsText}>
      I agree to the{" "}
      <Text
        style={styles.link}
        onPress={() => navigation.navigate("TermsOfService")}
      >
        Terms of Service
      </Text>{" "}
      and{" "}
      <Text
        style={styles.link}
        onPress={() => navigation.navigate("PrivacyPolicy")}
      >
        Privacy Policy
      </Text>
    </Text>
  </TouchableOpacity>
</View>

<PrimaryButton
  title="Get Started"
  onPress={handleSignup}
  disabled={!acceptTerms}
/>
```

### Step 4: Add to Navigation Types

Update `app/src/navigation/types.ts`:

```typescript
export type RootStackParamList = {
  // ... existing screens
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
};
```

## 📱 App Store Requirements

### Apple App Store

When submitting to App Store Connect:

1. Go to "App Privacy" section
2. Fill out data collection details based on PRIVACY_POLICY.md
3. Link to Privacy Policy URL (host PRIVACY_POLICY.md on your website)
4. Include age rating (13+ or 17+ based on content moderation)

### Google Play Store

When submitting to Google Play Console:

1. Go to "App content" → "Privacy Policy"
2. Provide URL to hosted PRIVACY_POLICY.md
3. Fill out "Data safety" section based on privacy policy
4. Set content rating (ESRB: Teen or Everyone)

## 🌐 Hosting Legal Documents

### Option 1: GitHub Pages (Free)

1. Create a `docs` folder in your repo
2. Add `TERMS_OF_SERVICE.md` and `PRIVACY_POLICY.md`
3. Enable GitHub Pages in repo settings
4. Access at: `https://[username].github.io/[repo]/TERMS_OF_SERVICE.html`

### Option 2: Your Website

Host at:

- `https://www.secretbuddy.app/terms`
- `https://www.secretbuddy.app/privacy`

### Option 3: Firebase Hosting (Recommended)

```bash
# In your project root
firebase init hosting

# Add files to public directory
cp TERMS_OF_SERVICE.md public/terms.md
cp PRIVACY_POLICY.md public/privacy.md

# Deploy
firebase deploy --only hosting
```

## ⚠️ Important: Customization Required

Before going live, you MUST update these placeholders:

### In Both Documents:

1. **Email Addresses:**

   - Replace `support@secretbuddy.app` with your actual support email
   - Replace `legal@secretbuddy.app` with your legal contact
   - Replace `privacy@secretbuddy.app` with privacy contact
   - Replace `security@secretbuddy.app` with security contact
   - Replace `dpo@secretbuddy.app` with Data Protection Officer contact

2. **Mailing Address:**

   - Add your company's physical address (required by law)
   - Update country if not Portugal

3. **Website URL:**

   - Replace `www.secretbuddy.app` with your actual domain

4. **Company Information:**
   - Add company legal name if applicable
   - Add registration number if required in your jurisdiction

### Privacy Policy Specific:

1. **Data Controller Details:**

   - If you have a registered company, add company details
   - Add Data Protection Officer details if applicable

2. **Third-Party Services:**
   - Update Firebase project details
   - Add any additional services you integrate

## 📊 Compliance Checklist

### General Requirements ✅

- [x] Terms of Service created and accessible
- [x] Privacy Policy created and accessible
- [x] Age verification (13+ requirement stated)
- [x] Contact information provided
- [x] User rights clearly stated
- [x] Data retention policies defined

### GDPR Compliance (EU) ✅

- [x] Legal basis for processing explained
- [x] User rights (access, erasure, portability) documented
- [x] Data Protection Officer contact provided
- [x] Consent mechanisms described
- [x] Data transfer information included
- [x] Supervisory authority rights mentioned

### CCPA Compliance (California) ✅

- [x] Data collection disclosure
- [x] Right to know documented
- [x] Right to delete documented
- [x] "Do Not Sell" statement (we don't sell data)
- [x] Non-discrimination policy

### COPPA Compliance (US Children) ✅

- [x] Age restrictions (13+) stated
- [x] Parental consent requirement
- [x] Parent contact information
- [x] Children's data handling explained
- [x] Minimal data collection for minors

## 🔒 Data Handling Requirements

Based on the legal documents, ensure these are implemented:

### Photo Deletion System ✅

- Photos deleted after 24 hours (already implemented via TTL)
- Photos deleted when viewed (already implemented)
- Photos deleted after 4 hours if unviewed (already implemented)

### User Data Rights

Implement these features if not already done:

1. **Account Deletion:**

   - Complete data removal
   - Irreversible action
   - Confirmation dialog

2. **Data Export:**

   - Allow users to download their data
   - JSON format preferred
   - Include: profile, points, streak, badges

3. **Data Access:**
   - Users can view all their data
   - Access through settings screen

## 📝 Consent Management

### Signup Flow

Users must explicitly consent to:

1. Terms of Service (checkbox required)
2. Privacy Policy (checkbox required)
3. Age confirmation (13+ requirement)
4. Optional: Marketing communications

### Store Consent Records

In Firestore, add to user document:

```typescript
{
  consentData: {
    termsAccepted: true,
    termsVersion: "2025-10-05",
    privacyAccepted: true,
    privacyVersion: "2025-10-05",
    acceptedAt: timestamp,
  }
}
```

## 🚀 Next Steps

1. **Review and Customize:**

   - Read through both documents carefully
   - Update all placeholder information
   - Customize for your specific situation

2. **Legal Review (Recommended):**

   - Have a lawyer review the documents
   - Ensure compliance with your jurisdiction
   - Get advice on specific features

3. **Implement in App:**

   - Add screens to navigation
   - Add links in settings
   - Add consent checkboxes to signup
   - Store consent records

4. **Host Online:**

   - Upload to your website or GitHub Pages
   - Get permanent URLs for app store submissions

5. **Update App Stores:**

   - Submit privacy policy URL
   - Fill out data safety sections
   - Update app descriptions

6. **Monitor Compliance:**
   - Set reminder to review annually
   - Update when adding new features
   - Track user consent records

## 📞 Support

If you need legal advice:

- Consult a lawyer specializing in tech/privacy law
- Consider services like TermsFeed or Termly for automated generation
- Review similar apps' policies for reference (but don't copy)

## ⚖️ Disclaimer

These templates are provided as a starting point and should be reviewed by legal counsel. They are based on common practices but may not cover all legal requirements for your specific situation, jurisdiction, or business model.

---

**Remember:** Legal compliance is ongoing. Review and update these documents:

- When adding new features
- When collecting new types of data
- When laws change (at least annually)
- When expanding to new markets

---

✅ **You now have comprehensive legal documentation for SecretBuddy!**
