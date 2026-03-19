import type { PlatformConnector } from "./types";
import type { ParseResult } from "@/core/types/normalized";

export const facebookConnector: PlatformConnector = {
  source: "facebook",
  modes: ["export_upload", "portability_push"],

  parseExport(files) {
    const results: ParseResult[] = [];

    for (const [path, buf] of files) {
      // Posts: your_posts_*.json or your_posts__check_ins__*.json
      if (/your_posts.*\.json$/i.test(path)) {
        let posts: Record<string, unknown>[];
        try {
          posts = JSON.parse(buf.toString());
          if (!Array.isArray(posts)) continue;
        } catch {
          continue;
        }
        for (const post of posts) {
          const data = ((post.data as Record<string, unknown>[]) ?? [])[0];
          const ts = post.timestamp as number | undefined;
          const attachments = (post.attachments as Record<string, unknown>[]) ?? [];
          const mediaUrls: string[] = [];
          for (const att of attachments) {
            for (const d of (att.data as Record<string, unknown>[]) ?? []) {
              const media = d.media as Record<string, unknown> | undefined;
              if (media?.uri) mediaUrls.push(media.uri as string);
            }
          }

          results.push({
            kind: "post",
            sourceId: `fb-post-${ts ?? results.length}`,
            sourceTimestamp: ts ? new Date(ts * 1000) : undefined,
            data: { text: (data?.post as string) ?? "", mediaUrls },
            mediaRefs: mediaUrls,
          });
        }
      }

      // Messages: messages/inbox/*/message_*.json (same format as Instagram)
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
          sourceId: `fb-conv-${convId}`,
          data: { title: convId, participants: participants.map((p) => p.name) },
          mediaRefs: [],
        });

        for (const msg of (chat.messages as Record<string, unknown>[]) ?? []) {
          const ts = msg.timestamp_ms as number | undefined;
          results.push({
            kind: "message",
            sourceId: `fb-msg-${ts ?? results.length}`,
            sourceTimestamp: ts ? new Date(ts) : undefined,
            data: {
              conversationId: convId,
              senderName: msg.sender_name,
              text: msg.content ?? "",
            },
            mediaRefs: [],
          });
        }
      }
    }

    return results;
  },
};
