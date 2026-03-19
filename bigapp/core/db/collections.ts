import type { Collection } from "mongodb";
import type { ArchiveItem, CaptureJob, TimeCapsule } from "@/core/types";
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
