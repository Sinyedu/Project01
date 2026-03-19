import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/core/cron/auth";
import { archives } from "@/core/db";

export const dynamic = "force-dynamic";

const STALE_MS = 7 * 86_400_000; // re-check after 7 days

export async function GET(req: NextRequest) {
  const denied = verifyCron(req);
  if (denied) return denied;

  const col = await archives();
  const cutoff = new Date(Date.now() - STALE_MS);

  const stale = await col
    .find({
      status: "preserved",
      sourceUrl: { $exists: true },
      $or: [
        { lastVerifiedAt: { $exists: false } },
        { lastVerifiedAt: { $lte: cutoff } },
      ],
    })
    .limit(100)
    .toArray();

  let alive = 0;
  let dead = 0;

  for (const item of stale) {
    try {
      const res = await fetch(item.sourceUrl!, { method: "HEAD", signal: AbortSignal.timeout(10_000) });
      const isAlive = res.ok;
      await col.updateOne(
        { _id: item._id },
        { $set: { sourceAlive: isAlive, lastVerifiedAt: new Date() } },
      );
      isAlive ? alive++ : dead++;
    } catch {
      await col.updateOne(
        { _id: item._id },
        { $set: { sourceAlive: false, lastVerifiedAt: new Date() } },
      );
      dead++;
    }
  }

  return NextResponse.json({ checked: stale.length, alive, dead });
}
