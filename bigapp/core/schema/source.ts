import { z } from "zod";

export const PlatformSchema = z.enum([
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "linkedin",
  "whatsapp",
  "telegram",
  "email",
  "sms",
  "photos",
  "contacts",
  "x",
  "other",
]);

export const IngestionModeSchema = z.enum([
  "public_import",
  "export_import",
]);

export const SourceConnectionSchema = z.object({
  _id: z.string().optional(), // MongoDB ID
  userId: z.string(),
  platform: PlatformSchema,
  mode: IngestionModeSchema,
  displayName: z.string().optional(),
  lastSnapshotAt: z.date().optional(),
  status: z.enum(["active", "revoked", "error", "completed"]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type SourceConnection = z.infer<typeof SourceConnectionSchema>;
