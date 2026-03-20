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

  const pipeline = [
    { $match: { userId, vaultId: { $in: [vId, new ObjectId(vId)] } } },
    {
      $group: {
        _id: "$monthKey",
        count: { $sum: 1 },
        year: { $first: { $substr: ["$monthKey", 0, 4] } },
        month: { $first: { $substr: ["$monthKey", 5, 2] } },
        thumbnail: { $first: "$storagePath" }
      }
    },
    { $sort: { _id: -1 } }
  ];

  const results = await col.aggregate(pipeline as any).toArray();
  return NextResponse.json(results);
}
