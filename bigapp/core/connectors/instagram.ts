import type { PlatformConnector } from "./types";
import type { ParseResult } from "@/core/types/normalized";
import { ContactCollector, decodeMeta, extractFolderIdFromPath, extractFolderHandleFromPath } from "./contacts";

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

  async *parseExport(files: Map<string, Buffer>) {
    const contacts = new ContactCollector("ig");
    let recordCount = 0;

    for (const [path, buf] of files.entries()) {
      // Profile / Account Info
      if (/personal_information\/personal_information\.json$/i.test(path) || /profile\/profile\.json$/i.test(path)) {
        const data = JSON.parse(buf.toString());
        const profile = data.profile_user?.[0] || data.profile_v2?.[0] || data;
        if (profile) {
          yield {
            kind: "account",
            sourceId: `ig-account-${profile.username || "self"}`,
            data: {
              username: profile.username,
              displayName: profile.name || profile.full_name,
              bio: profile.biography || profile.bio,
              email: profile.email,
            },
            mediaRefs: [],
          };
        }
      }

      // Posts
      if (/(content|posts)\/posts_\d*\.json$/i.test(path)) {
        const posts = tryJson(buf);
        if (!posts) continue;
        for (const post of posts as Record<string, unknown>[]) {
          const media = (post.media as Record<string, unknown>[]) ?? [];
          const ts = media[0]?.creation_timestamp;
          const rawTitle = (post.title as string) ?? "";

          recordCount++;
          yield {
            kind: "post",
            sourceId: (media[0]?.uri as string) ?? `ig-post-${recordCount}`,
            sourceTimestamp: typeof ts === "number" ? new Date(ts * 1000) : undefined,
            data: {
              text: decodeMeta(rawTitle),
              mediaUrls: media.map((m) => m.uri as string),
            },
            mediaRefs: media.map((m) => m.uri as string).filter(Boolean),
          };
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

        yield {
          kind: "conversation",
          sourceId: `ig-conv-${folderId ?? convId}`,
          data: {
            title: convTitle,
            participants: participantKeys,
          },
          mediaRefs: [],
        };

        for (const msg of (chat.messages as Record<string, unknown>[]) ?? []) {
          const ts = msg.timestamp_ms as number | undefined;
          const senderRaw = (msg.sender_name as string) ?? "";
          const contactKey = contacts.track(senderRaw);

          recordCount++;
          yield {
            kind: "message",
            sourceId: `ig-msg-${ts ?? recordCount}`,
            sourceTimestamp: ts ? new Date(ts) : undefined,
            data: {
              conversationId: `ig-conv-${folderId ?? convId}`,
              contactKey,
              senderName: decodeMeta(senderRaw),
              text: decodeMeta((msg.content as string) ?? ""),
              mediaUrls: ((msg.photos as Record<string, string>[]) ?? []).map(
                (p) => p.uri,
              ),
            },
            mediaRefs: ((msg.photos as Record<string, string>[]) ?? []).map(
              (p) => p.uri,
            ),
          };
        }
      }
    }

    // Yield collected contacts at the end
    for (const contact of contacts.toRecords()) {
      yield contact;
    }
  },
};
