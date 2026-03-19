import { z } from "zod";

export const MemoryBundleSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  mediaIds: z.array(z.string()), // IDs of MediaAsset or NormalizedRecord
  coverImageId: z.string(), // ID of the cover MediaAsset
  title: z.string().nullable(),
  mediaCount: z.number(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type MemoryBundle = z.infer<typeof MemoryBundleSchema>;
