import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { snapshots } from "@/core/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: connectionId } = await params;
  const col = await snapshots();
  const list = await col
    .find({ connectionId, userId })
    .sort({ startedAt: -1 })
    .toArray();

  return NextResponse.json(list);
}
