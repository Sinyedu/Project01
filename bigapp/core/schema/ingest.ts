import { z } from "zod";

export const RawSnapshotSchema = z.object({
  _id: z.any().optional(),
  userId: z.string(),
  source: z.string(),
  sourceUrl: z.string(),
  fetchedAt: z.date(),
  httpStatus: z.number().optional(),
  rawHtml: z.string().optional(),
  extractedText: z.string().optional(),
  parserVersion: z.string(),
  status: z.enum(["success", "failed"]),
});
export type RawSnapshot = z.infer<typeof RawSnapshotSchema>;

export const MediaAssetSchema = z.object({
  _id: z.any().optional(),
  userId: z.string(),
  ownerEntityId: z.string().optional(),
  source: z.string(),
  sourceUrl: z.string(), // e.g. the url of the post/profile it came from
  originalRemoteUrl: z.string(),
  ingestionMode: z.enum([
    "public_import",
    "export_import",
    "portability_push",
    "api_pull",
    "organize",
  ]).default("public_import"),
  storageProvider: z.enum(["local", "cloudinary", "pending"]),
  storageKey: z.string().optional(),
  secureUrl: z.string().optional(), // local path or cloudinary url
  assetType: z.enum(["image", "video", "raw", "unknown"]),
  mimeType: z.string().optional(),
  extension: z.string().optional(),
  bytes: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  sha256: z.string().optional(),
  isFavorite: z.boolean().default(false),
  isImportant: z.boolean().default(false),
  discoveredFrom: z.string().optional(), // e.g. 'og:image', 'video'
  extractionConfidence: z.number().default(1.0),
  status: z.enum(["pending", "downloading", "completed", "failed"]),
  error: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

export const NormalizedProfileSchema = z.object({
  _id: z.any().optional(),
  userId: z.string(),
  source: z.string(),
  sourceUrl: z.string(),
  ingestionMode: z.enum([
    "public_import",
    "export_import",
    "portability_push",
    "api_pull",
    "organize",
  ]).default("public_import"),
  externalId: z.string().optional(),
  displayName: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  canonicalUrl: z.string().optional(),
  localeText: z.string().optional(),
  profileImageAssetId: z.string().optional(),
  heroImageAssetId: z.string().optional(),
  completeness: z.number().default(0),
  provenance: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type NormalizedProfile = z.infer<typeof NormalizedProfileSchema>;
