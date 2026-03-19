import { NextResponse } from "next/server";
import { JobQueue } from "@/core/jobs/client";
import { processEnrichmentJob } from "@/core/imports/exports/pipeline";
import { processInstagramMemoriesJob } from "@/core/jobs/memoryWorker";

export const dynamic = "force-dynamic"; // Ensure this isn't cached

export async function GET() {
  try {
    // Poll for the next job (try ingestion first, then enrichment, then instagram)
    let job = await JobQueue.poll("ingest_export");
    
    if (!job) {
      job = await JobQueue.poll("enrich_ai");
    }

    if (!job) {
      job = await JobQueue.poll("process_instagram_memories");
    }
    
    if (!job) {
      return NextResponse.json({ status: "idle", message: "No pending jobs found" });
    }

    console.log(`Processing job ${job._id} (type: ${job.type})`);

    if (job.type === "enrich_ai") {
      await processEnrichmentJob(job);
    } else if (job.type === "process_instagram_memories") {
      await processInstagramMemoriesJob(job);
    } else {
      // Logic for ingest_export would go here if processIngestJob existed
      console.warn(`Unhandled job type: ${job.type}`);
    }

    // Note: JobQueue.complete is called inside processInstagramMemoriesJob for that type,
    // but enrich_ai might still need it here if not handled inside.
    // To be safe and consistent with existing code:
    if (job.type !== "process_instagram_memories") {
      await JobQueue.complete(job._id!.toString());
    }

    return NextResponse.json({ 
      status: "success", 
      jobId: job._id, 
      processedAt: new Date().toISOString() 
    });
  } catch (err) {
    console.error("Worker error:", err);
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : String(err) }, 
      { status: 500 }
    );
  }
}
