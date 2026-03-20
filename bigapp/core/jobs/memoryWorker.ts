import { Job } from "@/core/schema/job";
import { filterMediaRecords } from "@/core/imports/processors/mediaFilter";
import { clusterMediaIntoBundles } from "@/core/imports/processors/clustering";
import { autoTitleBundles } from "@/core/imports/processors/titling";
import { JobQueue } from "./client";
import { runZipOrganizePipeline } from "@/core/imports/zip/pipeline";

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
