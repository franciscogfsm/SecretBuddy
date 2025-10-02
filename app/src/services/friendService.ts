import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  or,
  and,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getUserProfile, updateUserProfile } from "./userService";

export type FriendshipStatus =
  | "pending" // Friend request sent/received
  | "accepted" // Friends
  | "blocked"; // User blocked

export interface Friendship {
  id: string;
  userId1: string; // User who sent request
  userId2: string; // User who received request
  status: FriendshipStatus;
  createdAt: any;
  updatedAt: any;
  acceptedAt?: any;
}

export interface FriendProfile {
  uid: string;
  displayName: string;
  username?: string;
  country?: string;
  bio?: string;
  profilePhotoUrl?: string;
  lastActive?: any;
  points?: number;
  streak?: number;
  friendshipStatus?:
    | "friend"
    | "pending_sent"
    | "pending_received"
    | "none"
    | "blocked";
  friendshipId?: string;
}

const FRIENDS_COLLECTION = "friendships";

/**
 * Search for users by username
 */
export const searchUsersByUsername = async (
  searchQuery: string,
  currentUserId: string
): Promise<FriendProfile[]> => {
  try {
    if (!searchQuery.trim()) {
      return [];
    }

    const usersRef = collection(db, "users");
    const searchLower = searchQuery.toLowerCase().trim();

    // Query users where username starts with search query
    const q = query(
      usersRef,
      where("username", ">=", searchLower),
      where("username", "<=", searchLower + "\uf8ff")
    );

    const querySnapshot = await getDocs(q);
    const users: FriendProfile[] = [];

    for (const docSnap of querySnapshot.docs) {
      const userData = docSnap.data();

      // Don't include current user in results
      if (docSnap.id === currentUserId) {
        continue;
      }

      // Get friendship status
      const friendshipStatus = await getFriendshipStatus(
        currentUserId,
        docSnap.id
      );

      users.push({
        uid: docSnap.id,
        displayName: userData.displayName || "Unknown User",
        username: userData.username,
        country: userData.country,
        bio: userData.bio,
        profilePhotoUrl: userData.profilePhotoUrl,
        lastActive: userData.lastActive,
        points: userData.points || 0,
        streak: userData.streak || 0,
        friendshipStatus: friendshipStatus.status,
        friendshipId: friendshipStatus.friendshipId,
      });
    }

    return users;
  } catch (error) {
    console.error("❌ Error searching users:", error);
    throw error;
  }
};

/**
 * Get friendship status between two users
 */
export const getFriendshipStatus = async (
  userId1: string,
  userId2: string
): Promise<{
  status: "friend" | "pending_sent" | "pending_received" | "none" | "blocked";
  friendshipId?: string;
}> => {
  try {
    const friendshipsRef = collection(db, FRIENDS_COLLECTION);

    // Check both directions
    const q = query(
      friendshipsRef,
      or(
        and(where("userId1", "==", userId1), where("userId2", "==", userId2)),
        and(where("userId1", "==", userId2), where("userId2", "==", userId1))
      )
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { status: "none" };
    }

    const friendshipDoc = querySnapshot.docs[0];
    const friendship = friendshipDoc.data() as Friendship;

    if (friendship.status === "blocked") {
      return { status: "blocked", friendshipId: friendshipDoc.id };
    }

    if (friendship.status === "accepted") {
      return { status: "friend", friendshipId: friendshipDoc.id };
    }

    // Pending - determine direction
    if (friendship.userId1 === userId1) {
      return { status: "pending_sent", friendshipId: friendshipDoc.id };
    } else {
      return { status: "pending_received", friendshipId: friendshipDoc.id };
    }
  } catch (error) {
    console.error("❌ Error getting friendship status:", error);
    return { status: "none" };
  }
};

/**
 * Send a friend request
 */
