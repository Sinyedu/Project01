import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { archives } from "@/core/db";
import { runCapture } from "@/core/services/pipeline";
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
