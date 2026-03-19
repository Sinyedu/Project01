export const PLATFORMS = [
  "instagram",
  "facebook",
  "twitter",
  "whatsapp",
  "telegram",
  "tiktok",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: string): value is Platform {
  return PLATFORMS.includes(value as Platform);
}
