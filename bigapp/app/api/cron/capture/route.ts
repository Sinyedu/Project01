import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/core/cron/auth";
import { captureJobs } from "@/core/db";
import { runCapture } from "@/core/services/pipeline";
import type { CaptureJob } from "@/core/types";

export const dynamic = "force-dynamic";

const FREQUENCY_MS: Record<CaptureJob["frequency"], number> = {
  once: 0,
  hourly: 3_600_000,
  daily: 86_400_000,
  weekly: 604_800_000,
};

async function processJob(job: CaptureJob) {
  await runCapture({
    url: job.url,
    platform: job.platform,
    contentType: job.contentType,
    userId: job.userId,
  });

  const col = await captureJobs();
  const now = new Date();

  if (job.frequency === "once") {
    await col.updateOne({ _id: job._id }, { $set: { enabled: false } });
  } else {
    await col.updateOne(
      { _id: job._id },
      {
        $set: {
          lastRunAt: now,
          nextRunAt: new Date(now.getTime() + FREQUENCY_MS[job.frequency]),
          failCount: 0,
        },
      },
    );
  }
}

export async function GET(req: NextRequest) {
  const denied = verifyCron(req);
  if (denied) return denied;

  const col = await captureJobs();
  const due = await col
    .find({ enabled: true, nextRunAt: { $lte: new Date() } })
    .limit(50)
    .toArray();

  let processed = 0;
  let failed = 0;

  for (const job of due) {
    try {
      await processJob(job);
      processed++;
    } catch {
      failed++;
      await col.updateOne({ _id: job._id }, { $inc: { failCount: 1 } });
    }
  }

  return NextResponse.json({ processed, failed });
}
