import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { jobs } from "@/core/db/collections";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { userId } = await auth();
  const { jobId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobCol = await jobs();
  const job = await jobCol.findOne({
    _id: new ObjectId(jobId),
    userId,
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    type: job.type,
    result: job.result,
    error: job.error,
  });
}
