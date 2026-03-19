import { createHash } from "crypto";
import type { Platform } from "@/core/types";

export interface CapturedData {
  title?: string;
  author?: string;
  textContent?: string;
  thumbnailUrl?: string;
  contentHash: string;
  platform: Platform;
  sourceUrl: string;
}

// oEmbed endpoints — free, no API keys, return structured JSON for public content
const OEMBED_ENDPOINTS: Partial<Record<Platform, string>> = {
  twitter: "https://publish.twitter.com/oembed",
  instagram: "https://api.instagram.com/oembed",
  tiktok: "https://www.tiktok.com/oembed",
};

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  author_url?: string;
  html?: string;
  thumbnail_url?: string;
}

async function fetchOEmbed(platform: Platform, url: string): Promise<OEmbedResponse | null> {
  const endpoint = OEMBED_ENDPOINTS[platform];
  if (!endpoint) return null;

  try {
    const res = await fetch(`${endpoint}?url=${encodeURIComponent(url)}&format=json`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Extracts Open Graph meta tags from raw HTML — works for any public URL
function extractOgTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const regex = /<meta\s+(?:property|name)=["'](og:|twitter:)([^"']+)["']\s+content=["']([^"']*)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    tags[`${match[1]}${match[2]}`] = match[3];
  }
  return tags;
}

async function fetchOgData(url: string) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "BigAppArchiver/1.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractOgTags(html);
  } catch {
    return null;
  }
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Captures structured data from a URL using oEmbed (if available) + OG fallback.
 */
export async function captureUrl(url: string, platform: Platform): Promise<CapturedData> {
  const oembed = await fetchOEmbed(platform, url);
  const og = await fetchOgData(url);

  const title = oembed?.title || og?.["og:title"] || og?.["twitter:title"];
  const author = oembed?.author_name || og?.["og:site_name"];
  const textContent = og?.["og:description"] || og?.["twitter:description"];
  const thumbnailUrl = oembed?.thumbnail_url || og?.["og:image"] || og?.["twitter:image"];

  const rawContent = [title, author, textContent, url].filter(Boolean).join("|");

  return {
    title,
    author,
    textContent,
    thumbnailUrl,
    contentHash: hashContent(rawContent),
    platform,
    sourceUrl: url,
  };
}
