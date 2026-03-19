import type { Platform } from "./platforms";

export type ContentType = "post" | "story" | "message" | "media" | "profile";
export type ArchiveStatus = "pending" | "processing" | "preserved" | "failed";
export type MediaType = "image" | "video" | "audio" | "document";

export interface ArchiveItem {
  _id?: string;
  platform: Platform;
  contentType: ContentType;
  status: ArchiveStatus;
  sourceUrl?: string;
  textContent?: string;
  tags: string[];
  media: ArchivedMedia[];
  createdAt: Date;
  updatedAt: Date;
  originalTimestamp?: Date;
}

export interface ArchivedMedia {
  originalUrl: string;
  archivedUrl: string;
  mediaType: MediaType;
  sizeBytes?: number;
}
