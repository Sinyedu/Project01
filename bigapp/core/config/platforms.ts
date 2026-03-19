import type { Platform, ContentType } from "@/core/types";

interface PlatformConfig {
  name: string;
  supportedContentTypes: ContentType[];
  color: string;
}

export const platformConfigs: Record<Platform, PlatformConfig> = {
  instagram: {
    name: "Instagram",
    supportedContentTypes: ["post", "story", "message", "media", "profile"],
    color: "#E1306C",
  },
  facebook: {
    name: "Facebook",
    supportedContentTypes: ["post", "story", "message", "media", "profile"],
    color: "#1877F2",
  },
  twitter: {
    name: "Twitter / X",
    supportedContentTypes: ["post", "message", "media", "profile"],
    color: "#1DA1F2",
  },
  whatsapp: {
    name: "WhatsApp",
    supportedContentTypes: ["message", "media", "profile"],
    color: "#25D366",
  },
  telegram: {
    name: "Telegram",
    supportedContentTypes: ["post", "message", "media", "profile"],
    color: "#0088CC",
  },
  tiktok: {
    name: "TikTok",
    supportedContentTypes: ["post", "message", "media", "profile"],
    color: "#000000",
  },
};
