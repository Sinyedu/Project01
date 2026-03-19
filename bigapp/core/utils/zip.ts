import yauzl from "yauzl";
import { Readable } from "stream";
import type { FileProvider, FileEntry } from "@/core/connectors/types";

export class ZipFileProvider implements FileProvider {
  private zipPath: string;

  constructor(path: string) {
    this.zipPath = path;
  }

  async *entries(): AsyncIterable<FileEntry> {
    const zipfile = await this.openZip();
    
    // We need to act as an async iterator.
    // yauzl emits 'entry' events. We can push them to a queue or use a signal.
    // However, since we want to process sequentially, we can pause the read stream?
    // Actually, yauzl supports lazy reading.
    
    // Simpler approach: Promisify the entry iteration manually.
    
    // But for now, let's just use a simple event-based wrapper that yields one by one.
    // This is tricky with yauzl's callback style.
    
    // Alternative: Read all entry *metadata* first (fast), then let the user read content on demand.
    
    const entries: yauzl.Entry[] = [];
    
    await new Promise<void>((resolve, reject) => {
      zipfile.on("entry", (entry) => entries.push(entry));
      zipfile.on("end", () => resolve());
      zipfile.on("error", reject);
    });

    for (const entry of entries) {
      if (entry.fileName.endsWith("/")) continue; // Skip directories
      
      yield {
        path: entry.fileName,
        stream: () => {
          return new Promise<Readable>((resolve, reject) => {
             zipfile.openReadStream(entry, (err, stream) => {
               if (err) reject(err);
               else resolve(stream!);
             });
          });
        },
        buffer: () => {
          return new Promise<Buffer>((resolve, reject) => {
            zipfile.openReadStream(entry, (err, stream) => {
              if (err) return reject(err);
              const chunks: Buffer[] = [];
              stream!.on("data", (chunk) => chunks.push(chunk));
              stream!.on("end", () => resolve(Buffer.concat(chunks)));
              stream!.on("error", reject);
            });
          });
        }
      };
    }
  }

  // Not efficient for random access in this simple impl
  async get(path: string): Promise<FileEntry | null> {
    for await (const entry of this.entries()) {
      if (entry.path === path) return entry;
    }
    return null;
  }

  private openZip(): Promise<yauzl.ZipFile> {
    return new Promise((resolve, reject) => {
      yauzl.open(this.zipPath, { lazyEntries: false }, (err, zipfile) => {
        if (err) reject(err);
        else resolve(zipfile!);
      });
    });
  }
}
