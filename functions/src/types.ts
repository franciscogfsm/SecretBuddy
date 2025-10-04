// Type definitions for Cloud Functions

export interface PoolUser {
  userId: string;
  poolType: "morning" | "afternoon";
  gameMode: "friends" | "country" | "world";
  joinedAt: FirebaseFirestore.Timestamp;
  country?: string;
  friendIds?: string[];
}

export interface Pair {
  userA: string;
  userB: string;
  poolId: string;
  poolType: "morning" | "afternoon";
  pairedAt: FirebaseFirestore.Timestamp;

  // Photo window (same for all pairs in this pool/day)
  photoWindowStart: FirebaseFirestore.Timestamp;
  photoWindowEnd: FirebaseFirestore.Timestamp;
  maxPhotos: number; // 1-3 for morning, always 1 for afternoon

  // Reveal timing (same for all pairs)
  revealAt: FirebaseFirestore.Timestamp;

  // Photo tracking
  photosA: number;
  photosB: number;

  // Reveal status
  canRevealA: boolean; // true if userA sent >= 1 photo
  canRevealB: boolean; // true if userB sent >= 1 photo
  revealedA: boolean;
  revealedB: boolean;

  // Conversation
  conversationId?: string;
  chatEndedAt?: FirebaseFirestore.Timestamp;

  status: "active" | "revealed" | "expired";
}

export interface Pool {
  id: string;
  type: "morning" | "afternoon";
  date: string; // YYYY-MM-DD

  // Join window
  joinWindowStart: FirebaseFirestore.Timestamp;
  joinWindowEnd: FirebaseFirestore.Timestamp;

  // Photo window (determined when pairs are created)
  photoWindowStart: FirebaseFirestore.Timestamp;
  photoWindowEnd: FirebaseFirestore.Timestamp;
  maxPhotos: number;

  // Reveal time (random between 21:00-22:00)
  revealAt: FirebaseFirestore.Timestamp;

  status: "open" | "pairing" | "closed";
  userCount: number;
  pairsCount: number;
}
