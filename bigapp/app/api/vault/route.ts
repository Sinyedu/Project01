import { NextResponse } from "next/server";
import { vaultItems, vaults } from "@/core/db/collections";
import { auth } from "@clerk/nextjs/server";
import { Filter, ObjectId } from "mongodb";
import { VaultItem } from "@/core/schema/vault";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const type = searchParams.get("type");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const favorites = searchParams.get("favorites") === "true";

  // Get user's vault
  const vaultCol = await vaults();
  const vault = await vaultCol.findOne({ userId });
  if (!vault) {
    console.log(`[VaultAPI] No vault found for user: ${userId}`);
    return NextResponse.json([]);
  }

  const vId = vault._id.toString();
  // Support both string and ObjectId in DB
  const filter: any = { 
    userId, 
    vaultId: { $in: [vId, new ObjectId(vId)] } 
  };

  if (type && type !== "all") {
    filter.type = type as "image" | "video";
  }

  if (favorites) {
    filter.isFavorite = true;
  }

  if (month && year && month !== "all" && year !== "all") {
    filter.monthKey = `${year}-${month.padStart(2, "0")}`;
  } else if (year && year !== "all") {
    filter.monthKey = { $regex: `^${year}-` } as any;
  }

  if (query) {
    filter.$or = [
      { originalFilename: { $regex: query, $options: "i" } },
      { caption: { $regex: query, $options: "i" } },
      { tags: { $in: [new RegExp(query, "i")] } as any },
    ];
  }

  const col = await vaultItems();
  const items = await col.find(filter).sort({ captureDate: -1 }).toArray();

  console.log(`[VaultAPI] Found ${items.length} items for vault: ${vId}`);
  return NextResponse.json(items);
}
