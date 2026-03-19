import { NextRequest, NextResponse } from "next/server";
import { searchMoments } from "@/core/moments/search";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "user_test_123";
  const query = searchParams.get("q") || undefined;
  const sourceTypes = searchParams.get("sources")?.split(",") || undefined;
  
  try {
    const results = await searchMoments({
      userId,
      query,
      sourceTypes,
    });
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
