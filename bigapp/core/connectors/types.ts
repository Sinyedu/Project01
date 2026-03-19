import type { Source } from "@/core/types/source";
import type { ConnectorMode } from "@/core/types/connector";
import type { ParseResult } from "@/core/types/normalized";

export interface PlatformConnector {
  source: Source;
  modes: ConnectorMode[];
  parseExport(files: Map<string, Buffer>): ParseResult[];
}
