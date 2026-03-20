import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { jobs } from "@/core/db/collections";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    console.error("[JobStatus] Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: "Job ID required" }, { status: 400 });

  try {
    const jobCol = await jobs();
    const db = jobCol.databaseName;
    console.log(`[JobStatus] Polling for job ${jobId} in DB: ${db}, user: ${userId}`);

    // Try finding by ObjectId first, then by string if it fails
    let query: any = { userId };
    try {
        query._id = new ObjectId(jobId);
    } catch {
        query._id = jobId;
    }

    const job = await jobCol.findOne(query);

    if (!job) {
      console.warn(`[JobStatus] Job ${jobId} NOT FOUND in collection ${jobCol.collectionName}`);
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    console.log(`[JobStatus] Found job ${jobId}, status: ${job.status}`);
    return NextResponse.json({
      jobId: job._id.toString(),
      status: job.status,
      type: job.type,
      progress: job.status === "processing" ? "Processing..." : job.status,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (err) {
    console.error(`[JobStatus] Error fetching job ${jobId}:`, err);
    return NextResponse.json({ error: "Failed to fetch job status" }, { status: 500 });
  }
}
