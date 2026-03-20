export const SOURCES = [
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
] as const;

export type Source = (typeof SOURCES)[number];

export type IngestionMode = "public_import" | "export_import" | "portability_push" | "api_pull" | "organize";

export function isSource(value: string): value is Source {
  return SOURCES.includes(value as Source);
}
