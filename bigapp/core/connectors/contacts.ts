import type { ParseResult } from "@/core/types/normalized";

/**
 * Meta exports (Facebook, Instagram) encode strings as Latin-1 bytes
 * stored in a UTF-8 JSON file. This reverses the damage:
 *   "JosÃ©" → "José"
 */
export function decodeMeta(str: string): string {
  try {
    const bytes = Buffer.from(str, "latin1");
    const decoded = bytes.toString("utf8");
    // Only accept the decode if it produced valid UTF-8 and changed something
    if (decoded !== str && !decoded.includes("\ufffd")) return decoded;
  } catch {
    // fall through
  }
  return str;
}

/**
 * Produces a stable lowercase key from a display name.
 *   "  José García  " → "jose-garcia"
 */
export function normalizeKey(name: string): string {
  return decodeMeta(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip diacritics for matching
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Tries to extract a platform numeric ID from a Meta inbox folder name.
 *   "messages/inbox/JohnDoe_12345678/message_1.json" → "12345678"
 *   "messages/inbox/JohnDoe/message_1.json"          → undefined
 */
export function extractFolderIdFromPath(path: string): string | undefined {
  const match = path.match(/inbox\/[^/]*?_(\d{5,})\//);
  return match?.[1];
}

/**
 * Extracts the human-readable slug from a Meta inbox folder name,
 * stripping the trailing numeric ID if present. Useful as a handle hint
 * for matching contacts across platforms when no numeric ID exists.
 *   "messages/inbox/JohnDoe_12345678/message_1.json" → "JohnDoe"
 *   "messages/inbox/JaneDoe/message_1.json"           → "JaneDoe"
 */
export function extractFolderHandleFromPath(path: string): string | undefined {
  const match = path.match(/inbox\/([A-Za-z][^/]*?)(?:_\d{5,})?\//);
  return match?.[1];
}

/**
 * Tracks unique contacts seen during a parse pass and emits
 * deduplicated contact records at the end.
 */
export class ContactCollector {
  private contacts = new Map<string, {
    name: string;
    platformId?: string;
    handle?: string;
    source: string;
    nameVariants: Set<string>;
  }>();

  constructor(private sourcePrefix: string) {}

  /**
   * Register a name. Returns the normalizedKey for referencing in messages.
   * If a platformId is available (e.g. from folder path), attach it.
   * An optional handle (e.g. folder slug, username) is stored as an
   * additional cross-platform matching signal.
   */
  track(rawName: string, platformId?: string, handle?: string): string {
    const name = decodeMeta(rawName);
    const key = normalizeKey(rawName);
    if (!key) return "";

    const existing = this.contacts.get(key);
    if (!existing) {
      this.contacts.set(key, {
        name,
        platformId,
        handle,
        source: this.sourcePrefix,
        nameVariants: new Set([name]),
      });
    } else {
      if (platformId && !existing.platformId) existing.platformId = platformId;
      if (handle && !existing.handle) existing.handle = handle;
      existing.nameVariants.add(name);
    }

    return key;
  }

  /** Emit a contact ParseResult for every unique person seen. */
  toRecords(): ParseResult[] {
    const results: ParseResult[] = [];
    for (const [key, { name, platformId, handle, nameVariants }] of this.contacts) {
      results.push({
        kind: "contact",
        sourceId: `${this.sourcePrefix}-contact-${platformId ?? key}`,
        data: {
          name,
          normalizedKey: key,
          platformId,
          handle,
          nameVariants: nameVariants.size > 1 ? [...nameVariants] : undefined,
        },
        mediaRefs: [],
      });
    }
    return results;
  }
}
