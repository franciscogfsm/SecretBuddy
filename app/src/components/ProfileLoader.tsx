import { useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";

/**
 * Component that preloads user profile data after authentication
 * This ensures the profile is loaded before user navigates to Profile screen
 */
export const ProfileLoader = () => {
  // Just calling this hook will trigger the profile loading
  // The hook handles everything automatically
  useUserProfile();

  return null; // This component doesn't render anything
};
