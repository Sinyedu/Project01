import { NextResponse } from "next/server";
import { vaultItems, vaults } from "@/core/db/collections";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const vaultCol = await vaults();
  const vault = await vaultCol.findOne({ userId });
  if (!vault) {
    return NextResponse.json([]);
  }

  const col = await vaultItems();
  const pipeline = [
    { $match: { userId, vaultId: vault._id.toString() } },
    {
      $group: {
        _id: "$monthKey",
        itemCount: { $sum: 1 },
        year: { $first: { $substr: ["$monthKey", 0, 4] } },
        month: { $first: { $substr: ["$monthKey", 5, 2] } },
      }
    },
    { $sort: { _id: -1 } }
  ];

  const results = await col.aggregate(pipeline as any).toArray();
  
  // Format into capsules
  const capsules = results.map(r => ({
    monthKey: r._id,
    year: r.year,
    month: r.month,
    itemCount: r.itemCount,
    title: new Date(Number(r.year), Number(r.month) - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }));

  return NextResponse.json(capsules);
}
