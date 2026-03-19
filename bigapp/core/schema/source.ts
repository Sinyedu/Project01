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
  "other",
]);

export const ConnectorModeSchema = z.enum([
  "api_pull",
  "portability_push",
  "export_upload",
  "local_importer",
]);

export const SourceConnectionSchema = z.object({
  _id: z.string().optional(), // MongoDB ID
  userId: z.string(),
  platform: PlatformSchema,
  mode: ConnectorModeSchema,
  displayName: z.string().optional(),
  credentials: z.object({
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    expiresAt: z.date().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(), // Encrypt this in real app!
  }).optional(),
  scopes: z.array(z.string()).optional(),
  cursor: z.string().optional(), // For pagination
  lastSnapshotAt: z.date().optional(),
  status: z.enum(["active", "revoked", "error"]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type SourceConnection = z.infer<typeof SourceConnectionSchema>;
