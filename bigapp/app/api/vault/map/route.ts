import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { vaults, vaultItems } from "@/core/db/collections";
import { ObjectId } from "mongodb";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const vaultCol = await vaults();
  const vault = await vaultCol.findOne({ userId });
  if (!vault) return NextResponse.json([]);

  const vId = vault._id.toString();
  const col = await vaultItems();

  console.log(`[MapAPI] Fetching items for user: ${userId}`);

  const items = await col.find({
    userId,
    vaultId: { $in: [vId, new ObjectId(vId)] },
    "metadata.lat": { $exists: true, $ne: null },
    "metadata.lng": { $exists: true, $ne: null }
  }, {
    projection: {
      storagePath: 1,
      type: 1,
      "metadata.lat": 1,
      "metadata.lng": 1,
      "metadata.locationSource": 1,
      originalFilename: 1,
      captureDate: 1
    }
  }).toArray();

  console.log(`[MapAPI] Found ${items.length} items with GPS data. Sources: ${items.map(i => i.metadata?.locationSource || 'unknown').join(', ')}`);

  return NextResponse.json(items);
}
