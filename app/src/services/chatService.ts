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

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: any;
  read: boolean;
  type: "text" | "photo"; // Future: support photos
}

export interface Conversation {
  id: string;
  participants: string[]; // [userId1, userId2]
  lastMessage?: string;
  lastMessageTimestamp?: any;
  createdAt: any;
  expiresAt: any; // Midnight of creation day
  isActive: boolean;
  endedBy?: string; // userId who ended the conversation
  endedAt?: any;
  // Match info
  matchId: string;
  isRevealed: boolean; // Only show chat after reveal
}

const MESSAGES_COLLECTION = "messages";
const CONVERSATIONS_COLLECTION = "conversations";
const MAX_MESSAGE_LENGTH = 500; // Character limit per message
const MESSAGES_PER_BATCH = 50; // Load 50 messages at a time

/**
 * Get midnight of the current day (for expiration)
 */
const getMidnightTonight = (): Date => {
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  return midnight;
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
      expiresAt: Timestamp.fromDate(getMidnightTonight()),
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
      throw new Error(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`);
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

    // Create message document
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const messageData: Omit<ChatMessage, "id"> = {
      conversationId,
      senderId,
      text: text.trim(),
      timestamp: serverTimestamp(),
      read: false,
      type: "text",
    };

    const messageDoc = await addDoc(messagesRef, messageData);

    // Update conversation's last message
    await updateDoc(conversationRef, {
      lastMessage: text.trim().substring(0, 100), // Store preview (100 chars)
      lastMessageTimestamp: serverTimestamp(),
    });

    console.log("✅ Message sent:", messageDoc.id);
    return messageDoc.id;
  } catch (error) {
    console.error("❌ Error sending message:", error);
    throw error;
  }
};

/**
 * Get messages for a conversation (with real-time updates)
 */
export const subscribeToMessages = (
  conversationId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const q = query(
      messagesRef,
      where("conversationId", "==", conversationId),
      orderBy("timestamp", "asc"),
      limit(MESSAGES_PER_BATCH)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          messages.push({
            id: doc.id,
            ...doc.data(),
          } as ChatMessage);
        });
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
  } catch (error) {
    console.error("❌ Error subscribing to messages:", error);
    throw error;
  }
};

/**
 * Get user's active conversations (only last 2)
 */
export const getUserConversations = async (
  userId: string
): Promise<Conversation[]> => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(
      conversationsRef,
      where("participants", "array-contains", userId),
      where("isActive", "==", true),
      where("isRevealed", "==", true),
      orderBy("lastMessageTimestamp", "desc"),
      limit(2) // Only show last 2 matches
    );

    const snapshot = await getDocs(q);
    const conversations: Conversation[] = [];

    snapshot.forEach((doc) => {
      conversations.push({
        id: doc.id,
        ...doc.data(),
      } as Conversation);
    });

    console.log(`✅ Found ${conversations.length} active conversations`);
    return conversations;
  } catch (error) {
    console.error("❌ Error getting conversations:", error);
    throw error;
  }
};

/**
 * End a conversation (can be called by either participant)
 */
export const endConversation = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    
    await updateDoc(conversationRef, {
      isActive: false,
      endedBy: userId,
      endedAt: serverTimestamp(),
    });

    console.log("✅ Conversation ended");
  } catch (error) {
    console.error("❌ Error ending conversation:", error);
    throw error;
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const q = query(
      messagesRef,
      where("conversationId", "==", conversationId),
      where("senderId", "!=", userId),
      where("read", "==", false)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return; // No unread messages
    }

    const batch = writeBatch(db);
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
    console.log(`✅ Marked ${snapshot.size} messages as read`);
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
 */
export const isConversationExpired = (conversation: Conversation): boolean => {
  const now = new Date();
  const expiresAt = conversation.expiresAt.toDate();
  return now > expiresAt;
};

/**
 * Get unread message count for a conversation
 */
export const getUnreadCount = async (
  conversationId: string,
  userId: string
): Promise<number> => {
  try {
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const q = query(
      messagesRef,
      where("conversationId", "==", conversationId),
      where("senderId", "!=", userId),
      where("read", "==", false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    return 0;
  }
};

/**
 * Archive old conversations (cleanup - can be called periodically)
 * This moves conversations older than the 2 most recent to archived state
 */
export const archiveOldConversations = async (userId: string): Promise<void> => {
  try {
    const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(
      conversationsRef,
      where("participants", "array-contains", userId),
      where("isActive", "==", true),
      orderBy("lastMessageTimestamp", "desc")
    );

    const snapshot = await getDocs(q);
    
    // If 2 or fewer conversations, nothing to archive
    if (snapshot.size <= 2) {
      return;
    }

    // Archive conversations beyond the first 2
    const batch = writeBatch(db);
    let count = 0;
    
    const docsArray = snapshot.docs;
    docsArray.forEach((doc, index) => {
      if (index >= 2) {
        batch.update(doc.ref, {
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
