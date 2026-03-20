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

import { getLocalMediaRoot, getPublicMediaBaseUrl } from "@/core/config/storage";

export async function processEnrichVaultItemJob(job: Job) {
  const { vaultItemId } = job.payload as { vaultItemId: string };

  try {
    if (!vaultItemId) {
      await JobQueue.complete(job._id!.toString(), { status: "skipped", reason: "missing_id" });
      return;
    }
    const col = await vaultItems();
    
    // Purge very old jobs from this user to keep queue healthy
    const isVeryStale = (Date.now() - new Date(job.createdAt).getTime()) > 3600000; // 1 hour
    if (isVeryStale) {
        await JobQueue.complete(job._id!.toString(), { status: "skipped", reason: "expired" });
        return;
    }

    // Add a small retry loop with delay to account for eventual consistency
    let item = null;
    const maxAttempts = 3;
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            item = await col.findOne({ _id: new ObjectId(vaultItemId) });
        } catch {
            item = await col.findOne({ _id: vaultItemId } as any);
        }
        
        if (item) break;
        if (i < maxAttempts - 1) await new Promise(resolve => setTimeout(resolve, 1500));
    }

    if (!item) {
      await JobQueue.complete(job._id!.toString(), { status: "skipped", reason: "item_not_found" });
      return;
    }

    console.log(`[Job ${job._id}] Enriching: ${item.originalFilename}`);

    if (item.type !== "image") {
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
      // Local path - extract from storagePath which looks like /api/media/vault/userId/year/month/file
      const relativePath = item.storagePath.includes("/vault/") 
          ? item.storagePath.split(`${getPublicMediaBaseUrl()}/`)[1] || item.storagePath
          : item.storagePath;
      const fullPath = path.join(getLocalMediaRoot(), relativePath);
      
      if (!fs.existsSync(fullPath)) {
        console.error(`[Job ${job._id}] File not found at ${fullPath}`);
        throw new Error(`File not found: ${fullPath}`);
      }
      
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
  const { zipPath, outputMode } = job.payload as { zipPath: string; outputMode: "cloudinary" | "local" | "staging" };

  try {
    console.log(`[Job ${job._id}] Starting Zip Organize Pipeline with mode: ${outputMode}`);
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
