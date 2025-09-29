# Google OAuth Mobile Debug Guide

## Issue Fixed: GeneralOAuthFlow Error

### Changes Made:

1. **Fixed Redirect URI**: Changed from hardcoded Expo URL to dynamic `makeRedirectUri()`
2. **Added Proper Scopes**: Added OpenID, profile, and email scopes
3. **Better Error Handling**: Added specific handling for GeneralOAuthFlow errors

### Required Google Cloud Console Setup:

#### 1. Authorized Redirect URIs

Add these to your Google OAuth client:

- `secretbuddy://auth` (for mobile app)
- `https://auth.expo.io/@franciscogfsm/secretbuddy` (for Expo Go)

#### 2. Required Client IDs in Environment Variables:

```bash
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=your_expo_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
```

#### 3. Test on Device:

- Run: `npx expo run:ios` or `npx expo run:android`
- Avoid Expo Go for OAuth testing (use development build)

### Common Fixes:

- ✅ Redirect URI matches Google Console
- ✅ Correct client IDs for each platform
- ✅ App scheme configured in app.json
- ✅ Proper error handling for mobile
