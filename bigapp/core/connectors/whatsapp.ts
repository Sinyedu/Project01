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

  async *parseExport(files) {
    const contacts = new ContactCollector("wa");

    for await (const entry of files.entries()) {
      if (!entry.path.endsWith(".txt")) continue;

      const buf = await entry.buffer();
      const lines = buf.toString().split("\n");
      const chatTitle = entry.path.replace(/^.*\//, "").replace(/\.txt$/, "");

      yield {
        kind: "conversation",
        sourceId: `wa-conv-${chatTitle}`,
        data: { title: chatTitle, participants: [] as string[] },
        mediaRefs: [],
      };

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

        yield {
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
        };
      }
    }

    for (const record of contacts.toRecords()) {
      yield record;
    }
  },
};
