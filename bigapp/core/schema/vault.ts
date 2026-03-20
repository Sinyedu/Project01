import { z } from "zod";

export const VaultSchema = z.object({
  _id: z.any().optional(),
  userId: z.string(),
  name: z.string().default("My Vault"),
  description: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Vault = z.infer<typeof VaultSchema>;

export const VaultItemSchema = z.object({
  _id: z.any().optional(),
  vaultId: z.string(),
  userId: z.string(),
  type: z.enum(["image", "video"]),
  originalFilename: z.string(),
  storagePath: z.string(),
  storageId: z.string().optional(), // Cloudinary public_id or local relative path
  thumbnailPath: z.string().optional(),
  captureDate: z.date(),
  dateSource: z.string(),
  monthKey: z.string(), // e.g., "2023-07"
  metadata: z.record(z.unknown()).default({}),
  checksum: z.string(),
  tags: z.array(z.string()).default([]),
  caption: z.string().optional(),
  aiGenerated: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type VaultItem = z.infer<typeof VaultItemSchema>;
