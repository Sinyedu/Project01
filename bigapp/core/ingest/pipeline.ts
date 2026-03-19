import { JobQueue } from "@/core/jobs/client";
import { connections, records } from "@/core/db/collections";
import { instagramConnector } from "@/core/connectors/instagram";
import { ZipFileProvider } from "@/core/utils/zip";
import { ObjectId } from "mongodb";
import { createHash } from "crypto";
import type { Job } from "@/core/schema/job";
import type { NormalizedRecord } from "@/core/schema/record";
import type { PlatformConnector } from "@/core/connectors/types";

const CONNECTORS: Record<string, PlatformConnector> = {
  instagram: instagramConnector,
};

export async function processIngestJob(job: Job) {
  const { connectionId, filePath } = job.payload as { connectionId: string; filePath: string };
  
  if (!connectionId || !filePath) {
    throw new Error("Missing connectionId or filePath in job payload");
  }

  const connection = await (await connections()).findOne({ _id: new ObjectId(connectionId) });
  if (!connection) {
    throw new Error(`Connection not found: ${connectionId}`);
  }

  const connector = CONNECTORS[connection.platform];
  if (!connector) {
    throw new Error(`No connector found for platform: ${connection.platform}`);
  }

  const provider = new ZipFileProvider(filePath);
  const recordCol = await records();
  
  let count = 0;
  let batch: NormalizedRecord[] = [];
  const BATCH_SIZE = 100;

  try {
    for await (const result of connector.parseExport(provider)) {
      // Convert ParseResult to NormalizedRecord
      const record: NormalizedRecord = {
        userId: job.userId,
        connectionId,
        platform: connection.platform,
        kind: result.kind,
        sourceId: result.sourceId,
        sourceTimestamp: result.sourceTimestamp,
        data: result.data,
        mediaRefs: result.mediaRefs,
        // Checksum for deduplication: hash of sourceId + platform
        checksum: createHash("sha256").update(`${connection.platform}:${result.sourceId}`).digest("hex"),
        tags: [],
        createdAt: new Date(),
      };

      batch.push(record);
      count++;

      if (batch.length >= BATCH_SIZE) {
        await saveBatch(recordCol, batch);
        batch = [];
        // Update job progress (optional, if we add progress field to Job)
      }
    }

    if (batch.length > 0) {
      await saveBatch(recordCol, batch);
    }

    await JobQueue.complete(job._id!, { recordCount: count });
  } catch (err) {
    console.error("Ingestion failed", err);
    await JobQueue.fail(job._id!, err instanceof Error ? err.message : String(err));
  }
}

async function saveBatch(col: any, batch: NormalizedRecord[]) {
  if (batch.length === 0) return;
  
  // Bulk write with upsert to prevent duplicates
  const ops = batch.map((doc) => ({
    updateOne: {
      filter: { checksum: doc.checksum, userId: doc.userId },
      update: { $set: doc },
      upsert: true,
    },
  }));

  await col.bulkWrite(ops);
}
