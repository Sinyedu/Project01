import type { Source } from "./source";
import type { ConnectorMode } from "./connector";

export type RecordKind =
  | "account"
  | "post"
  | "message"
  | "conversation"
  | "comment"
  | "reaction"
  | "media_asset"
  | "contact";

// --- Entity data shapes (what connectors produce) ---

export interface AccountData {
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  followerCount?: number;
  followingCount?: number;
}

export interface PostData {
  text?: string;
  mediaUrls: string[];
  likes?: number;
  shares?: number;
  replyTo?: string;
}

export interface ConversationData {
  title?: string;
  participants: string[];
  messageCount?: number;
}

export interface CommentData {
  postId?: string;
  text?: string;
  authorName?: string;
}

export interface MediaAssetData {
  url: string;
  archivedUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface ContactData {
  name?: string;
  normalizedKey: string;
  platformId?: string;
  handle?: string;
  phone?: string;
  username?: string;
  nameVariants?: string[];
}

export interface MessageData {
  conversationId?: string;
  contactKey?: string;
  senderName?: string;
  text?: string;
  mediaUrls: string[];
}

// --- What a connector parser returns (before provenance is added) ---

export interface ParseResult {
  kind: RecordKind;
  sourceId: string;
  sourceTimestamp?: Date;
  data: Record<string, unknown>;
  mediaRefs: string[];
}

// --- Full record stored in MongoDB ---

export interface NormalizedRecord {
  _id?: string;
  userId: string;
  snapshotId: string;
  connectionId: string;
  source: Source;
  kind: RecordKind;
  sourceId: string;
  sourceTimestamp?: Date;
  data: Record<string, unknown>;
  mediaRefs: string[];
  checksum: string;
  tags: string[];
  embedding?: number[];
  importMethod: ConnectorMode;
  createdAt: Date;
}
