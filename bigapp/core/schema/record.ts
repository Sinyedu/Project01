import { z } from "zod";
import { PlatformSchema } from "./source";

export const RecordKindSchema = z.enum([
  "account",
  "post",
  "message",
  "conversation",
  "comment",
  "reaction",
  "media_asset",
  "contact",
]);

// Flexible data payload since it varies by kind
export const RecordDataSchema = z.record(z.unknown());
export const NormalizedRecordSchema = z.object({
  _id: z.any().optional(),
  userId: z.string(),
  snapshotId: z.string().optional(),
  connectionId: z.string(),
  platform: PlatformSchema,
  ingestionMode: z.enum([
    "public_import",
    "export_import",
    "portability_push",
    "api_pull",
    "organize",
  ]).default("export_import"),
  kind: RecordKindSchema,
  sourceId: z.string(), // ID from the external platform
  sourceTimestamp: z.date().optional(),
  data: RecordDataSchema,
  mediaRefs: z.array(z.string()).default([]), // URLs or Asset IDs
  checksum: z.string(), // For deduplication
  tags: z.array(z.string()).default([]), // AI or manual tags
  embedding: z.array(z.number()).optional(), // Vector embedding
  createdAt: z.date().default(() => new Date()),
});

export type NormalizedRecord = z.infer<typeof NormalizedRecordSchema>;
