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
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  addDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import * as encryptionService from "./encryptionService";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string; // Encrypted in Firestore
  timestamp: any;
  read: boolean;
  type: "text" | "photo"; // Future: support photos
  encrypted?: boolean; // Flag to indicate encryption
}

export interface Conversation {
  id: string;
  participants: string[]; // [userId1, userId2]
  lastMessage?: string;
  lastMessageTimestamp?: any;
  createdAt: any;
  expiresAt: any; // Midnight of creation day
  deleteAt: any; // 3 days after creation - auto-delete
  isActive: boolean;
  endedBy?: string; // userId who ended the conversation
  endedAt?: any;
  // Match info
  matchId: string;
  isRevealed: boolean; // Only show chat after reveal
}

const CONVERSATIONS_COLLECTION = "conversations";
const MAX_MESSAGE_LENGTH = 500; // Character limit per message
const MESSAGES_PER_BATCH = 10; // Load only 10 messages initially for faster loading

/**
 * Get date-partitioned messages collection name
 * Format: messages_YYYY_MM_DD
 * ✅ SCALE OPTIMIZED: Allows efficient cleanup by date
 */
const getMessagesCollection = (date: Date = new Date()): string => {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `messages_${year}_${month}_${day}`;
};

/**
 * Get midnight of the current day (for expiration)
 */
const getMidnightTonight = (): Date => {
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  return midnight;
};

/**
 * Get deletion date (3 days after creation)
 */
const getDeletionDate = (): Date => {
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 3);
  deletionDate.setHours(23, 59, 59, 999);
  return deletionDate;
};

/**
 * Create a new conversation (called after match is revealed)
 */
export const createConversation = async (
  userId1: string,
  userId2: string,
  matchId: string
): Promise<string> => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);

    // Check if conversation already exists for this match
    const existingQuery = query(
      conversationsRef,
      where("matchId", "==", matchId)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      console.log("✅ Conversation already exists");
      return existingSnapshot.docs[0].id;
    }

    const conversationData: Omit<Conversation, "id"> = {
      participants: [userId1, userId2].sort(), // Sort for consistent querying
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(getMidnightTonight()), // Chat expires at midnight
      deleteAt: Timestamp.fromDate(getDeletionDate()), // Auto-delete 3 days later
      isActive: true,
      matchId,
      isRevealed: true, // Only create after reveal
    };

    const docRef = await addDoc(conversationsRef, conversationData);
    console.log("✅ Conversation created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error creating conversation:", error);
    throw error;
  }
};

/**
 * Send a message in a conversation
 * 🔐 Messages are encrypted before being stored
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string
): Promise<string> => {
  try {
    // Validate message length
    if (text.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      throw new Error(
        `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`
      );
    }

    // Check if conversation is still active
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      throw new Error("Conversation not found");
    }

    const conversation = conversationSnap.data() as Conversation;

    if (!conversation.isActive) {
      throw new Error("Conversation has ended");
    }

    // Check if expired
    const now = new Date();
    const expiresAt = conversation.expiresAt.toDate();
    if (now > expiresAt) {
      // Auto-end expired conversation
      await endConversation(conversationId, senderId);
      throw new Error("Conversation has expired");
    }

    // 🔐 ENCRYPT THE MESSAGE before storing (with conversation-specific key)
    // OPTIMIZATION: Encrypt message and preview in parallel
    const textTrimmed = text.trim();
    const [encryptedText, encryptedPreview] = await Promise.all([
      encryptionService.encryptMessage(textTrimmed, conversationId),
      encryptionService.encryptMessage(
        textTrimmed.substring(0, 100),
        conversationId
      ),
    ]);
    console.log("🔐 Message encrypted with conversation key");

    // ✅ SCALE OPTIMIZED: Use date-partitioned collection (messages_YYYY_MM_DD)
    const messagesCollection = getMessagesCollection();
    const messagesRef = collection(db, messagesCollection);
    const messageData: Omit<ChatMessage, "id"> = {
      conversationId,
      senderId,
      text: encryptedText, // Store encrypted text
      timestamp: serverTimestamp(),
      read: false,
      type: "text",
      encrypted: true, // Flag to indicate encryption
    };

    // OPTIMIZATION: Send message and update conversation in parallel
    const [messageDoc] = await Promise.all([
      addDoc(messagesRef, messageData),
      updateDoc(conversationRef, {
        lastMessage: encryptedPreview, // Store encrypted preview
        lastMessageTimestamp: serverTimestamp(),
      }),
    ]);

    console.log(`✅ Message sent to ${messagesCollection}:`, messageDoc.id);
    return messageDoc.id;
  } catch (error) {
    // Avoid noisy logs for expected conversation-end errors which are
    // handled by the UI. Only log unexpected errors.
    const errAny: any = error;
    const msg = (errAny && (errAny.message || String(errAny)))
      .toString()
      .toLowerCase();
    if (
      !msg.includes("conversation has ended") &&
      !msg.includes("conversation has expired")
    ) {
      console.error("❌ Error sending message:", error);
    }
    throw error;
  }
};

/**
 * Get messages for a conversation (with real-time updates)
 * 🔐 Messages are automatically decrypted when received
 * Optimized for super fast loading - only loads recent messages
 */
