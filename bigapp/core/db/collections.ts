import type { Collection } from "mongodb";
import type {
  ArchiveItem,
  CaptureJob,
  TimeCapsule,
  SnapshotJob,
} from "@/core/types";
import { getDb } from "./client";
import { Job, JobSchema } from "@/core/schema/job";
import { NormalizedRecord, NormalizedRecordSchema } from "@/core/schema/record";
import { SourceConnection, SourceConnectionSchema } from "@/core/schema/source";
import { RawSnapshot, MediaAsset, NormalizedProfile } from "@/core/schema/ingest";
import { Moment, MomentMembership, AIEnrichment } from "@/core/moments/schema";
import { MemoryBundle, MemoryBundleSchema } from "@/core/schema/memoryBundle";
import { Vault, VaultItem } from "@/core/schema/vault";

// Legacy collections (keep until fully migrated)
export async function archives(): Promise<Collection<ArchiveItem>> {
  return (await getDb()).collection<ArchiveItem>("archives");
}

export async function captureJobs(): Promise<Collection<CaptureJob>> {
  return (await getDb()).collection<CaptureJob>("capture_jobs");
}

export async function timeCapsules(): Promise<Collection<TimeCapsule>> {
  return (await getDb()).collection<TimeCapsule>("time_capsules");
}

export async function snapshots(): Promise<Collection<SnapshotJob>> {
  return (await getDb()).collection<SnapshotJob>("snapshots");
}

// New Zod-backed collections
export async function jobs(): Promise<Collection<Job>> {
  return (await getDb()).collection<Job>("jobs");
}

export async function connections(): Promise<Collection<SourceConnection>> {
  return (await getDb()).collection<SourceConnection>("connections");
}

export async function records(): Promise<Collection<NormalizedRecord>> {
  return (await getDb()).collection<NormalizedRecord>("records");
}

// Ingest pipeline collections
export async function rawSnapshots(): Promise<Collection<RawSnapshot>> {
  return (await getDb()).collection<RawSnapshot>("raw_snapshots");
}

export async function profiles(): Promise<Collection<NormalizedProfile>> {
  return (await getDb()).collection<NormalizedProfile>("profiles");
}

export async function mediaAssets(): Promise<Collection<MediaAsset>> {
  return (await getDb()).collection<MediaAsset>("media_assets");
}

export async function memoryBundles(): Promise<Collection<MemoryBundle>> {
  return (await getDb()).collection<MemoryBundle>("memory_bundles");
}

// Moment Engine collections
export async function moments(): Promise<Collection<Moment>> {
  return (await getDb()).collection<Moment>("moments");
}

export async function momentMemberships(): Promise<Collection<MomentMembership>> {
  return (await getDb()).collection<MomentMembership>("moment_memberships");
}

export async function aiEnrichments(): Promise<Collection<AIEnrichment>> {
  return (await getDb()).collection<AIEnrichment>("ai_enrichments");
}

// Vault collections
export async function vaults(): Promise<Collection<Vault>> {
  return (await getDb()).collection<Vault>("vaults");
}

export async function vaultItems(): Promise<Collection<VaultItem>> {
  return (await getDb()).collection<VaultItem>("vault_items");
}
