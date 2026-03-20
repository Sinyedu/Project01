import { Job } from "@/core/schema/job";
import { filterMediaRecords } from "@/core/imports/processors/mediaFilter";
import { clusterMediaIntoBundles } from "@/core/imports/processors/clustering";
import { autoTitleBundles } from "@/core/imports/processors/titling";
import { JobQueue } from "./client";
import { runZipOrganizePipeline } from "@/core/imports/zip/pipeline";
import { vaultItems } from "@/core/db/collections";
import { aiService } from "@/core/ai/service";
import { ObjectId } from "mongodb";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

export async function processEnrichVaultItemJob(job: Job) {
  const { vaultItemId } = job.payload as { vaultItemId: string };

  try {
    const col = await vaultItems();
    const item = await col.findOne({ _id: new ObjectId(vaultItemId) });

    if (!item) {
      throw new Error(`Vault item ${vaultItemId} not found`);
    }

    if (item.type !== "image") {
      // For now we skip video enrichment to avoid complex frame extraction
      await JobQueue.complete(job._id!.toString(), { skipped: "video" });
      return;
    }

    let buffer: Buffer;
    let mimeType = "image/jpeg";

    if (item.storagePath.startsWith("http")) {
      const response = await fetch(item.storagePath);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      mimeType = response.headers.get("content-type") || "image/jpeg";
    } else {
      const fullPath = path.join(process.cwd(), "public", item.storagePath);
      buffer = await fs.promises.readFile(fullPath);
      // Simple extension check
      const ext = path.extname(item.storagePath).toLowerCase();
      if (ext === ".png") mimeType = "image/png";
      else if (ext === ".webp") mimeType = "image/webp";
      else if (ext === ".heic") mimeType = "image/heic";
    }

    const { caption, tags } = await aiService.generateCaptionAndTags(buffer, mimeType);
    
    await col.updateOne(
      { _id: new ObjectId(vaultItemId) },
      { 
        $set: { 
          caption, 
          tags, 
          aiGenerated: true,
          updatedAt: new Date() 
        } 
      }
    );

    await JobQueue.complete(job._id!.toString(), { caption, tags });
    console.log(`[Job ${job._id}] Enrich Vault Item ${vaultItemId} completed.`);
  } catch (error) {
    console.error(`[Job ${job._id}] Enrich Vault Item failed:`, error);
    await JobQueue.fail(job._id!.toString(), error instanceof Error ? error.message : String(error));
  }
}

export async function processInstagramMemoriesJob(job: Job) {
  const { userId } = job;
  
  try {
    console.log(`[Job ${job._id}] Starting Step 1: Filtering media records...`);
    const filteredCount = await filterMediaRecords(userId);
    
    console.log(`[Job ${job._id}] Starting Step 3: Clustering media into bundles...`);
    // Step 2 (Date Extraction) is called inside Clustering Step 3
    const bundleCount = await clusterMediaIntoBundles(userId);
    
    console.log(`[Job ${job._id}] Starting Step 4: Auto-titling bundles with AI...`);
    const titledCount = await autoTitleBundles(userId);
    
    await JobQueue.complete(job._id!.toString(), {
      filteredCount,
      bundleCount,
      titledCount
    });
    
    console.log(`[Job ${job._id}] Pipeline completed successfully.`);
  } catch (error) {
    console.error(`[Job ${job._id}] Pipeline failed:`, error);
    await JobQueue.fail(job._id!.toString(), error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function processZipOrganizeJob(job: Job) {
  const { userId } = job;
  const { zipPath, outputMode } = job.payload as { zipPath: string; outputMode: "cloudinary" | "local" };

  try {
    console.log(`[Job ${job._id}] Starting Zip Organize Pipeline...`);
    const result = await runZipOrganizePipeline(job._id!.toString(), {
      userId,
      zipPath,
      outputMode,
    });

    await JobQueue.complete(job._id!.toString(), result);
    console.log(`[Job ${job._id}] Zip Organize Pipeline completed successfully.`);
  } catch (error) {
    console.error(`[Job ${job._id}] Zip Organize Pipeline failed:`, error);
    await JobQueue.fail(job._id!.toString(), error instanceof Error ? error.message : String(error));
    throw error;
  }
}
