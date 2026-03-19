import type { Collection } from "mongodb";
import type {
  ArchiveItem,
  CaptureJob,
  TimeCapsule,
  SourceConnection,
  SnapshotJob,
  NormalizedRecord,
} from "@/core/types";
import { getDb } from "./client";

export async function archives(): Promise<Collection<ArchiveItem>> {
  return (await getDb()).collection<ArchiveItem>("archives");
}

export async function captureJobs(): Promise<Collection<CaptureJob>> {
  return (await getDb()).collection<CaptureJob>("capture_jobs");
}

export async function timeCapsules(): Promise<Collection<TimeCapsule>> {
  return (await getDb()).collection<TimeCapsule>("time_capsules");
}

export async function connections(): Promise<Collection<SourceConnection>> {
  return (await getDb()).collection<SourceConnection>("connections");
}

export async function snapshots(): Promise<Collection<SnapshotJob>> {
  return (await getDb()).collection<SnapshotJob>("snapshots");
}

export async function records(): Promise<Collection<NormalizedRecord>> {
  return (await getDb()).collection<NormalizedRecord>("records");
}
