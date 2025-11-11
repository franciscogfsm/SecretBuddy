// app.config.js
// This file is the "bridge" that loads environment variables from .env
// during EAS build and bakes them into your app's configuration.

export default ({ config }) => {
  return {
    ...config,
    // Custom scheme is required for deep links / OAuth redirect URLs
    // Use the Android package name as the scheme for best practice
    scheme: 'com.inaciobalu.secretbuddyapp',
    extra: {
      ...config.extra,
      // This is the critical part: read process.env during build
      // and bake these values into the app bundle
      firebaseConfig: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      },
      azureConfig: {
        faceApiKey: process.env.AZURE_FACE_API_KEY,
        faceEndpoint: process.env.AZURE_FACE_ENDPOINT,
      },
      googleOAuthConfig: {
        expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      },
    },
  };
};
