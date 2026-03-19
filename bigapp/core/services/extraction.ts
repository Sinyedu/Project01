import { createHash } from "crypto";
import AdmZip from "adm-zip";
import { connections, snapshots, records } from "@/core/db";
import { getConnector } from "@/core/connectors/registry";
import { aiService } from "@/core/ai/service";
import type { SnapshotJob, NormalizedRecord } from "@/core/types";

function isZip(buf: Buffer): boolean {
  return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;
}

function extractFiles(buf: Buffer, fileName: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>();

  if (isZip(buf)) {
    const zip = new AdmZip(buf);
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      files.set(entry.entryName, entry.getData());
    }
  } else {
    files.set(fileName, buf);
  }

  return files;
}

function checksum(data: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

/**
 * Full extraction pipeline for an uploaded export file.
 *
 * connect → snapshot → extract → parse → normalize → store → done
 */
export async function processUpload(
  connectionId: string,
  userId: string,
  fileName: string,
  fileBuf: Buffer,
): Promise<SnapshotJob> {
  const connCol = await connections();
  const conn = await connCol.findOne({ _id: connectionId, userId } as never);
  if (!conn) throw new Error("Connection not found");

  const snapCol = await snapshots();
  const now = new Date();

  const job: SnapshotJob = {
    userId,
    connectionId,
    source: conn.source,
    mode: conn.mode,
    phase: "parsing",
    progress: { processedItems: 0, mediaQueued: 0, mediaComplete: 0 },
    startedAt: now,
  };

  const { insertedId } = await snapCol.insertOne(job);
  const jobId = insertedId.toString();

  try {
    // Extract files from ZIP or treat as single file
    const files = extractFiles(fileBuf, fileName);

    // Get the right connector and parse
    const connector = getConnector(conn.source);
    const parsed = connector.parseExport(files);

    await snapCol.updateOne(
      { _id: insertedId },
      { $set: { phase: "normalizing", "progress.totalItems": parsed.length } },
    );

    // Build full normalized records with AI enrichment
    // Limit AI processing to first 50 items for speed/cost safety in this turn
    const normalized: NormalizedRecord[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      const textForAI = p.data.text || p.data.title || p.data.body || "";
      
      let tags: string[] = [];
      let embedding: number[] | undefined;

      if (textForAI && i < 50) {
        const [enrich, embed] = await Promise.all([
          aiService.enrichText(String(textForAI)),
          aiService.generateEmbedding(String(textForAI))
        ]);
        tags = enrich.tags;
        embedding = embed;
      }

      normalized.push({
        userId,
        snapshotId: jobId,
        connectionId,
        source: conn.source,
        kind: p.kind,
        sourceId: p.sourceId,
        sourceTimestamp: p.sourceTimestamp,
        data: p.data,
        mediaRefs: p.mediaRefs,
        checksum: checksum(p.data),
        tags,
        embedding,
        importMethod: conn.mode,
        createdAt: now,
      });
    }

    // Bulk insert (skip duplicates via ordered: false)
    if (normalized.length > 0) {
      const recCol = await records();
      try {
        await recCol.insertMany(normalized, { ordered: false });
      } catch (e: unknown) {
        // Duplicate key errors (code 11000) are expected for re-imports
        const bulkErr = e as { code?: number };
        if (bulkErr.code !== 11000) throw e;
      }
    }

    const mediaCount = parsed.reduce((n, p) => n + p.mediaRefs.length, 0);

    await snapCol.updateOne(
      { _id: insertedId },
      {
        $set: {
          phase: "complete",
          completedAt: new Date(),
          "progress.processedItems": parsed.length,
          "progress.mediaQueued": mediaCount,
        },
      },
    );

    await connCol.updateOne(
      { _id: connectionId } as never,
      { $set: { lastSnapshotAt: new Date(), updatedAt: new Date() } },
    );

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
