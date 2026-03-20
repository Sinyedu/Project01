import type { Platform, IngestionMode } from "./index";

export type ConnectionStatus = "active" | "revoked" | "error" | "completed";

export interface SourceConnection {
  _id?: any;
  userId: string;
  platform: Platform;
  mode: IngestionMode;
  displayName?: string;
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
  | "processing"
  | "normalizing"
  | "media"
  | "indexing"
  | "complete"
  | "failed";

export interface SnapshotJob {
  _id?: any;
  userId: string;
  connectionId: string;
  platform: Platform;
  mode: IngestionMode;
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
