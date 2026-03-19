import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { archives, records } from "@/core/db";
import { runCapture } from "@/core/services/pipeline";
import { isPlatform, type ContentType } from "@/core/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch from both legacy archives and new records collections
  const [archiveCol, recordCol] = await Promise.all([archives(), records()]);
  
  const [archiveItems, recordItems] = await Promise.all([
    archiveCol.find({ userId }).sort({ createdAt: -1 }).limit(50).toArray(),
    recordCol.find({ userId }).sort({ sourceTimestamp: -1 }).limit(50).toArray(),
  ]);

  // Combine and normalize for dashboard display
  const combined = [...archiveItems, ...recordItems]
    .sort((a, b) => {
      const dateA = new Date(a.sourceTimestamp || a.createdAt || 0).getTime();
      const dateB = new Date(b.sourceTimestamp || b.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 50);

  return NextResponse.json(combined);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { url, platform, contentType = "post", tags } = body as {
    url: string;
    platform: string;
    contentType?: ContentType;
    tags?: string[];
  };

  if (!url || !platform || !isPlatform(platform)) {
    return NextResponse.json({ error: "url and valid platform required" }, { status: 400 });
  }

  try {
    const item = await runCapture({ url, platform, contentType, userId, tags });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Capture failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
