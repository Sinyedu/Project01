import yauzl from "yauzl";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import type { FileProvider, FileEntry } from "@/core/connectors/types";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export class ZipFileProvider implements FileProvider {
  private zipInput: string | Buffer;

  constructor(input: string | Buffer) {
    this.zipInput = input;
  }

  async *entries(): AsyncIterable<FileEntry> {
    const listZip = await this.openZip(false); 
    const entriesList: yauzl.Entry[] = [];
    
    await new Promise<void>((resolve, reject) => {
      listZip.on("entry", (entry) => {
        if (!entry.fileName.endsWith("/")) {
          entriesList.push(entry);
        }
      });
      listZip.on("end", resolve);
      listZip.on("error", reject);
    });
    listZip.close();

    for (const entry of entriesList) {
      yield {
        path: entry.fileName,
        stream: async () => {
          // Open a fresh handle for EACH stream to allow true parallelism
          const freshZip = await this.openZip(true);
          const freshEntry = await this.findEntry(freshZip, entry.fileName);
          if (!freshEntry) {
            freshZip.close();
            throw new Error(`Entry not found: ${entry.fileName}`);
          }
          return new Promise<Readable>((resolve, reject) => {
            freshZip.openReadStream(freshEntry, (err, stream) => {
              if (err) {
                freshZip.close();
                reject(err);
              } else {
                stream!.on("end", () => freshZip.close());
                stream!.on("close", () => freshZip.close());
                stream!.on("error", () => freshZip.close());
                resolve(stream!);
              }
            });
          });
        },
        buffer: async () => {
          const freshZip = await this.openZip(true);
          const freshEntry = await this.findEntry(freshZip, entry.fileName);
          if (!freshEntry) {
            freshZip.close();
            throw new Error(`Entry not found: ${entry.fileName}`);
          }
          return new Promise<Buffer>((resolve, reject) => {
            freshZip.openReadStream(freshEntry, (err, stream) => {
              if (err) {
                freshZip.close();
                return reject(err);
              }
              const chunks: Buffer[] = [];
              stream!.on("data", (chunk) => chunks.push(chunk));
              stream!.on("end", () => {
                freshZip.close();
                resolve(Buffer.concat(chunks));
              });
              stream!.on("error", (err) => {
                freshZip.close();
                reject(err);
              });
            });
          });
        }
      };
    }
  }

  async get(path: string): Promise<FileEntry | null> {
    const listZip = await this.openZip(true);
    const entry = await this.findEntry(listZip, path);
    if (!entry) {
        listZip.close();
        return null;
    }
    listZip.close();

    return {
        path: entry.fileName,
        stream: async () => {
            const freshZip = await this.openZip(true);
            const freshEntry = await this.findEntry(freshZip, path);
            return new Promise<Readable>((resolve, reject) => {
                freshZip.openReadStream(freshEntry!, (err, stream) => {
                    if (err) { freshZip.close(); reject(err); }
                    else {
                        stream!.on("end", () => freshZip.close());
                        stream!.on("close", () => freshZip.close());
                        stream!.on("error", () => freshZip.close());
                        resolve(stream!);
                    }
                });
            });
        },
        buffer: async () => {
            const freshZip = await this.openZip(true);
            const freshEntry = await this.findEntry(freshZip, path);
            return new Promise<Buffer>((resolve, reject) => {
                freshZip.openReadStream(freshEntry!, (err, stream) => {
                    if (err) { freshZip.close(); return reject(err); }
                    const chunks: Buffer[] = [];
                    stream!.on("data", (chunk) => chunks.push(chunk));
                    stream!.on("end", () => { freshZip.close(); resolve(Buffer.concat(chunks)); });
                    stream!.on("error", (err) => { freshZip.close(); reject(err); });
                });
            });
        }
    };
  }

  private async findEntry(zip: yauzl.ZipFile, name: string): Promise<yauzl.Entry | null> {
    return new Promise((resolve, reject) => {
      zip.on("entry", (entry) => {
        if (entry.fileName === name) resolve(entry);
        else zip.readEntry();
      });
      zip.on("end", () => resolve(null));
      zip.on("error", reject);
      zip.readEntry();
    });
  }

  private openZip(lazy: boolean = false): Promise<yauzl.ZipFile> {
    return new Promise((resolve, reject) => {
      const options = { lazyEntries: lazy };
      if (Buffer.isBuffer(this.zipInput)) {
        yauzl.fromBuffer(this.zipInput, options, (err, zipfile) => {
          if (err) reject(err);
          else resolve(zipfile!);
        });
      } else {
        yauzl.open(this.zipInput, options, (err, zipfile) => {
          if (err) reject(err);
          else resolve(zipfile!);
        });
      }
    });
  }
}

export class FolderFileProvider implements FileProvider {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async *entries(): AsyncIterable<FileEntry> {
    const walk = async function* (dir: string): AsyncIterable<string> {
      const files = await readdir(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const s = await stat(fullPath);
        if (s.isDirectory()) {
          yield* walk(fullPath);
        } else {
          yield fullPath;
        }
      }
    };

    for await (const fullPath of walk(this.rootDir)) {
      const relativePath = path.relative(this.rootDir, fullPath);
      yield {
        path: relativePath,
        stream: async () => fs.createReadStream(fullPath),
        buffer: async () => fs.promises.readFile(fullPath),
      };
    }
  }

  async get(relPath: string): Promise<FileEntry | null> {
    const fullPath = path.join(this.rootDir, relPath);
    try {
      const s = await stat(fullPath);
      if (s.isFile()) {
        return {
          path: relPath,
          stream: async () => fs.createReadStream(fullPath),
          buffer: async () => fs.promises.readFile(fullPath),
        };
      }
    } catch {
      // Ignore
    }
    return null;
  }
}
