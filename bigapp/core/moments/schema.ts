import { z } from "zod";

export const MomentTypeSchema = z.enum([
  "profile",
  "event",
  "topic",
  "conversation",
  "period",
  "other",
]);

export const MomentSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  type: MomentTypeSchema,
  sourceTypes: z.array(z.string()).default([]),
  sourceUrls: z.array(z.string()).default([]),
  assetIds: z.array(z.string()).default([]),
  rawSnapshotIds: z.array(z.string()).default([]),
  snapshotIds: z.array(z.string()).default([]), // For export-based snapshot jobs
  normalizedEntityIds: z.array(z.string()).default([]),
  people: z.array(z.string()).default([]),
  places: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  startAt: z.date().optional(),
  endAt: z.date().optional(),
  heroImageAssetId: z.string().optional(),
  confidence: z.number().default(1.0),
  clusteringVersion: z.string().default("1.0"),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Moment = z.infer<typeof MomentSchema>;

export const MomentMembershipReasonSchema = z.enum([
  "same-source-url",
  "same-display-name",
  "shared-entity",
  "close-timestamp",
  "similar-description",
  "preferred-og-image",
  "same-external-id",
  "same-canonical-url",
]);

export const MomentMembershipSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  momentId: z.string(),
  targetId: z.string(), // NormalizedProfile, MediaAsset, or NormalizedRecord
  targetType: z.enum(["profile", "asset", "record"]),
  membershipReason: z.array(MomentMembershipReasonSchema).default([]),
  score: z.number().default(1.0),
  createdAt: z.date().default(() => new Date()),
});
export type MomentMembership = z.infer<typeof MomentMembershipSchema>;

export const AIEnrichmentSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  targetType: z.enum(["moment", "asset", "profile"]),
  targetId: z.string(),
  model: z.string(),
  modelVersion: z.string(),
  tags: z.array(z.string()).default([]),
  entities: z.object({
    people: z.array(z.string()).default([]),
    places: z.array(z.string()).default([]),
    events: z.array(z.string()).default([]),
    themes: z.array(z.string()).default([]),
  }),
  summary: z.string().optional(),
  titleSuggestion: z.string().optional(),
  confidence: z.number(),
  rerunnable: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
});
export type AIEnrichment = z.infer<typeof AIEnrichmentSchema>;
