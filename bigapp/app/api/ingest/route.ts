import { NextRequest, NextResponse } from "next/server";
import { importPublicUrl } from "@/core/imports/public/pipeline";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, source = "unknown", userId = "user_test_123" } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const result = await importPublicUrl(url, source, userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
