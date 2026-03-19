import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { JobQueue } from "@/core/jobs/client";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = await JobQueue.enqueue("process_instagram_memories", {}, userId);

  return NextResponse.json({ jobId });
}
