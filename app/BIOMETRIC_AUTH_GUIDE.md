# Biometric Authentication Guide

## Overview

SecretBuddy now includes comprehensive biometric authentication with cross-platform support for iOS (Face ID/Touch ID) and Android (Fingerprint/Face Recognition).

## Features Implemented

### 1. **Biometric Authentication**

- **iOS Support**: Face ID and Touch ID
- **Android Support**: Fingerprint and Face Recognition
- **Secure Storage**: Credentials stored using hardware-backed encryption (iOS Keychain/Android Keystore)
- **Auto-Login**: After successful biometric authentication, users are automatically logged in

### 2. **Password Strength Indicator**

- Real-time visual feedback as users type their password
- 5-level strength scoring system:
  - 🔴 Too Weak (0-1 criteria met)
  - 🟠 Weak (2 criteria met)
  - 🟡 Fair (3 criteria met)
  - 🟢 Good (4 criteria met)
  - 🟢 Strong (5 criteria met)
- Helpful hints showing what's missing (e.g., "Add an uppercase letter", "Use at least 8 characters")

### 3. **Strong Password Requirements**

Password must contain:

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- Minimum strength score of 3/5 for signup

### 4. **Client-Side Rate Limiting**

- Prevents brute force attacks
- Limits to 5 login attempts per email address
- 5-minute cooldown period after exceeding limit
- Clear error messages informing users when locked out

### 5. **Account Switching**

- Users can switch between multiple accounts on the same device
- When logging in with a different email, the system prompts to replace the saved biometric credentials
- Smart messaging: "Enable Biometric?" vs "Switch to Biometric?"

## User Experience Flow

### First-Time Login

1. User enters email and password
2. Taps "Sign In"
3. After successful authentication, sees prompt: "Enable Face ID?" (or Touch ID/Fingerprint based on device)
4. If enabled, credentials are securely stored
5. Next login: tapping the password field triggers biometric prompt automatically

### Subsequent Logins (Same Account)

1. User enters email (auto-populated if biometric enabled)
2. Taps password field
3. Biometric prompt appears automatically
4. After successful biometric authentication, automatically logs in

### Account Switching

1. User logs out
2. Enters different email address
3. Enters password and taps "Sign In"
4. After successful login, sees: "Switch to Fingerprint?" with message "Replace saved account with [new-email]?"
5. If accepted, new account replaces old credentials
6. Next login uses new account's biometric authentication

## Technical Implementation

### Biometric Service (`biometricService.ts`)

```typescript
// Check if device supports biometrics
checkBiometricCapability();

// Get platform-specific name
getBiometricName(types); // Returns "Face ID", "Touch ID", "Fingerprint", etc.

// Authenticate with biometrics
authenticateWithBiometrics(promptMessage);

// Enable for current user
enableBiometricAuth(email, password);

// Get saved email
getBiometricSavedEmail();

// Get stored credentials
getBiometricCredentials();

// Check if enabled
isBiometricAuthEnabled();

// Disable
disableBiometricAuth();
```

### Password Strength Validation

```typescript
validatePasswordStrength(password); // Returns { score, label, color, feedback }
```

### Rate Limiting

```typescript
const loginRateLimiter = SecurityUtils.createRateLimiter(5, 300000); // 5 attempts, 5 minutes
loginRateLimiter.tryAction(email); // Returns true if allowed, false if rate limited
```

## Security Features

### Credential Storage

- **Mobile**: Uses `expo-secure-store` with hardware-backed encryption
  - iOS: Stored in iOS Keychain with biometric protection
  - Android: Stored in Android Keystore with hardware backing
- **Web**: Falls back to AsyncStorage (demo purposes)

### Privacy Protection

- Emails are stored in lowercase for consistency
- Biometric attempt tracking prevents infinite loops
- Email change detection resets biometric state
- Users can disable biometric authentication at any time

### Platform-Specific Handling

```typescript
Platform.OS === "ios" ? "Face ID" : "Face Recognition";
Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
```

## Testing Checklist

### iOS Testing

- [ ] Face ID enrollment and authentication
- [ ] Touch ID enrollment and authentication
- [ ] Account switching between different users
- [ ] Biometric disable/re-enable flow
- [ ] Rate limiting after 5 failed attempts
- [ ] Password strength indicator during signup

### Android Testing

- [ ] Fingerprint enrollment and authentication
- [ ] Face Recognition authentication (if supported)
- [ ] Account switching between different users
- [ ] Biometric disable/re-enable flow
- [ ] Rate limiting after 5 failed attempts
- [ ] Password strength indicator during signup

### Edge Cases

- [ ] Device with no biometric hardware
- [ ] Device with hardware but no enrolled biometrics
- [ ] Network failure during authentication
- [ ] App backgrounding during biometric prompt
- [ ] Multiple rapid login attempts
- [ ] Email change after biometric enabled

## User Settings (Future Enhancement)

Consider adding to user profile settings:

- Toggle to disable/enable biometric authentication
- Display which email is currently saved for biometric
- Manual re-authentication option
- Clear all biometric data button

## Documentation Updates

- [x] SECURITY.md updated with all three features
- [x] This guide created for reference
- [ ] User-facing documentation for app store
- [ ] FAQ section for common questions

## Known Limitations

1. Web version uses AsyncStorage (less secure than native)
2. Only one account can have biometric enabled per device at a time
3. Biometric settings don't sync across devices (by design for security)

## Support

For issues or questions:

1. Check `SECURITY.md` for security feature overview
2. Review `biometricService.ts` for implementation details
3. Check device biometric settings if prompts don't appear
4. Ensure biometric hardware is enrolled in device settings
