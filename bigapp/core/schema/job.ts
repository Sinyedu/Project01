import { z } from "zod";

export const JobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const JobTypeSchema = z.enum([
  "ingest_export", // Parse a file
  "api_sync",      // Pull from API
  "enrich_ai",     // Run AI summary/tags
  "index_search",  // Update search index
  "generate_thumbnails",
  "process_instagram_memories",
  "organize_zip",
  "enrich_vault_item",
]);

export const JobSchema = z.object({
  _id: z.any().optional(),
  userId: z.string(),
  type: JobTypeSchema,
  status: JobStatusSchema,
  payload: z.record(z.unknown()), // Function arguments
  result: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  attempts: z.number().default(0),
  maxAttempts: z.number().default(3),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  processedAt: z.date().optional(),
});

export type Job = z.infer<typeof JobSchema>;
