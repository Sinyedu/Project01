import { archives } from "@/core/db";
import { captureUrl } from "./capture";
import { archiveMedia } from "./storage";
import { aiService } from "@/core/ai/service";
import type { ArchiveItem, Platform, ContentType } from "@/core/types";

interface CaptureInput {
  url: string;
  platform: Platform;
  contentType: ContentType;
  userId: string;
  tags?: string[];
}

/**
 * Full capture pipeline: extract metadata → archive media → AI enrichment → persist to MongoDB.
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

  // AI Enrichment: If title or textContent is missing/short, or just to get tags
  const contentForAI = [data.title, data.textContent, input.url].filter(Boolean).join("\n");
  const enrichment = await aiService.enrichText(contentForAI);
  const embedding = await aiService.generateEmbedding(contentForAI);

  const item: ArchiveItem = {
    userId: input.userId,
    platform: input.platform,
    contentType: input.contentType,
    status: "preserved",
    sourceUrl: input.url,
    title: data.title || enrichment.summary || `Archive from ${input.platform}`,
    author: data.author,
    textContent: data.textContent || enrichment.summary,
    tags: [...(input.tags ?? []), ...enrichment.tags],
    media,
    embedding,
    contentHash: data.contentHash,
    sourceAlive: true,
    lastVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(item);
  return item;
}