export const sendFriendRequest = async (
  fromUserId: string,
  toUserId: string
): Promise<string> => {
  try {
    // Check if friendship already exists
    const existingStatus = await getFriendshipStatus(fromUserId, toUserId);
    if (existingStatus.status !== "none") {
      throw new Error("Friendship already exists or request already sent");
    }

    // Create new friendship document
    const friendshipRef = doc(collection(db, FRIENDS_COLLECTION));

    await setDoc(friendshipRef, {
      userId1: fromUserId,
      userId2: toUserId,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Friend request sent:", friendshipRef.id);
    return friendshipRef.id;
  } catch (error) {
    console.error("❌ Error sending friend request:", error);
    throw error;
  }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (
  friendshipId: string,
  currentUserId: string
): Promise<void> => {
  try {
    const friendshipRef = doc(db, FRIENDS_COLLECTION, friendshipId);
    const friendshipSnap = await getDoc(friendshipRef);

    if (!friendshipSnap.exists()) {
      throw new Error("Friendship not found");
    }

    const friendship = friendshipSnap.data() as Friendship;

    // Verify current user is the receiver
    if (friendship.userId2 !== currentUserId) {
      throw new Error("You are not authorized to accept this request");
    }

    // Update friendship status
    await updateDoc(friendshipRef, {
      status: "accepted",
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update friend counts for both users
    await updateUserProfile(friendship.userId1, {
      friendsCount: increment(1),
    } as any);

    await updateUserProfile(friendship.userId2, {
      friendsCount: increment(1),
    } as any);

    console.log("✅ Friend request accepted:", friendshipId);
  } catch (error) {
    console.error("❌ Error accepting friend request:", error);
    throw error;
  }
};

/**
 * Decline/Cancel a friend request
 */
export const declineFriendRequest = async (
  friendshipId: string
): Promise<void> => {
  try {
    const friendshipRef = doc(db, FRIENDS_COLLECTION, friendshipId);
    await deleteDoc(friendshipRef);

    console.log("✅ Friend request declined:", friendshipId);
  } catch (error) {
    console.error("❌ Error declining friend request:", error);
    throw error;
  }
};

/**
 * Remove a friend (unfriend)
 */
export const removeFriend = async (
  friendshipId: string,
  userId1: string,
  userId2: string
): Promise<void> => {
  try {
    const friendshipRef = doc(db, FRIENDS_COLLECTION, friendshipId);
    await deleteDoc(friendshipRef);

    // Update friend counts for both users
    await updateUserProfile(userId1, {
      friendsCount: increment(-1),
    } as any);

    await updateUserProfile(userId2, {
      friendsCount: increment(-1),
    } as any);

    console.log("✅ Friend removed:", friendshipId);
  } catch (error) {
    console.error("❌ Error removing friend:", error);
    throw error;
  }
};

/**
 * Get all friends for a user
 */
export const getUserFriends = async (
  userId: string
): Promise<FriendProfile[]> => {
  try {
    const friendshipsRef = collection(db, FRIENDS_COLLECTION);

    const q = query(friendshipsRef, where("status", "==", "accepted"));

    const querySnapshot = await getDocs(q);
    const friends: FriendProfile[] = [];

    for (const docSnap of querySnapshot.docs) {
      const friendship = docSnap.data() as Friendship;

      // Filter for friendships involving the user
      if (friendship.userId1 !== userId && friendship.userId2 !== userId) {
        continue;
      }

      // Get the other user's ID
      const friendId =
        friendship.userId1 === userId ? friendship.userId2 : friendship.userId1;

      // Get friend's profile
      const friendProfile = await getUserProfile(friendId);

      if (friendProfile) {
        friends.push({
          uid: friendId,
          displayName: friendProfile.displayName,
          username: friendProfile.username,
          country: friendProfile.country,
          bio: friendProfile.bio,
          profilePhotoUrl: friendProfile.profilePhotoUrl,
          lastActive: friendProfile.lastActive,
          points: friendProfile.points || 0,
          streak: friendProfile.streak || 0,
          friendshipStatus: "friend",
          friendshipId: docSnap.id,
        });
      }
    }

    // Sort by last active
    friends.sort((a, b) => {
      if (!a.lastActive) return 1;
      if (!b.lastActive) return -1;
      return b.lastActive.seconds - a.lastActive.seconds;
    });

    return friends;
  } catch (error) {
    console.error("❌ Error getting user friends:", error);
    throw error;
  }
};

/**
 * Get pending friend requests (received)
 */
export const getPendingFriendRequests = async (
  userId: string
): Promise<FriendProfile[]> => {
  try {
    const friendshipsRef = collection(db, FRIENDS_COLLECTION);

    // Get requests where user is userId2 (receiver)
    const q = query(
      friendshipsRef,
      where("userId2", "==", userId),
      where("status", "==", "pending")
    );

    const querySnapshot = await getDocs(q);
    const requests: FriendProfile[] = [];

    for (const docSnap of querySnapshot.docs) {
      const friendship = docSnap.data() as Friendship;

      // Get sender's profile
      const senderProfile = await getUserProfile(friendship.userId1);

      if (senderProfile) {
        requests.push({
          uid: friendship.userId1,
          displayName: senderProfile.displayName,
          username: senderProfile.username,
          country: senderProfile.country,
          bio: senderProfile.bio,
          profilePhotoUrl: senderProfile.profilePhotoUrl,
          lastActive: senderProfile.lastActive,
          points: senderProfile.points || 0,
          streak: senderProfile.streak || 0,
          friendshipStatus: "pending_received",
          friendshipId: docSnap.id,
        });
      }
    }

    // Sort by creation date (newest first)
    requests.sort((a, b) => {
      const aTime = a.lastActive?.seconds || 0;
      const bTime = b.lastActive?.seconds || 0;
      return bTime - aTime;
    });

    return requests;
  } catch (error) {
    console.error("❌ Error getting pending requests:", error);
    throw error;
  }
};

/**
 * Get sent friend requests (pending)
 */
export const getSentFriendRequests = async (
  userId: string
): Promise<FriendProfile[]> => {
  try {
    const friendshipsRef = collection(db, FRIENDS_COLLECTION);

    // Get requests where user is userId1 (sender)
    const q = query(
      friendshipsRef,
      where("userId1", "==", userId),
      where("status", "==", "pending")
    );

    const querySnapshot = await getDocs(q);
    const requests: FriendProfile[] = [];

    for (const docSnap of querySnapshot.docs) {
      const friendship = docSnap.data() as Friendship;

      // Get receiver's profile
      const receiverProfile = await getUserProfile(friendship.userId2);

      if (receiverProfile) {
        requests.push({
          uid: friendship.userId2,
          displayName: receiverProfile.displayName,
          username: receiverProfile.username,
          country: receiverProfile.country,
          bio: receiverProfile.bio,
          profilePhotoUrl: receiverProfile.profilePhotoUrl,
          lastActive: receiverProfile.lastActive,
          points: receiverProfile.points || 0,
          streak: receiverProfile.streak || 0,
          friendshipStatus: "pending_sent",
          friendshipId: docSnap.id,
        });
      }
    }

    return requests;
  } catch (error) {
    console.error("❌ Error getting sent requests:", error);
    throw error;
  }
};

/**
 * Get friend statistics
 */
export const getFriendStatistics = async (
  userId: string
): Promise<{
  friendsCount: number;
  pendingReceivedCount: number;
  pendingSentCount: number;
}> => {
  try {
    const [friends, received, sent] = await Promise.all([
      getUserFriends(userId),
      getPendingFriendRequests(userId),
      getSentFriendRequests(userId),
    ]);

    return {
      friendsCount: friends.length,
      pendingReceivedCount: received.length,
      pendingSentCount: sent.length,
    };
  } catch (error) {
    console.error("❌ Error getting friend statistics:", error);
    return {
      friendsCount: 0,
      pendingReceivedCount: 0,
      pendingSentCount: 0,
    };
  }
};

/**
 * Block a user
 */
export const blockUser = async (
  userId: string,
  blockedUserId: string
): Promise<void> => {
  try {
    // Check if friendship exists
    const existingStatus = await getFriendshipStatus(userId, blockedUserId);

    if (existingStatus.friendshipId) {
      // Update existing friendship to blocked
      const friendshipRef = doc(
        db,
        FRIENDS_COLLECTION,
        existingStatus.friendshipId
      );
      await updateDoc(friendshipRef, {
        status: "blocked",
        updatedAt: serverTimestamp(),
      });

      // If they were friends, decrease friend count
      if (existingStatus.status === "friend") {
        await updateUserProfile(userId, {
          friendsCount: increment(-1),
        } as any);

        await updateUserProfile(blockedUserId, {
          friendsCount: increment(-1),
        } as any);
      }
    } else {
      // Create new blocked friendship
      const friendshipRef = doc(collection(db, FRIENDS_COLLECTION));
      await setDoc(friendshipRef, {
        userId1: userId,
        userId2: blockedUserId,
        status: "blocked",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log("✅ User blocked:", blockedUserId);
  } catch (error) {
    console.error("❌ Error blocking user:", error);
    throw error;
  }
};

/**
 * Unblock a user
 */
export const unblockUser = async (
  userId: string,
  blockedUserId: string
): Promise<void> => {
  try {
    const existingStatus = await getFriendshipStatus(userId, blockedUserId);

    if (existingStatus.friendshipId && existingStatus.status === "blocked") {
      // Remove the blocked friendship
      const friendshipRef = doc(
        db,
        FRIENDS_COLLECTION,
        existingStatus.friendshipId
      );
      await deleteDoc(friendshipRef);
    }

    console.log("✅ User unblocked:", blockedUserId);
  } catch (error) {
    console.error("❌ Error unblocking user:", error);
    throw error;
  }
};

/**
 * Get all blocked users for a user
 */
export const getBlockedUsers = async (
  userId: string
): Promise<FriendProfile[]> => {
  try {
    const friendshipsRef = collection(db, FRIENDS_COLLECTION);

    // Get all blocked relationships where user is userId1
    const q = query(
      friendshipsRef,
      where("userId1", "==", userId),
      where("status", "==", "blocked")
    );

    const querySnapshot = await getDocs(q);
    const blockedUsers: FriendProfile[] = [];

    for (const docSnap of querySnapshot.docs) {
      const friendship = docSnap.data() as Friendship;

      // Get blocked user's profile
      const blockedUserProfile = await getUserProfile(friendship.userId2);

      if (blockedUserProfile) {
        blockedUsers.push({
          uid: friendship.userId2,
          displayName: blockedUserProfile.displayName,
          username: blockedUserProfile.username,
          country: blockedUserProfile.country,
          bio: blockedUserProfile.bio,
          profilePhotoUrl: blockedUserProfile.profilePhotoUrl,
          lastActive: blockedUserProfile.lastActive,
          points: blockedUserProfile.points || 0,
          streak: blockedUserProfile.streak || 0,
          friendshipStatus: "blocked",
          friendshipId: docSnap.id,
        });
      }
    }

    console.log(`✅ Found ${blockedUsers.length} blocked users`);
    return blockedUsers;
  } catch (error) {
    console.error("❌ Error getting blocked users:", error);
    throw error;
  }
};
