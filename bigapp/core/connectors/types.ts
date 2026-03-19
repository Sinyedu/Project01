import type { Source } from "@/core/types/source";
import type { ConnectorMode } from "@/core/types/connector";
import type { ParseResult } from "@/core/types/normalized";
import type { Readable } from "stream";

export interface FileEntry {
  path: string;
  stream: () => Promise<Readable>;
  buffer: () => Promise<Buffer>;
}

export interface FileProvider {
  entries(): AsyncIterable<FileEntry>;
  get(path: string): Promise<FileEntry | null>;
}

export interface PlatformConnector {
  source: Source;
  modes: ConnectorMode[];
  /**
   * Parses an export from a file provider (e.g. ZIP stream).
   * Yields results as they are found to keep memory usage low.
   */
  parseExport(files: FileProvider): AsyncGenerator<ParseResult>;
}
