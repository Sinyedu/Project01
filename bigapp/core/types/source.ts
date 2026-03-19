export const SOURCES = [
  "instagram",
  "facebook",
  "tiktok",
  "telegram",
  "whatsapp",
  "x",
] as const;

export type Source = (typeof SOURCES)[number];

export function isSource(value: string): value is Source {
  return SOURCES.includes(value as Source);
}
