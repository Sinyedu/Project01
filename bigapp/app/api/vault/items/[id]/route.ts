import { NextResponse } from "next/server";
import { vaultItems } from "@/core/db/collections";
import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!id) return new NextResponse("ID is required", { status: 400 });

  const col = await vaultItems();
  const item = await col.findOne({ _id: new ObjectId(id), userId });

  if (!item) {
    return new NextResponse("Item not found", { status: 404 });
  }

  return NextResponse.json(item);
}
