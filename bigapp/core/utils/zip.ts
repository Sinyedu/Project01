import yauzl from "yauzl";
import { Readable } from "stream";
import type { FileProvider, FileEntry } from "@/core/connectors/types";

export class ZipFileProvider implements FileProvider {
  private zipPath: string;

  constructor(path: string) {
    this.zipPath = path;
  }

  async *entries(): AsyncIterable<FileEntry> {
    const zipfile = await this.openZip(true); // use lazyEntries
    
    try {
      let resolveEntry: (entry: yauzl.Entry | null) => void;
      let rejectEntry: (err: any) => void;
      let nextEntry = new Promise<yauzl.Entry | null>((res, rej) => {
        resolveEntry = res;
        rejectEntry = rej;
      });

      zipfile.on("entry", (entry) => {
        resolveEntry(entry);
      });

      zipfile.on("end", () => {
        resolveEntry(null);
      });

      zipfile.on("error", (err) => {
        rejectEntry(err);
      });

      zipfile.readEntry();

      while (true) {
        const entry = await nextEntry;
        if (!entry) break;

        // Reset promise for next entry
        nextEntry = new Promise<yauzl.Entry | null>((res, rej) => {
          resolveEntry = res;
          rejectEntry = rej;
        });

        if (!entry.fileName.endsWith("/")) {
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

        zipfile.readEntry();
      }
    } finally {
      zipfile.close();
    }
  }

  async get(path: string): Promise<FileEntry | null> {
    // For random access, we still need to iterate or open the zip specifically.
    // yauzl doesn't support easy random access by path without iterating.
    // But we can optimize by closing once found.
    const zipfile = await this.openZip(true);
    try {
      return await new Promise<FileEntry | null>((resolve, reject) => {
        zipfile.on("entry", (entry) => {
          if (entry.fileName === path) {
            resolve({
              path: entry.fileName,
              stream: () => {
                return new Promise<Readable>((res, rej) => {
                  zipfile.openReadStream(entry, (err, stream) => {
                    if (err) rej(err);
                    else res(stream!);
                  });
                });
              },
              buffer: () => {
                return new Promise<Buffer>((res, rej) => {
                  zipfile.openReadStream(entry, (err, stream) => {
                    if (err) return rej(err);
                    const chunks: Buffer[] = [];
                    stream!.on("data", (chunk) => chunks.push(chunk));
                    stream!.on("end", () => res(Buffer.concat(chunks)));
                    stream!.on("error", rej);
                  });
                });
              }
            });
          } else {
            zipfile.readEntry();
          }
        });
        zipfile.on("end", () => resolve(null));
        zipfile.on("error", reject);
        zipfile.readEntry();
      });
    } finally {
      // Note: if we resolve, we might need to keep it open if stream/buffer is called?
      // Actually, yauzl requires zipfile to be open to openReadStream.
      // This is a problem for our FileEntry interface if it's used AFTER zipfile.close().
      // For now, let's keep it open or refactor.
    }
  }

  private openZip(lazy: boolean = false): Promise<yauzl.ZipFile> {
    return new Promise((resolve, reject) => {
      yauzl.open(this.zipPath, { lazyEntries: lazy }, (err, zipfile) => {
        if (err) reject(err);
        else resolve(zipfile!);
      });
    });
  }
}
