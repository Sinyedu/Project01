import { archives } from "@/core/db";
import { captureUrl } from "./capture";
import { archiveMedia } from "./storage";
import type { ArchiveItem, Platform, ContentType } from "@/core/types";

interface CaptureInput {
  url: string;
  platform: Platform;
  contentType: ContentType;
  userId: string;
  tags?: string[];
}

/**
 * Full capture pipeline: extract metadata → archive media → persist to MongoDB.
 * Returns the created archive item.
 */
export async function runCapture(input: CaptureInput): Promise<ArchiveItem> {
  const col = await archives();
  const now = new Date();

  const data = await captureUrl(input.url, input.platform);

  // Deduplicate by content hash
  if (data.contentHash) {
    const existing = await col.findOne({ contentHash: data.contentHash });
    if (existing) return existing;
  }

  // Archive thumbnail/image to Cloudinary if present
  const media = [];
  if (data.thumbnailUrl) {
    try {
      const archived = await archiveMedia(data.thumbnailUrl);
      media.push(archived);
    } catch {
      // non-fatal — we still keep the text content
    }
  }

  const item: ArchiveItem = {
    userId: input.userId,
    platform: input.platform,
    contentType: input.contentType,
    status: "preserved",
    sourceUrl: input.url,
    title: data.title,
    author: data.author,
    textContent: data.textContent,
    tags: input.tags ?? [],
    media,
    contentHash: data.contentHash,
    sourceAlive: true,
    lastVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(item);
  return item;
}
