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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!id) return new NextResponse("ID is required", { status: 400 });

  const body = await req.json();
  const { isFavorite, isImportant, isMonthCover } = body;

  const col = await vaultItems();
  const item = await col.findOne({ _id: new ObjectId(id), userId });

  if (!item) {
    return new NextResponse("Item not found", { status: 404 });
  }

  const update: any = { $set: {} };
  if (typeof isFavorite === "boolean") update.$set.isFavorite = isFavorite;
  if (typeof isImportant === "boolean") update.$set.isImportant = isImportant;
  if (typeof isMonthCover === "boolean") {
    update.$set.isMonthCover = isMonthCover;
    // If setting as cover, unset other covers for the same month
    if (isMonthCover) {
      await col.updateMany(
        { userId, monthKey: item.monthKey, _id: { $ne: item._id } },
        { $set: { isMonthCover: false } }
      );
    }
  }

  if (Object.keys(update.$set).length === 0) {
    return new NextResponse("Nothing to update", { status: 400 });
  }

  update.$set.updatedAt = new Date();
  await col.updateOne({ _id: item._id }, update);

  const updatedItem = await col.findOne({ _id: item._id });
  return NextResponse.json(updatedItem);
}
