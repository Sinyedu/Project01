import { Job } from "@/core/schema/job";
import { filterMediaRecords } from "@/core/imports/processors/mediaFilter";
import { clusterMediaIntoBundles } from "@/core/imports/processors/clustering";
import { autoTitleBundles } from "@/core/imports/processors/titling";
import { JobQueue } from "./client";

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
