import { createHash } from "crypto";
import { ObjectId } from "mongodb";
import { connections, snapshots, records } from "@/core/db";
import { getConnector } from "@/core/connectors/registry";
import { aiService } from "@/core/ai/service";
import { uploadMedia } from "@/core/services/storage";
import { ZipFileProvider } from "@/core/utils/zip";
import { JobQueue } from "@/core/jobs/client";
import type { SnapshotJob, NormalizedRecord } from "@/core/types";
import type { ParseResult } from "@/core/types/normalized";

function checksum(data: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

/**
 * Official Export Import Pipeline - Phase 1: Upload & Parse
 * Flow: upload -> detect -> unpack -> parse -> normalize -> resolve media (lite) -> store
 */
export async function importOfficialExport(
  connectionId: string,
  userId: string,
  fileName: string,
  fileInput: string | Buffer,
): Promise<SnapshotJob> {
  const connCol = await connections();
  const conn = await connCol.findOne({ _id: new ObjectId(connectionId), userId } as any);
  if (!conn) throw new Error("Import source not found");

  const snapCol = await snapshots();
  const now = new Date();

  const job: SnapshotJob = {
    userId,
    connectionId,
    platform: conn.platform,
    mode: "export_upload" as any,
    phase: "parsing",
    progress: { processedItems: 0, mediaQueued: 0, mediaComplete: 0 },
    startedAt: now,
  };

  const { insertedId } = await snapCol.insertOne(job);
  const jobId = insertedId.toString();

  try {
    const provider = new ZipFileProvider(fileInput);
    const connector = getConnector(conn.platform as any);
    const parsedRaw = connector.parseExport(provider);
    
    let processedCount = 0;
    let mediaComplete = 0;
    let batch: NormalizedRecord[] = [];
    const BATCH_SIZE = 100;

    const parsedIterable = (async function* () {
      if (Symbol.asyncIterator in (parsedRaw as any)) {
        yield* (parsedRaw as AsyncGenerator<ParseResult>);
      } else {
        const results = await (parsedRaw as Promise<ParseResult[]> | ParseResult[]);
        for (const r of results) yield r;
      }
    })();

    await snapCol.updateOne(
      { _id: insertedId },
      { $set: { phase: "processing" } },
    );

    const recCol = await records();

    for await (const p of parsedIterable) {
      processedCount++;
      
      const finalMediaRefs = [...p.mediaRefs];
      // Still process a few media items inline if they are small/limited
      if (p.mediaRefs.length > 0 && mediaComplete < 20) {
        for (let j = 0; j < p.mediaRefs.length; j++) {
          const ref = p.mediaRefs[j];
          const fileEntry = await provider.get(ref);
          if (fileEntry) {
            try {
              const buf = await fileEntry.buffer();
              const archived = await uploadMedia(buf, ref);
              finalMediaRefs[j] = archived.archivedUrl;
            } catch { /* skip failed upload */ }
          }
        }
        mediaComplete++;
      }

      batch.push({
        userId,
        snapshotId: jobId,
        connectionId,
        platform: conn.platform,
        ingestionMode: "export_import",
        kind: p.kind,
        sourceId: p.sourceId,
        sourceTimestamp: p.sourceTimestamp,
        data: {
          ...p.data,
          mediaUrls: finalMediaRefs,
        },
        mediaRefs: finalMediaRefs,
        checksum: checksum(p.data),
        tags: [], // Phase 2
        embedding: undefined, // Phase 2
        createdAt: now,
      });

      if (batch.length >= BATCH_SIZE) {
        try {
          await recCol.insertMany(batch as any, { ordered: false });
        } catch (e: any) {
          if (e.code !== 11000) throw e;
        }
        batch = [];
        await snapCol.updateOne(
          { _id: insertedId },
          { $set: { "progress.processedItems": processedCount, "progress.mediaComplete": mediaComplete } },
        );
      }
    }

    if (batch.length > 0) {
      try {
        await recCol.insertMany(batch as any, { ordered: false });
      } catch (e: any) {
        if (e.code !== 11000) throw e;
      }
    }

    await snapCol.updateOne(
      { _id: insertedId },
      {
        $set: {
          phase: "complete",
          completedAt: new Date(),
          "progress.processedItems": processedCount,
          "progress.mediaComplete": mediaComplete,
        },
      },
    );

    await connCol.updateOne(
      { _id: new ObjectId(connectionId) } as any,
      { $set: { lastSnapshotAt: new Date(), updatedAt: new Date(), status: "completed" } },
    );

    // Queue Phase 2: AI Enrichment
    await JobQueue.enqueue("enrich_ai", { snapshotId: jobId }, userId);

    return { ...job, _id: jobId, phase: "complete" };
  } catch (err) {
    await snapCol.updateOne(
      { _id: insertedId },
      {
        $set: {
          phase: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
          completedAt: new Date(),
        },
      },
    );
    throw err;
  }
}

/**
 * Phase 2: AI Enrichment Background Job
 * Processes records for a snapshot in batches to add tags and embeddings.
 */
export async function processEnrichmentJob(job: any) {
  const { snapshotId } = job.payload;
  const recCol = await records();
  
  console.log(`[AI Enrichment] Starting job for snapshot ${snapshotId}`);

  // Find records in this snapshot that haven't been enriched yet
  const cursor = recCol.find({ 
    snapshotId, 
    $or: [
      { embedding: null },
      { embedding: { $exists: false } }
    ]
  });
  
  let batch: any[] = [];
  const BATCH_SIZE = 10; // Small batches for AI safety

  while (await cursor.hasNext()) {
    const record = await cursor.next();
    if (!record) break;

    batch.push(record);

    if (batch.length >= BATCH_SIZE) {
      await processEnrichmentBatch(batch);
      batch = [];
    }
  }

  // Final batch
  if (batch.length > 0) {
    await processEnrichmentBatch(batch);
  }

  console.log(`[AI Enrichment] Completed job for snapshot ${snapshotId}`);
}

async function processEnrichmentBatch(batch: any[]) {
  const recCol = await records();

  await Promise.all(
    batch.map(async (record) => {
      const text = record.data.text || record.data.title || record.data.body || "";
      if (!text) return;

      try {
        const [enrich, embedding] = await Promise.all([
          aiService.enrichText(String(text)),
          aiService.generateEmbedding(String(text))
        ]);

        await recCol.updateOne(
          { _id: record._id },
          { $set: { tags: enrich.tags, embedding } }
        );
      } catch (e) {
        console.warn(`[AI Enrichment] Failed to process record ${record._id}:`, e);
        // Continue - don't fail the batch
      }
    })
  );
}
