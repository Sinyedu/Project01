import type { PlatformConnector } from "./types";
import type { ParseResult } from "@/core/types/normalized";

/**
 * X/Twitter archive uses JSONP: `window.YTD.tweet.part0 = [...]`
 * Strip the assignment prefix to get valid JSON.
 */
function parseJsonp(buf: Buffer): unknown[] {
  const raw = buf.toString().replace(/^window\.YTD\.\w+\.part\d+\s*=\s*/, "");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const xConnector: PlatformConnector = {
  source: "x",
  modes: ["export_upload", "api_pull"],

  async *parseExport(files) {
    let recordCount = 0;

    for await (const entry of files.entries()) {
      const path = entry.path;
      
      // Tweets: data/tweets.js
      if (/tweets\.js$/i.test(path)) {
        const buf = await entry.buffer();
        const entries = parseJsonp(buf);
        for (const entryObj of entries as Record<string, Record<string, unknown>>[]) {
          const tweet = entryObj.tweet;
          if (!tweet) continue;
          const mediaEntities =
            ((tweet.extended_entities as Record<string, unknown>)
              ?.media as Record<string, string>[]) ?? [];

          yield {
            kind: "post",
            sourceId: tweet.id_str as string,
            sourceTimestamp: tweet.created_at
              ? new Date(tweet.created_at as string)
              : undefined,
            data: {
              text: tweet.full_text ?? tweet.text ?? "",
              mediaUrls: mediaEntities.map((m) => m.media_url_https),
              likes: tweet.favorite_count,
              shares: tweet.retweet_count,
              replyTo: tweet.in_reply_to_status_id_str,
            },
            mediaRefs: mediaEntities
              .map((m) => m.media_url_https)
              .filter(Boolean),
          };
        }
      }

      // DMs: data/direct-messages.js
      if (/direct-messages\.js$/i.test(path)) {
        const buf = await entry.buffer();
        const convos = parseJsonp(buf);
        for (const convEntry of convos as Record<string, Record<string, unknown>>[]) {
          const conv = convEntry.dmConversation;
          if (!conv) continue;
          const convId = conv.conversationId as string;

          yield {
            kind: "conversation",
            sourceId: convId,
            data: { title: convId, participants: [] },
            mediaRefs: [],
          };

          for (const msg of (conv.messages as Record<
            string,
            Record<string, unknown>
          >[]) ?? []) {
            const event = msg.messageCreate;
            if (!event) continue;
            
            recordCount++;
            yield {
              kind: "message",
              sourceId: (event.id as string) ?? `x-dm-${recordCount}`,
              sourceTimestamp: event.createdAt
                ? new Date(event.createdAt as string)
                : undefined,
              data: {
                conversationId: convId,
                senderName: event.senderId,
                text: (event.text as string) ?? "",
              },
              mediaRefs: [],
            };
          }
        }
      }
    }
  },
};
