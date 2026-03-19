import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { archives } from "@/core/db";
import { importPublicUrl } from "@/core/imports/public/pipeline";
import { isPlatform, type ContentType } from "@/core/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const col = await archives();
  const items = await col.find({ userId }).sort({ createdAt: -1 }).limit(50).toArray();
  return NextResponse.json(items);
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
