import type { PlatformConnector } from "./types";
import type { ParseResult } from "@/core/types/normalized";

function tryJson(buf: Buffer): unknown[] | null {
  try {
    const parsed = JSON.parse(buf.toString());
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const instagramConnector: PlatformConnector = {
  source: "instagram",
  modes: ["export_upload", "portability_push"],

  parseExport(files) {
    const results: ParseResult[] = [];

    for (const [path, buf] of files) {
      // Posts: your_instagram_activity/content/posts_*.json
      if (/content\/posts_\d*\.json$/i.test(path)) {
        const posts = tryJson(buf);
        if (!posts) continue;
        for (const post of posts as Record<string, unknown>[]) {
          const media = (post.media as Record<string, unknown>[]) ?? [];
          const ts = media[0]?.creation_timestamp;
          results.push({
            kind: "post",
            sourceId: (media[0]?.uri as string) ?? `ig-post-${results.length}`,
            sourceTimestamp: typeof ts === "number" ? new Date(ts * 1000) : undefined,
            data: {
              text: post.title ?? "",
              mediaUrls: media.map((m) => m.uri as string),
            },
            mediaRefs: media.map((m) => m.uri as string).filter(Boolean),
          });
        }
      }

      // Messages: messages/inbox/*/message_*.json
      if (/messages\/inbox\/.*\/message_\d*\.json$/i.test(path)) {
        let chat: Record<string, unknown>;
        try {
          chat = JSON.parse(buf.toString());
        } catch {
          continue;
        }
        const participants = (chat.participants as Record<string, string>[]) ?? [];
        const convId = participants.map((p) => p.name).join(", ");

        results.push({
          kind: "conversation",
          sourceId: `ig-conv-${convId}`,
          data: { title: convId, participants: participants.map((p) => p.name) },
          mediaRefs: [],
        });

        const messages = (chat.messages as Record<string, unknown>[]) ?? [];
        for (const msg of messages) {
          const ts = msg.timestamp_ms as number | undefined;
          results.push({
            kind: "message",
            sourceId: `ig-msg-${ts ?? results.length}`,
            sourceTimestamp: ts ? new Date(ts) : undefined,
            data: {
              conversationId: convId,
              senderName: msg.sender_name,
              text: msg.content ?? "",
              mediaUrls: ((msg.photos as Record<string, string>[]) ?? []).map((p) => p.uri),
            },
            mediaRefs: ((msg.photos as Record<string, string>[]) ?? []).map((p) => p.uri),
          });
        }
      }
    }

    return results;
  },
};
