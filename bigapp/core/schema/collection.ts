import { z } from "zod";

export const VaultCollectionSchema = z.object({
  _id: z.any().optional(),
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  coverItemIds: z.array(z.string()).default([]), // Up to 4 for a collage or just 1
  itemIds: z.array(z.string()).default([]), // List of VaultItem IDs
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type VaultCollection = z.infer<typeof VaultCollectionSchema>;
