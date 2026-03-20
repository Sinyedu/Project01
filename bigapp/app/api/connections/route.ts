import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connections } from "@/core/db";
import { isSource } from "@/core/types";
import { getConnector } from "@/core/connectors/registry";
import type { IngestionMode, SourceConnection } from "@/core/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const col = await connections();
  const list = await col.find({ userId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { source, mode } = body as { source: string; mode?: IngestionMode };

  if (!source || !isSource(source)) {
    return NextResponse.json({ error: "Valid source required" }, { status: 400 });
  }

  const connector = getConnector(source);
  const resolvedMode = mode ?? (connector.modes[0] as IngestionMode);

  const now = new Date();
  const conn: SourceConnection = {
    userId,
    platform: source as any,
    mode: resolvedMode,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const col = await connections();
  const result = await col.insertOne(conn as any);

  return NextResponse.json(
    { _id: result.insertedId, ...conn, supportedModes: connector.modes },
    { status: 201 },
  );
}
