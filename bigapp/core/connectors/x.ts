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

  parseExport(files) {
    const results: ParseResult[] = [];

    for (const [path, buf] of files) {
      // Tweets: data/tweets.js
      if (/tweets\.js$/i.test(path)) {
        const entries = parseJsonp(buf);
        for (const entry of entries as Record<string, Record<string, unknown>>[]) {
          const tweet = entry.tweet;
          if (!tweet) continue;
          const mediaEntities =
            ((tweet.extended_entities as Record<string, unknown>)
              ?.media as Record<string, string>[]) ?? [];

          results.push({
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
          });
        }
      }

      // DMs: data/direct-messages.js
      if (/direct-messages\.js$/i.test(path)) {
        const convos = parseJsonp(buf);
        for (const entry of convos as Record<string, Record<string, unknown>>[]) {
          const conv = entry.dmConversation;
          if (!conv) continue;
          const convId = conv.conversationId as string;

          results.push({
            kind: "conversation",
            sourceId: convId,
            data: { title: convId, participants: [] },
            mediaRefs: [],
          });

          for (const msg of (conv.messages as Record<
            string,
            Record<string, unknown>
          >[]) ?? []) {
            const event = msg.messageCreate;
            if (!event) continue;
            results.push({
              kind: "message",
              sourceId: (event.id as string) ?? `x-dm-${results.length}`,
              sourceTimestamp: event.createdAt
                ? new Date(event.createdAt as string)
                : undefined,
              data: {
                conversationId: convId,
                senderName: event.senderId,
                text: (event.text as string) ?? "",
              },
              mediaRefs: [],
            });
          }
        }
      }
    }

    return results;
  },
};
