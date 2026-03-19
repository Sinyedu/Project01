import type { PlatformConnector } from "./types";
import type { ParseResult } from "@/core/types/normalized";
import { ContactCollector } from "./contacts";

/**
 * WhatsApp exports are plain text files with format:
 *   [MM/DD/YY, HH:MM:SS AM] Sender: message
 *   MM/DD/YYYY, HH:MM AM - Sender: message
 * Both variants are handled.
 */
const LINE_RE =
  /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\]?\s*[-–]?\s*(.+?):\s(.*)$/i;

export const whatsappConnector: PlatformConnector = {
  source: "whatsapp",
  modes: ["export_upload", "local_importer"],

  parseExport(files) {
    const results: ParseResult[] = [];
    const contacts = new ContactCollector("wa");

    for (const [path, buf] of files) {
      if (!path.endsWith(".txt")) continue;

      const lines = buf.toString().split("\n");
      const chatTitle = path.replace(/^.*\//, "").replace(/\.txt$/, "");

      results.push({
        kind: "conversation",
        sourceId: `wa-conv-${chatTitle}`,
        data: { title: chatTitle, participants: [] as string[] },
        mediaRefs: [],
      });

      const participantKeys: string[] = [];
      let idx = 0;

      for (const line of lines) {
        const match = line.match(LINE_RE);
        if (!match) continue;
        const [, datePart, timePart, sender, text] = match;

        const contactKey = contacts.track(sender);
        if (!participantKeys.includes(contactKey)) participantKeys.push(contactKey);

        let ts: Date | undefined;
        try {
          ts = new Date(`${datePart} ${timePart}`);
          if (isNaN(ts.getTime())) ts = undefined;
        } catch {
          ts = undefined;
        }

        const isMediaRef = /\(file attached\)|<Media omitted>/i.test(text);

        results.push({
          kind: "message",
          sourceId: `wa-msg-${chatTitle}-${idx++}`,
          sourceTimestamp: ts,
          data: {
            conversationId: `wa-conv-${chatTitle}`,
            contactKey,
            senderName: sender,
            text: isMediaRef ? "" : text,
            mediaUrls: [],
          },
          mediaRefs: [],
        });
      }

      // Backfill participants with normalized keys
      const conv = results.find((r) => r.sourceId === `wa-conv-${chatTitle}`);
      if (conv) {
        (conv.data as Record<string, unknown>).participants = participantKeys;
      }
    }

    results.push(...contacts.toRecords());
    return results;
  },
};
