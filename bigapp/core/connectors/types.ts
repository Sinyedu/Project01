import type { Readable } from "stream";
import type { Source } from "@/core/types/source";
import type { ParseResult } from "@/core/types/normalized";

export interface FileEntry {
  path: string;
  stream(): Promise<Readable>;
  buffer(): Promise<Buffer>;
}

export interface FileProvider {
  entries(): AsyncIterable<FileEntry>;
  get(path: string): Promise<FileEntry | null>;
}

export interface PlatformConnector {
  source: Source;
  modes: string[];
  /**
   * Parses an export from a FileProvider.
   */
  parseExport(files: FileProvider): Promise<ParseResult[]> | AsyncGenerator<ParseResult> | ParseResult[];
}
