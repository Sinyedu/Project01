export const PLATFORMS = [
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

export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: string): value is Platform {
  return PLATFORMS.includes(value as Platform);
}
