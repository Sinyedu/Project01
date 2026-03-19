import { createHash } from "crypto";
import AdmZip from "adm-zip";
import { connections, snapshots, records } from "@/core/db";
import { getConnector } from "@/core/connectors/registry";
import { aiService } from "@/core/ai/service";
import { uploadMedia } from "@/core/services/storage";
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
 * Official Export Import Pipeline
 * Flow: upload -> detect -> unpack -> parse -> normalize -> resolve media -> archive
 */
export async function importOfficialExport(
  connectionId: string,
  userId: string,
  fileName: string,
  fileBuf: Buffer,
): Promise<SnapshotJob> {
  const connCol = await connections();
  const conn = await connCol.findOne({ _id: connectionId, userId } as any);
  if (!conn) throw new Error("Import source not found");

  const snapCol = await snapshots();
  const now = new Date();

  const job: SnapshotJob = {
    userId,
    connectionId,
    source: conn.platform,
    mode: "export_upload" as any,
    phase: "parsing",
    progress: { processedItems: 0, mediaQueued: 0, mediaComplete: 0 },
    startedAt: now,
  };

  const { insertedId } = await snapCol.insertOne(job);
  const jobId = insertedId.toString();

  try {
    const files = extractFiles(fileBuf, fileName);
    const connector = getConnector(conn.platform as any);
    const parsedRaw = connector.parseExport(files);
    
    let parsed: ParseResult[] = [];
    if (Array.isArray(parsedRaw)) {
      parsed = parsedRaw;
    } else if (Symbol.asyncIterator in (parsedRaw as any)) {
      for await (const p of (parsedRaw as AsyncGenerator<ParseResult>)) {
        parsed.push(p);
      }
    } else if (parsedRaw instanceof Promise) {
      parsed = await parsedRaw;
    }

    await snapCol.updateOne(
      { _id: insertedId },
      { $set: { phase: "normalizing", "progress.totalItems": parsed.length } },
    );

    const normalized: NormalizedRecord[] = [];
    let mediaComplete = 0;

    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      const textForAI = p.data.text || p.data.title || p.data.body || "";
      
      let tags: string[] = [];
      let embedding: number[] | undefined;

      if (textForAI && i < 50) {
        try {
          const [enrich, embed] = await Promise.all([
            aiService.enrichText(String(textForAI)),
            aiService.generateEmbedding(String(textForAI))
          ]);
          tags = enrich.tags;
          embedding = embed;
        } catch { /* AI enrichment is optional */ }
      }

      const finalMediaRefs = [...p.mediaRefs];
      if (p.mediaRefs.length > 0 && mediaComplete < 20) {
        for (let j = 0; j < p.mediaRefs.length; j++) {
          const ref = p.mediaRefs[j];
          const buf = files.get(ref);
          if (buf) {
            try {
              const archived = await uploadMedia(buf, ref);
              finalMediaRefs[j] = archived.archivedUrl;
            } catch { /* skip failed upload */ }
          }
        }
        mediaComplete++;
      }

      normalized.push({
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
        tags,
        embedding,
        createdAt: now,
      });
    }

    if (normalized.length > 0) {
      const recCol = await records();
      try {
        await recCol.insertMany(normalized, { ordered: false });
      } catch (e: any) {
        if (e.code !== 11000) throw e;
      }
    }

    const mediaCount = parsed.reduce((n: number, p: any) => n + p.mediaRefs.length, 0);

    await snapCol.updateOne(
      { _id: insertedId },
      {
        $set: {
          phase: "complete",
          completedAt: new Date(),
          "progress.processedItems": parsed.length,
          "progress.mediaQueued": mediaCount,
          "progress.mediaComplete": mediaComplete,
        },
      },
    );

    await connCol.updateOne(
      { _id: connectionId } as any,
      { $set: { lastSnapshotAt: new Date(), updatedAt: new Date(), status: "completed" } },
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
