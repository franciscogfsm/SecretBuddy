import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Migration script to add missing fields to existing user profiles
 * Run this once for existing users who don't have username, age, or country
 */
export const migrateUserProfile = async (
  userId: string,
  updates: {
    username?: string;
    age?: number;
    country?: string;
  }
) => {
  try {
    const userRef = doc(db, "users", userId);

    const cleanUpdates: any = {};

    if (updates.username) {
      cleanUpdates.username = updates.username.trim().toLowerCase();
    }
    if (updates.age) {
      cleanUpdates.age = updates.age;
    }
    if (updates.country) {
      cleanUpdates.country = updates.country;
    }

    await updateDoc(userRef, cleanUpdates);

    console.log("✅ Profile migrated successfully:", userId);
  } catch (error) {
    console.error("❌ Error migrating profile:", error);
    throw error;
  }
};
