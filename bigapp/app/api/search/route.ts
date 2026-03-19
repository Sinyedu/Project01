import { NextRequest, NextResponse } from "next/server";
import { searchService } from "@/core/search/hybrid";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const platforms = searchParams.get("platforms")?.split(",") || [];
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const result = await searchService.search({
      query,
      userId,
      platforms: platforms.length > 0 ? platforms : undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Search failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
