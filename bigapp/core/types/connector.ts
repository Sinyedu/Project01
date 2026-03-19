import type { Source } from "./source";

export type ConnectorMode =
  | "api_pull"
  | "portability_push"
  | "export_upload"
  | "local_importer";

export type ConnectionStatus = "active" | "revoked" | "error";

export interface SourceConnection {
  _id?: string;
  userId: string;
  source: Source;
  mode: ConnectorMode;
  displayName?: string;
  credentials?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
  scopes?: string[];
  cursor?: string;
  lastSnapshotAt?: Date;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type SnapshotPhase =
  | "pending"
  | "requesting"
  | "downloading"
  | "parsing"
  | "normalizing"
  | "media"
  | "indexing"
  | "complete"
  | "failed";

export interface SnapshotJob {
  _id?: string;
  userId: string;
  connectionId: string;
  source: Source;
  mode: ConnectorMode;
  phase: SnapshotPhase;
  progress: {
    totalItems?: number;
    processedItems: number;
    mediaQueued: number;
    mediaComplete: number;
  };
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}
