import { NextResponse } from "next/server";
import { JobQueue } from "@/core/jobs/client";
import { processEnrichmentJob } from "@/core/imports/exports/pipeline";
import { processInstagramMemoriesJob, processZipOrganizeJob } from "@/core/jobs/memoryWorker";

export const dynamic = "force-dynamic"; // Ensure this isn't cached

export async function GET() {
  let processedCount = 0;
  const startTime = Date.now();
  const MAX_RUNTIME = 50000; // 50 seconds max to stay under Vercel/Next.js limits

  try {
    while (Date.now() - startTime < MAX_RUNTIME) {
      // Poll for the next job
      let job = await JobQueue.poll("ingest_export");
      if (!job) job = await JobQueue.poll("enrich_ai");
      if (!job) job = await JobQueue.poll("process_instagram_memories");
      if (!job) job = await JobQueue.poll("organize_zip");
      
      if (!job) break;

      console.log(`Processing job ${job._id} (type: ${job.type})`);

      if (job.type === "enrich_ai") {
        await processEnrichmentJob(job);
      } else if (job.type === "process_instagram_memories") {
        await processInstagramMemoriesJob(job);
      } else if (job.type === "organize_zip") {
        await processZipOrganizeJob(job);
      }

      if (job.type !== "process_instagram_memories" && job.type !== "organize_zip") {
        await JobQueue.complete(job._id!.toString());
      }
      
      processedCount++;
    }

    if (processedCount === 0) {
      return NextResponse.json({ status: "idle", message: "No pending jobs found" });
    }

    return NextResponse.json({ 
      status: "success", 
      processedJobs: processedCount,
      completedAt: new Date().toISOString() 
    });
  } catch (err) {
    console.error("Worker error:", err);
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : String(err) }, 
      { status: 500 }
    );
  }
}
