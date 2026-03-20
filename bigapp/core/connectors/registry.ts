import type { Source } from "@/core/types/source";
import type { PlatformConnector } from "./types";
import { instagramConnector } from "./instagram";
import { facebookConnector } from "./facebook";
import { xConnector } from "./x";
import { telegramConnector } from "./telegram";
import { whatsappConnector } from "./whatsapp";
import { tiktokConnector } from "./tiktok";

const registry: Partial<Record<Source, PlatformConnector>> = {
  instagram: instagramConnector,
  facebook: facebookConnector,
  x: xConnector,
  twitter: xConnector, // Alias
  telegram: telegramConnector,
  whatsapp: whatsappConnector,
  tiktok: tiktokConnector,
};

export function getConnector(source: Source): PlatformConnector {
  const connector = registry[source];
  if (!connector) {
    throw new Error(`No connector implemented for platform: ${source}`);
  }
  return connector;
}