/**
 * Subscribe to messages (reads from date-partitioned collections)
 * ✅ SCALE OPTIMIZED: Queries today's and yesterday's message collections
 * ✅ INDEX-FREE: Only uses conversationId filter, sorts in memory
 * Note: Messages older than 2 days are automatically cleaned up by backend
 */
export const subscribeToMessages = (
  conversationId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
  messageLimit: number = MESSAGES_PER_BATCH // Allow custom limit
) => {
  try {
    // Query today's and yesterday's messages (messages older than 2 days are deleted)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayCollection = getMessagesCollection(today);
    const yesterdayCollection = getMessagesCollection(yesterday);

    // Store messages from both collections
    let todayMessages: ChatMessage[] = [];
    let yesterdayMessages: ChatMessage[] = [];

    // Combined update function that merges messages from both collections
    const handleCombinedUpdate = () => {
      // Merge and sort all messages
      const allMessages = [...yesterdayMessages, ...todayMessages];

      // Sort by timestamp (ascending - oldest first)
      allMessages.sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() || 0;
        const bTime = b.timestamp?.toMillis?.() || 0;
        return aTime - bTime;
      });

      // Apply limit (keep most recent N messages)
      const limitedMessages = allMessages.slice(-messageLimit);

      onMessagesUpdate(limitedMessages);
    };

    // Subscribe to today's collection
    const unsubscribeToday = subscribeToMessagesInCollection(
      todayCollection,
      conversationId,
      (messages) => {
        todayMessages = messages;
        handleCombinedUpdate();
      },
      onError,
      messageLimit
    );

    // Subscribe to yesterday's collection
    const unsubscribeYesterday = subscribeToMessagesInCollection(
      yesterdayCollection,
      conversationId,
      (messages) => {
        yesterdayMessages = messages;
        handleCombinedUpdate();
      },
      onError,
      messageLimit
    );

    // Return combined unsubscribe function
    return () => {
      unsubscribeToday();
      unsubscribeYesterday();
    };
  } catch (error) {
    console.error("❌ Error subscribing to messages:", error);
    throw error;
  }
};

/**
 * Subscribe to messages in a specific date-partitioned collection
 * Helper function for subscribeToMessages
 * ✅ INDEX-FREE: Uses only conversationId filter, sorts in memory
 */
const subscribeToMessagesInCollection = (
  messagesCollection: string,
  conversationId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
  messageLimit: number = MESSAGES_PER_BATCH
) => {
  const messagesRef = collection(db, messagesCollection);

  // ✅ INDEX-FREE QUERY: Only filter by conversationId (no composite index needed)
  // Sort in memory instead of using orderBy (avoids needing index for each date collection)
  const q = query(
    messagesRef,
    where("conversationId", "==", conversationId)
    // No orderBy - will sort in memory
  );

  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      // 🚀 PARALLEL DECRYPTION for maximum speed
      const decryptPromises = snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let decryptedText = data.text;

        // 🔐 DECRYPT if message is encrypted (with conversation-specific key)
        if (data.encrypted && encryptionService.isEncrypted(data.text)) {
          try {
            decryptedText = await encryptionService.decryptMessage(
              data.text,
              conversationId
            );
          } catch (error) {
            console.error("❌ Decryption failed:", error);
            decryptedText = "[Encrypted message]";
          }
        }

        return {
          id: doc.id,
          ...data,
          text: decryptedText, // Use decrypted text
        } as ChatMessage;
      });

      // Wait for all decryptions to complete in parallel
      let messages = await Promise.all(decryptPromises);

      // ✅ SORT IN MEMORY by timestamp (ascending - oldest first)
      messages.sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() || 0;
        const bTime = b.timestamp?.toMillis?.() || 0;
        return aTime - bTime; // Ascending order (oldest first)
      });

      // Apply limit after sorting (keep most recent N messages)
      if (messages.length > messageLimit) {
        messages = messages.slice(-messageLimit); // Keep last N messages
      }

      onMessagesUpdate(messages);
    },
    (error) => {
      console.error("❌ Error in message subscription:", error);
      if (onError) {
        onError(error as Error);
      }
    }
  );

  return unsubscribe;
};

