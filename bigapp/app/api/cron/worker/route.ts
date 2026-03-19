import { NextResponse } from "next/server";
import { JobQueue } from "@/core/jobs/client";
import { processIngestJob } from "@/core/ingest/pipeline";

export const dynamic = "force-dynamic"; // Ensure this isn't cached

export async function GET() {
  try {
    // Poll for an ingestion job
    const job = await JobQueue.poll("ingest_export");
    
    if (!job) {
      return NextResponse.json({ status: "idle", message: "No pending jobs found" });
    }

    console.log(`Processing job ${job._id} (type: ${job.type})`);

    // In a real production environment with time limits (e.g. Vercel),
    // we would offload this to a separate long-running service or break it into chunks.
    // Here, we assume the environment allows enough time or the job is small enough.
    await processIngestJob(job);

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
