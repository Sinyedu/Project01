import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { memoryBundles, records } from "@/core/db/collections";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const bundleCol = await memoryBundles();
  const recordCol = await records();

  const bundles = await bundleCol
    .find({ userId })
    .sort({ startDate: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const total = await bundleCol.countDocuments({ userId });

  // Hydrate cover image URLs
  const results = await Promise.all(
    bundles.map(async (bundle) => {
      const record = await recordCol.findOne({ _id: new ObjectId(bundle.coverImageId) });
      let coverImageUrl = null;
      if (record) {
        // secureUrl should be something like /media/instagram/yyyy/mm/...
        coverImageUrl = record.data.secureUrl as string || (record.data.path as string ? `/media/${record.data.path}` : null);
      }
      return {
        id: bundle._id,
        title: bundle.title,
        startDate: bundle.startDate,
        endDate: bundle.endDate,
        coverImageUrl,
        mediaCount: bundle.mediaCount,
      };
    })
  );

  return NextResponse.json({
    data: results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
