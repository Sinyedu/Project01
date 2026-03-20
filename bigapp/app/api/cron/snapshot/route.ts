import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/core/cron/auth";
import { snapshots } from "@/core/db";

export const dynamic = "force-dynamic";

/**
 * Advances snapshot jobs that are waiting on external actions
 */
export async function GET(req: NextRequest) {
  const denied = verifyCron(req);
  if (denied) return denied;

  const col = await snapshots();
  const pending = await col
    .find({ phase: { $in: ["pending", "requesting", "downloading"] } })
    .limit(50)
    .toArray();

  let advanced = 0;

  for (const job of pending) {
    if (job.mode === "portability_push" && job.phase === "requesting") {
      await col.updateOne(
        { _id: job._id },
        { $set: { phase: "pending", error: "Awaiting portability transfer or manual upload" } },
      );
      advanced++;
    }

    if (job.mode === "api_pull" && job.phase === "pending") {
      await col.updateOne(
        { _id: job._id },
        { $set: { phase: "pending", error: "API pull not yet implemented for this source" } },
      );
      advanced++;
    }
  }

  return NextResponse.json({ checked: pending.length, advanced });
}
