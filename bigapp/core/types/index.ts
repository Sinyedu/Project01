export { PLATFORMS, isPlatform } from "./platforms";
export type { Platform } from "./platforms";

export { SOURCES, isSource } from "./source";
export type { Source } from "./source";

export type {
  ContentType,
  ArchiveStatus,
  MediaType,
  ArchiveItem,
  ArchivedMedia,
  ContextSnapshot,
  CaptureFrequency,
  CaptureJob,
  CapsuleStatus,
  TimeCapsule,
} from "./archive";

export type {
  ConnectorMode,
  ConnectionStatus,
  SourceConnection,
  SnapshotPhase,
  SnapshotJob,
} from "./connector";

export type {
  RecordKind,
  AccountData,
  PostData,
  MessageData,
  ConversationData,
  CommentData,
  MediaAssetData,
  ContactData,
  ParseResult,
  NormalizedRecord,
} from "./normalized";
