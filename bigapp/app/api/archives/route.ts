import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { archives, records } from "@/core/db";
import { importPublicUrl } from "@/core/imports/public/pipeline";
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
      const dateA = new Date((a as any).sourceTimestamp || (a as any).createdAt || 0).getTime();
      const dateB = new Date((b as any).sourceTimestamp || (b as any).createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 50);

  return NextResponse.json(combined);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { url, platform, tags } = body as {
    url: string;
    platform: string;
    tags?: string[];
  };

  if (!url || !platform || !isPlatform(platform)) {
    return NextResponse.json({ error: "url and valid platform required" }, { status: 400 });
  }

  try {
    const result = await importPublicUrl(url, platform, userId);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
