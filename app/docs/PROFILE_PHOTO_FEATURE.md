# Profile Photo Upload Feature

## Overview

Users can now upload, view, and delete profile photos in the SecretBuddy app.

## Features Added

### 1. **Photo Upload**

- Tap the camera button on the avatar to pick a photo from your device
- Photos are automatically compressed and uploaded to Firebase Storage
- Only image files up to 5MB are allowed
- Photos are cropped to 1:1 aspect ratio

### 2. **Photo Display**

- Profile photos are displayed in the avatar circle on the Profile screen
- Falls back to the first letter of the user's name if no photo is set
- Loading indicator shown while uploading

### 3. **Photo Removal**

- Users can remove their profile photo with the × button
- Confirms before deletion
- Photo is deleted from Firebase Storage and the profile is updated

## Technical Implementation

### Files Modified

#### `src/services/userService.ts`

- Added `uploadProfilePhoto()` - Uploads image to Firebase Storage and updates Firestore
- Added `deleteProfilePhoto()` - Removes image from Storage and Firestore
- Updated `updateUserProfile()` to handle null values for photo removal
- Updated `deleteUserProfile()` to clean up profile photo on account deletion

#### `src/hooks/useUserProfile.ts`

- Added `uploadPhoto()` hook function
- Added `removePhoto()` hook function
- Manages loading state during photo operations

#### `src/screens/ProfileScreen.tsx`

- Added image picker functionality with `expo-image-picker`
- Added camera button overlay on avatar
- Added remove photo button (×) when photo exists
- Displays profile photo or fallback initial
- Shows loading indicator during upload

#### `src/config/firebase.ts`

- Firebase Storage already initialized (no changes needed)

### New Files Created

#### `app/STORAGE_RULES.md`

- Firebase Storage security rules for profile photos
- Allows authenticated users to upload/delete their own photos
- Restricts file size to 5MB
- Only allows image file types

## Firebase Setup Required

### 1. Enable Firebase Storage

```
1. Go to Firebase Console
2. Navigate to Storage
3. Click "Get Started"
4. Choose "Production mode"
5. Select your region
```

### 2. Apply Storage Rules

```
1. Go to Storage → Rules tab
2. Copy rules from app/STORAGE_RULES.md
3. Paste and publish
```

### 3. Update Firestore Rules (if needed)

The `users` collection rules already allow authenticated users to update their own profiles, so profile photo URLs will work automatically.

## How It Works

### Upload Flow

```
1. User taps camera button
2. Request media library permissions
3. Open image picker with 1:1 crop
4. Convert image to blob
5. Upload to Firebase Storage: profile-photos/{userId}.jpg
6. Get download URL
7. Update Firestore users/{userId} with profilePhotoUrl
8. Update local state
```

### Delete Flow

```
1. User taps × button
2. Show confirmation alert
3. Delete from Firebase Storage
4. Update Firestore users/{userId} (set profilePhotoUrl to null)
5. Update local state
```

## Storage Structure

```
/profile-photos
  /{userId}.jpg  - Profile photo for user {userId}
```

- Each user has exactly one profile photo
- Uploading a new photo automatically replaces the old one
- Photos are named with the user's UID for easy management

## Permissions Required

The app already has `expo-image-picker` installed and configured in `app.json`:

```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "SecretBuddy needs camera access..."
    }
  }
}
```

- **iOS**: Camera roll permission requested automatically
- **Android**: Media library permission requested automatically
- **Web**: File picker (no special permissions needed)

## Error Handling

- ✅ Permission denied → Alert shown to user
- ✅ Upload failed → Error message displayed
- ✅ Network error → Caught and displayed
- ✅ File too large → Rejected by Storage rules
- ✅ Invalid file type → Rejected by Storage rules

## Testing Checklist

- [ ] Upload a profile photo
- [ ] View uploaded photo on profile
- [ ] Remove profile photo
- [ ] Upload a new photo (replaces old one)
- [ ] Test with no internet connection
- [ ] Test with invalid file type
- [ ] Test with oversized file (>5MB)
- [ ] Verify photo persists after app restart
- [ ] Test permission denial flow

## Future Enhancements

- [ ] Add photo cropping/editing before upload
- [ ] Support multiple photos (gallery)
- [ ] Image compression optimization
- [ ] Cache profile photos for offline viewing
- [ ] Show profile photos in chat/friends list
- [ ] Allow taking photo with camera (not just gallery)

## Dependencies

- `expo-image-picker` - Already installed ✅
- `firebase/storage` - Already configured ✅
- React Native Image component - Built-in ✅
