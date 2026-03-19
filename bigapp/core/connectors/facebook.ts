import type { PlatformConnector } from "./types";
import type { ParseResult } from "@/core/types/normalized";
import { ContactCollector, decodeMeta, extractFolderIdFromPath, extractFolderHandleFromPath } from "./contacts";

export const facebookConnector: PlatformConnector = {
  source: "facebook",
  modes: ["export_upload", "portability_push"],

  parseExport(files) {
    const results: ParseResult[] = [];
    const contacts = new ContactCollector("fb");

    // First pass: seed contacts from the friends list so we have a name
    // registry even for people who never appear in messages.
    for (const [path, buf] of files) {
      if (/friends\/friends\.json$/i.test(path)) {
        try {
          const data = JSON.parse(buf.toString());
          const friends: Record<string, unknown>[] =
            data.friends_v2 ?? data.friends ?? (Array.isArray(data) ? data : []);
          for (const f of friends) {
            const name = f.name as string | undefined;
            if (name) contacts.track(name);
          }
        } catch {
          // ignore malformed friends file
        }
      }
    }

    for (const [path, buf] of files) {
      // Posts
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

          const rawText = (data?.post as string) ?? "";

          results.push({
            kind: "post",
            sourceId: `fb-post-${ts ?? results.length}`,
            sourceTimestamp: ts ? new Date(ts * 1000) : undefined,
            data: { text: decodeMeta(rawText), mediaUrls },
            mediaRefs: mediaUrls,
          });
        }
      }

      // Messages
      if (/messages\/inbox\/.*\/message_\d*\.json$/i.test(path)) {
        let chat: Record<string, unknown>;
        try {
          chat = JSON.parse(buf.toString());
        } catch {
          continue;
        }

        const folderId = extractFolderIdFromPath(path);
        const folderHandle = extractFolderHandleFromPath(path);

        const participants = (chat.participants as Record<string, string>[]) ?? [];
        const participantKeys = participants.map((p) => {
          const isDm = participants.length === 2;
          const pid = isDm ? folderId : undefined;
          const handle = isDm ? folderHandle : undefined;
          return contacts.track(p.name, pid, handle);
        });

        const convId = participantKeys.join("+");
        const convTitle = participants
          .map((p) => decodeMeta(p.name))
          .join(", ");

        results.push({
          kind: "conversation",
          sourceId: `fb-conv-${folderId ?? convId}`,
          data: {
            title: convTitle,
            participants: participantKeys,
          },
          mediaRefs: [],
        });

        for (const msg of (chat.messages as Record<string, unknown>[]) ?? []) {
          const ts = msg.timestamp_ms as number | undefined;
          const senderRaw = (msg.sender_name as string) ?? "";
          const contactKey = contacts.track(senderRaw);

          results.push({
            kind: "message",
            sourceId: `fb-msg-${ts ?? results.length}`,
            sourceTimestamp: ts ? new Date(ts) : undefined,
            data: {
              conversationId: `fb-conv-${folderId ?? convId}`,
              contactKey,
              senderName: decodeMeta(senderRaw),
              text: decodeMeta((msg.content as string) ?? ""),
              mediaUrls: [],
            },
            mediaRefs: [],
          });
        }
      }
    }

    results.push(...contacts.toRecords());
    return results;
  },
};