/**
 * Get user's active conversations (only last 2)
 * Simplified query to avoid needing composite index
 */
export const getUserConversations = async (
  userId: string
): Promise<Conversation[]> => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);

    // Simple query with just array-contains (no index needed)
    const q = query(
      conversationsRef,
      where("participants", "array-contains", userId)
    );

    const snapshot = await getDocs(q);
    const allConversations: Conversation[] = [];

    snapshot.forEach((doc) => {
      allConversations.push({
        id: doc.id,
        ...doc.data(),
      } as Conversation);
    });

    const now = new Date();

    // Filter and sort in memory (avoids needing Firestore indexes)
    const filtered = allConversations
      .filter((conv) => {
        // Filter out conversations past deletion date (3 days after creation)
        if (conv.deleteAt) {
          const deleteDate = conv.deleteAt.toDate();
          if (now > deleteDate) {
            return false; // Delete after 3 days
          }
        }
        // Show ALL conversations (active or ended) until deletion date
        // This allows viewing chat history even after ending
        return true;
      })
      .sort((a, b) => {
        // Sort by lastMessageTimestamp, fallback to createdAt
        const aTime =
          a.lastMessageTimestamp?.toMillis() || a.createdAt?.toMillis() || 0;
        const bTime =
          b.lastMessageTimestamp?.toMillis() || b.createdAt?.toMillis() || 0;
        return bTime - aTime; // Descending order (newest first)
      })
      .slice(0, 2); // Take only the first 2

    console.log(
      `✅ Found ${filtered.length} active conversations (from ${allConversations.length} total)`
    );
    return filtered;
  } catch (error) {
    console.error("❌ Error getting conversations:", error);
    throw error;
  }
};

/**
 * Subscribe to user's conversations in real-time
 * Returns unsubscribe function
 */
export const subscribeToUserConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
): (() => void) => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(
      conversationsRef,
      where("participants", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allConversations: Conversation[] = [];

      snapshot.forEach((doc) => {
        allConversations.push({
          id: doc.id,
          ...doc.data(),
        } as Conversation);
      });

      const now = new Date();

      // Filter and sort in memory
      const filtered = allConversations
        .filter((conv) => {
          // Filter out conversations past deletion date (3 days after creation)
          if (conv.deleteAt) {
            const deleteDate = conv.deleteAt.toDate();
            if (now > deleteDate) {
              return false; // Delete after 3 days
            }
          }
          // Show ALL conversations (active or ended) until deletion date
          // This allows viewing chat history even after ending
          return true;
        })
        .sort((a, b) => {
          const aTime =
            a.lastMessageTimestamp?.toMillis() || a.createdAt?.toMillis() || 0;
          const bTime =
            b.lastMessageTimestamp?.toMillis() || b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        })
        .slice(0, 2);

      callback(filtered);
    });

    return unsubscribe;
  } catch (error) {
    console.error("❌ Error subscribing to conversations:", error);
    return () => {};
  }
};

/**
 * End a conversation (can be called by either participant)
 * ✅ When one user ends conversation, it closes for BOTH participants
 */
export const endConversation = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);

    // Update conversation to ended state
    // This will be visible to BOTH participants via real-time listeners
    await updateDoc(conversationRef, {
      isActive: false,
      endedBy: userId,
      endedAt: serverTimestamp(),
    });

    console.log(
      `✅ Conversation ended by ${userId} - closes for both participants`
    );
  } catch (error) {
    console.error("❌ Error ending conversation:", error);
    throw error;
  }
};

/**
 * Mark messages as read
 * ✅ SCALE OPTIMIZED: Queries today's and yesterday's message collections only
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    // Query today's and yesterday's messages
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const collections = [
      getMessagesCollection(today),
      getMessagesCollection(yesterday),
    ];

    const batch = writeBatch(db);
    let count = 0;

    // Query both collections
    for (const collectionName of collections) {
      const messagesRef = collection(db, collectionName);
      const q = query(
        messagesRef,
        where("conversationId", "==", conversationId)
      );

      const snapshot = await getDocs(q);

      // Filter in memory - only mark unread messages from other user
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.senderId !== userId && data.read === false) {
          batch.update(doc.ref, { read: true });
          count++;
        }
      });
    }

    if (count > 0) {
      await batch.commit();
      console.log(`✅ Marked ${count} messages as read`);
    }
  } catch (error) {
    console.error("❌ Error marking messages as read:", error);
    // Don't throw - this is not critical
  }
};

/**
 * Get conversation by match ID
 */
