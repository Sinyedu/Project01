import type { PlatformConnector } from "./types";
import type { ParseResult } from "@/core/types/normalized";

export const telegramConnector: PlatformConnector = {
  source: "telegram",
  modes: ["export_upload", "api_pull"],

  // Parses Telegram Desktop JSON export (result.json)
  parseExport(files) {
    const results: ParseResult[] = [];

    for (const [path, buf] of files) {
      if (!path.endsWith("result.json")) continue;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(buf.toString());
      } catch {
        continue;
      }

      // Profile
      const personal = data.personal_information as Record<string, unknown> | undefined;
      if (personal) {
        results.push({
          kind: "account",
          sourceId: `tg-account-${personal.user_id ?? "self"}`,
          data: {
            username: personal.username,
            displayName: [personal.first_name, personal.last_name]
              .filter(Boolean)
              .join(" "),
            phone: personal.phone_number,
          },
          mediaRefs: [],
        });
      }

      // Chats
      const chats = data.chats as Record<string, unknown> | undefined;
      const list = (chats?.list as Record<string, unknown>[]) ?? [];

      for (const chat of list) {
        const chatName = (chat.name as string) ?? "Unnamed";
        const chatId = `tg-chat-${chat.id ?? chatName}`;

        results.push({
          kind: "conversation",
          sourceId: chatId,
          data: {
            title: chatName,
            participants: [],
            messageCount: (chat.messages as unknown[])?.length,
          },
          mediaRefs: [],
        });

        for (const msg of (chat.messages as Record<string, unknown>[]) ?? []) {
          if (msg.type !== "message") continue;
          const text =
            typeof msg.text === "string"
              ? msg.text
              : Array.isArray(msg.text)
                ? (msg.text as Record<string, unknown>[])
                    .map((t) => (typeof t === "string" ? t : (t.text as string) ?? ""))
                    .join("")
                : "";

          const mediaRef = msg.photo ?? msg.file;

          results.push({
            kind: "message",
            sourceId: String(msg.id),
            sourceTimestamp: msg.date ? new Date(msg.date as string) : undefined,
            data: {
              conversationId: chatId,
              senderName: msg.from,
              text,
              mediaUrls: mediaRef ? [mediaRef as string] : [],
            },
            mediaRefs: mediaRef ? [mediaRef as string] : [],
          });
        }
      }
    }

    return results;
  },
};
