import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { memoryBundles, records } from "@/core/db/collections";
import { ObjectId } from "mongodb";
import { getPublicMediaBaseUrl } from "@/core/config/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bundleCol = await memoryBundles();
  const recordCol = await records();

  const bundle = await bundleCol.findOne({
    _id: new ObjectId(id),
    userId,
  });

  if (!bundle) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  // Hydrate all media items
  const mediaIds = bundle.mediaIds.map(id => new ObjectId(id));
  const mediaItems = await recordCol.find({ _id: { $in: mediaIds } }).toArray();

  // Map to a clean response format
  const items = mediaItems.map(item => ({
    id: item._id,
    sourceId: item.sourceId,
    timestamp: item.sourceTimestamp,
    data: item.data,
    secureUrl: item.data.secureUrl as string || (item.data.path as string ? `${getPublicMediaBaseUrl()}/${item.data.path}` : null),
  }));

  return NextResponse.json({
    ...bundle,
    mediaItems: items,
  });
}
