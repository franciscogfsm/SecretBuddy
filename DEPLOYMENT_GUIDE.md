# reCAPTCHA Backend Integration - Deployment Guide

## ✅ What's Done

All code is ready! The backend verification is now integrated:

1. ✅ **Firebase Cloud Function**: `verifyRecaptcha` added to `functions/src/index.ts`
2. ✅ **Client Service**: Updated `app/src/services/recaptchaService.ts` to call Cloud Function
3. ✅ **Auth Integration**: `handleLogin` and `handleSignupCredentials` now verify reCAPTCHA before proceeding
4. ✅ **Package Installed**: `@google-cloud/recaptcha-enterprise` installed in functions

## 🚀 Deployment Steps

### Step 1: Deploy the Cloud Function

From your project root, run:

```bash
cd functions
npm run build
firebase deploy --only functions:verifyRecaptcha
```

This will deploy only the reCAPTCHA verification function (not affecting other functions).

**Expected output:**

```
✔  Deploy complete!

Function URL (verifyRecaptcha):
https://us-central1-secretbuddy-5637d.cloudfunctions.net/verifyRecaptcha
```

### Step 2: Verify Function URL

The client is already configured to call:

```
https://us-central1-secretbuddy-5637d.cloudfunctions.net/verifyRecaptcha
```

If your Firebase project ID is different, update line 24 in:
`app/src/services/recaptchaService.ts`

```typescript
const PROJECT_ID = "secretbuddy-5637d"; // <-- Change if needed
```

### Step 3: Test the Function

Test the deployed function with curl:

```bash
curl -X POST \
  https://us-central1-secretbuddy-5637d.cloudfunctions.net/verifyRecaptcha \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token",
    "action": "login",
    "platform": "ios"
  }'
```

**Expected response** (will fail because test token is invalid):

```json
{
  "success": false,
  "error": "Invalid token",
  "reason": "..."
}
```

This confirms the function is deployed and responding.

## 🧪 Testing the Complete Flow

### Test on iOS/Android Device

1. **Build and run your app** on a real device (simulator/emulator may have issues with reCAPTCHA):

```bash
cd app
npm run ios    # For iOS device
# or
npm run android # For Android device
```

2. **Try to log in or sign up**:
   - Fill in email/password
   - Tap "Log in" or "Sign up"
   - Watch logs for reCAPTCHA activity

### Expected Flow

1. User taps "Log in"
2. reCAPTCHA component triggers (invisible - no UI shown to user in most cases)
3. reCAPTCHA token generated
4. Token sent to Cloud Function for verification
5. If score ≥ 0.5: Login proceeds
6. If score < 0.5: "Verification Failed" error shown

### Check Logs

**Firebase Console Logs:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Functions → Logs
4. Look for: `✅ reCAPTCHA verified: score=X.XX`

**App Logs (React Native):**

- Open React Native debugger or check Xcode/Android Studio logs
- Look for:
  - `✅ reCAPTCHA verified successfully`
  - `reCAPTCHA score: X.XX, threshold: 0.5, passed: true/false`

## 🐛 Troubleshooting

### Issue: "Cannot read property 'open' of null"

**Solution**: Make sure RecaptchaComponent is mounted before triggering. Already handled in code.

### Issue: "Invalid token" or low score

**Possible causes:**

1. **Testing on simulator**: reCAPTCHA works best on real devices
2. **Rapid testing**: Multiple quick attempts may lower score
3. **Development mode**: Some reCAPTCHA behavior differs in dev vs production

**Solution**: Test on real device and wait a few seconds between attempts.

### Issue: Function deployment fails

**Error**: "Permission denied" or "reCAPTCHA Enterprise API not enabled"

**Solution**:

1. Enable reCAPTCHA Enterprise API in Google Cloud Console:

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your Firebase project
   - Go to APIs & Services → Library
   - Search "reCAPTCHA Enterprise API"
   - Click "Enable"

2. Ensure your Firebase project has billing enabled (required for Cloud Functions)

### Issue: CORS errors

**Solution**: Already handled! The function includes CORS headers:

```typescript
res.set("Access-Control-Allow-Origin", "*");
```

### Issue: Function timeout

**Solution**: Function is configured with 10 second timeout (plenty of time). If it times out:

- Check Google Cloud Console for API errors
- Verify reCAPTCHA Enterprise API is enabled
- Check network connectivity

## 📊 Monitoring

### Google Cloud Console - reCAPTCHA Dashboard

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to Security → reCAPTCHA Enterprise
3. View your site keys and assessments
4. Monitor:
   - Request volume
   - Score distribution
   - Blocked requests
   - Assessment trends

### Adjust Score Threshold

If too many legitimate users are blocked (score < 0.5), lower the threshold:

In `app/src/config/recaptcha.ts`:

```typescript
export const RECAPTCHA_CONFIG = {
  minScore: 0.3,  // Lower = more lenient (was 0.5)
  ...
};
```

In `functions/src/index.ts` (line ~3162):

```typescript
const minScore = 0.3; // Match client threshold
```

**Redeploy function after changing:**

```bash
cd functions
firebase deploy --only functions:verifyRecaptcha
```

## 🔒 Security Notes

1. **Site Keys (Public)**: Already in your code - safe to commit

   - iOS: `6LdMmAYsAAAAAAfHzOmPrmaIQHO802OWIH3xeYhe`
   - Android: `6LdNmAYsAAAAAEGWlttobVgrthwZQ2IcGJQqe44c`

2. **Secret Keys**: Never needed in client or functions code! Google Cloud handles auth automatically when deployed to Firebase.

3. **Service Account**: Firebase Functions automatically use the default service account with proper permissions. No manual setup needed.

4. **Rate Limiting**: Already implemented (5 login attempts per 5 minutes)

5. **HTTPS**: All communication is encrypted (Cloud Functions use HTTPS by default)

## ✨ Production Checklist

Before going live:

- [ ] Deploy function to production: `firebase deploy --only functions:verifyRecaptcha`
- [ ] Test on real iOS device with production build
- [ ] Test on real Android device with production build
- [ ] Monitor reCAPTCHA dashboard for 24-48 hours
- [ ] Adjust score threshold based on real-world data
- [ ] Set up Firebase Alerts for function errors
- [ ] Document any custom threshold changes

## 📝 Cost Considerations

**reCAPTCHA Enterprise Pricing:**

- First 10,000 assessments/month: **Free**
- After 10,000: $1 per 1,000 assessments

**Firebase Cloud Functions:**

- Free tier: 2M invocations/month
- After free tier: $0.40 per million invocations

**Typical costs for a small app**: $0-5/month

## 🆘 Need Help?

If you encounter issues:

1. Check Firebase Functions logs in console
2. Check app logs in React Native debugger
3. Test with curl to isolate client vs server issues
4. Verify reCAPTCHA Enterprise API is enabled
5. Check Google Cloud quotas and billing

## 🎉 Success Indicators

You'll know it's working when:

- ✅ Login/signup flows work normally
- ✅ Logs show: `✅ reCAPTCHA verified: score=0.X`
- ✅ No "Verification Failed" errors for normal users
- ✅ Suspicious activity gets lower scores (test by rapid-fire attempts)
- ✅ reCAPTCHA dashboard shows incoming assessments

That's it! Your app now has enterprise-grade bot protection. 🚀
