import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/core/cron/auth";
import { timeCapsules } from "@/core/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = verifyCron(req);
  if (denied) return denied;

  const col = await timeCapsules();
  const now = new Date();

  const result = await col.updateMany(
    { status: "locked", lockedUntil: { $lte: now } },
    { $set: { status: "unlocked", unlockedAt: now } },
  );

  return NextResponse.json({ unlocked: result.modifiedCount });
}