export const getConversationByMatchId = async (
  matchId: string
): Promise<Conversation | null> => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(conversationsRef, where("matchId", "==", matchId));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Conversation;
  } catch (error) {
    console.error("❌ Error getting conversation by match:", error);
    return null;
  }
};

/**
 * Check if conversation has expired
 * Adds a 30-minute grace period after midnight for testing
 */
export const isConversationExpired = (conversation: Conversation): boolean => {
  const now = new Date();
  const expiresAt = conversation.expiresAt.toDate();

  // Add 30-minute grace period (1800000 milliseconds) for testing
  const GRACE_PERIOD_MS = 30 * 60 * 1000;
  const expiresWithGrace = new Date(expiresAt.getTime() + GRACE_PERIOD_MS);

  return now > expiresWithGrace;
};

/**
 * Get unread message count for a conversation
 * ✅ SCALE OPTIMIZED: Queries today's and yesterday's message collections only
 */
export const getUnreadCount = async (
  conversationId: string,
  userId: string
): Promise<number> => {
  try {
    // Query today's and yesterday's messages
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const collections = [
      getMessagesCollection(today),
      getMessagesCollection(yesterday),
    ];

    let count = 0;

    // Query both collections
    for (const collectionName of collections) {
      const messagesRef = collection(db, collectionName);
      const q = query(
        messagesRef,
        where("conversationId", "==", conversationId)
      );

      const snapshot = await getDocs(q);

      // Count unread messages from other user in memory
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.senderId !== userId && data.read === false) {
          count++;
        }
      });
    }

    return count;
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    return 0;
  }
};

/**
 * Archive old conversations (cleanup - can be called periodically)
 * This moves conversations older than the 2 most recent to archived state
 * Simplified to avoid needing composite index
 */
export const archiveOldConversations = async (
  userId: string
): Promise<void> => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);

    // Simple query - no index needed
    const q = query(
      conversationsRef,
      where("participants", "array-contains", userId)
    );

    const snapshot = await getDocs(q);

    // Filter and sort in memory
    const activeConversations = snapshot.docs
      .map((doc) => ({
        ref: doc.ref,
        data: doc.data() as Conversation,
      }))
      .filter((item) => item.data.isActive)
      .sort((a, b) => {
        const aTime =
          a.data.lastMessageTimestamp?.toMillis() ||
          a.data.createdAt?.toMillis() ||
          0;
        const bTime =
          b.data.lastMessageTimestamp?.toMillis() ||
          b.data.createdAt?.toMillis() ||
          0;
        return bTime - aTime;
      });

    // If 2 or fewer conversations, nothing to archive
    if (activeConversations.length <= 2) {
      return;
    }

    // Archive conversations beyond the first 2
    const batch = writeBatch(db);
    let count = 0;

    activeConversations.forEach((item, index) => {
      if (index >= 2) {
        batch.update(item.ref, {
          isActive: false,
          endedAt: serverTimestamp(),
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ Archived ${count} old conversations`);
    }
  } catch (error) {
    console.error("❌ Error archiving conversations:", error);
  }
};

/**
 * Delete expired conversations and their messages (admin/cleanup function)
 */
export const deleteExpiredConversations = async (): Promise<number> => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const now = Timestamp.now();

    const q = query(
      conversationsRef,
      where("expiresAt", "<", now),
      where("isActive", "==", true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return 0;
    }

    const batch = writeBatch(db);
    let count = 0;

    // End all expired conversations
    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        isActive: false,
        endedAt: serverTimestamp(),
      });
      count++;
    });

    await batch.commit();
    console.log(`✅ Expired ${count} conversations`);
    return count;
  } catch (error) {
    console.error("❌ Error deleting expired conversations:", error);
    return 0;
  }
};

/**
 * Get conversation details with partner info
 */
export const getConversationWithPartner = async (
  conversationId: string,
  currentUserId: string
): Promise<{
  conversation: Conversation;
  partnerId: string;
} | null> => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      return null;
    }

    const conversation = {
      id: conversationSnap.id,
      ...conversationSnap.data(),
    } as Conversation;

    // Find partner ID
    const partnerId = conversation.participants.find(
      (id) => id !== currentUserId
    );

    if (!partnerId) {
      return null;
    }

    return {
      conversation,
      partnerId,
    };
  } catch (error) {
    console.error("❌ Error getting conversation with partner:", error);
    return null;
  }
};
