import type { Source } from "@/core/types/source";
import type { ParseResult } from "@/core/types/normalized";

export interface PlatformConnector {
  source: Source;
  modes: string[];
  /**
   * Parses an export from a map of files (path -> buffer).
   * In v2 this will move to a streaming FileProvider.
   */
  parseExport(files: Map<string, Buffer>): Promise<ParseResult[]> | AsyncGenerator<ParseResult> | ParseResult[];
}
