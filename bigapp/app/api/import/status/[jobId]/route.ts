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
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: "Job ID required" }, { status: 400 });

  try {
    const jobCol = await jobs();
    const job = await jobCol.findOne({
      _id: new ObjectId(jobId),
      userId,
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

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
