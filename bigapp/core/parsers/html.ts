import * as cheerio from "cheerio";

export interface ParsedProfile {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  localeText?: string;
  extractedText?: string;
}

export interface MediaCandidate {
  sourceUrl: string;
  mediaType: "image" | "video" | "unknown";
  discoveredFrom: string;
  width?: number;
  height?: number;
  alt?: string;
  mimeType?: string;
}

export interface ParseResult {
  profile: ParsedProfile;
  mediaCandidates: MediaCandidate[];
}

export function parseHtml(html: string, baseUrl: string): ParseResult {
  const $ = cheerio.load(html);
  
  // Clean up
  $("script, style, noscript, iframe").remove();
  const extractedText = $("body").text().replace(/\s+/g, " ").trim();

  const profile: ParsedProfile = {
    title: $('meta[property="og:title"]').attr("content") || $("title").text().trim(),
    description: $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content")?.trim(),
    canonicalUrl: $('link[rel="canonical"]').attr("href"),
    localeText: $('meta[property="og:locale"]').attr("content") || $("html").attr("lang"),
    extractedText,
  };

  const mediaCandidates: MediaCandidate[] = [];

  const addCandidate = (url: string | undefined, type: "image" | "video", from: string, opts?: any) => {
    if (!url) return;
    let absoluteUrl = url;
    try {
      absoluteUrl = new URL(url, baseUrl).href;
    } catch {
      return;
    }
    mediaCandidates.push({
      sourceUrl: absoluteUrl,
      mediaType: type,
      discoveredFrom: from,
      ...opts,
    });
  };

  // OG tags
  addCandidate($('meta[property="og:image"]').attr("content"), "image", "og:image");
  addCandidate($('meta[property="og:video"]').attr("content"), "video", "og:video");

  // Twitter tags
  addCandidate($('meta[name="twitter:image"]').attr("content"), "image", "twitter:image");
  addCandidate($('meta[name="twitter:player"]').attr("content"), "video", "twitter:player");

  // Images
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    const width = parseInt($(el).attr("width") || "0", 10);
    const height = parseInt($(el).attr("height") || "0", 10);
    const alt = $(el).attr("alt");
    if (src && !src.startsWith("data:")) {
      addCandidate(src, "image", "img", { width: width || undefined, height: height || undefined, alt });
    }
  });

  // Videos
  $("video").each((_, el) => {
    const src = $(el).attr("src");
    if (src) addCandidate(src, "video", "video");
  });
  $("source").each((_, el) => {
    const src = $(el).attr("src");
    const type = $(el).attr("type");
    if (src && type?.startsWith("video/")) {
      addCandidate(src, "video", "source", { mimeType: type });
    }
  });

  // JSON-LD (basic)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      if (data.image) {
        const imgUrl = typeof data.image === "string" ? data.image : data.image.url;
        addCandidate(imgUrl, "image", "json-ld");
      }
    } catch {
      // ignore
    }
  });

  // Favicon (low priority)
  addCandidate($('link[rel="icon"]').attr("href") || $('link[rel="shortcut icon"]').attr("href"), "image", "favicon");

  return { profile, mediaCandidates };
}
