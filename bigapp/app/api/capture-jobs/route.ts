import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { captureJobs } from "@/core/db";
import { isPlatform, type ContentType, type CaptureFrequency } from "@/core/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const col = await captureJobs();
  const jobs = await col.find({ userId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { url, platform, contentType = "post", frequency = "daily" } = body as {
    url: string;
    platform: string;
    contentType?: ContentType;
    frequency?: CaptureFrequency;
  };

  if (!url || !platform || !isPlatform(platform)) {
    return NextResponse.json({ error: "url and valid platform required" }, { status: 400 });
  }

  const col = await captureJobs();
  const job = {
    userId,
    url,
    platform,
    contentType,
    frequency,
    enabled: true,
    nextRunAt: new Date(),
    failCount: 0,
    createdAt: new Date(),
  };

  const result = await col.insertOne(job);
  return NextResponse.json({ _id: result.insertedId, ...job }, { status: 201 });
}
