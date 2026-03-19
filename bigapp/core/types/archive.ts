import type { Platform } from "./platforms";

export type ContentType = "post" | "story" | "message" | "media" | "profile";
export type ArchiveStatus = "pending" | "processing" | "preserved" | "failed";
export type MediaType = "image" | "video" | "audio" | "document";

export interface ArchivedMedia {
  originalUrl: string;
  archivedUrl: string;
  mediaType: MediaType;
  sizeBytes?: number;
}

export interface ContextSnapshot {
  headline?: string;
  location?: string;
  language?: string;
  worldEvents?: string[];
  culturalNote?: string;
}

export interface ArchiveItem {
  _id?: string;
  userId: string;
  platform: Platform;
  contentType: ContentType;
  status: ArchiveStatus;
  sourceUrl?: string;
  title?: string;
  author?: string;
  textContent?: string;
  tags: string[];
  media: ArchivedMedia[];
  context?: ContextSnapshot;
  contentHash?: string;
  sourceAlive: boolean;
  lastVerifiedAt?: Date;
  originalTimestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --- Capture Jobs ---

export type CaptureFrequency = "once" | "hourly" | "daily" | "weekly";

export interface CaptureJob {
  _id?: string;
  userId: string;
  url: string;
  platform: Platform;
  contentType: ContentType;
  frequency: CaptureFrequency;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt: Date;
  failCount: number;
  createdAt: Date;
}

// --- Time Capsules ---

export type CapsuleStatus = "locked" | "unlocked" | "delivered";

export interface TimeCapsule {
  _id?: string;
  userId: string;
  title: string;
  textContent?: string;
  media: ArchivedMedia[];
  tags: string[];
  lockedUntil: Date;
  recipientEmail?: string;
  status: CapsuleStatus;
  createdAt: Date;
  unlockedAt?: Date;
}
