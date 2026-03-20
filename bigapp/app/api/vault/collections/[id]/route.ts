import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { vaultCollections, vaultItems } from "@/core/db/collections";
import { ObjectId } from "mongodb";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const col = await vaultCollections();
  const collection = await col.findOne({ _id: new ObjectId(id), userId });

  if (!collection) return new NextResponse("Not Found", { status: 404 });

  // Optionally fetch items too
  const itemCol = await vaultItems();
  const items = await itemCol.find({
    _id: { $in: collection.itemIds.map(id => new ObjectId(id)) }
  }).toArray();

  return NextResponse.json({ collection, items });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const col = await vaultCollections();

  const update: any = { $set: { updatedAt: new Date() } };
  
  if (body.name) update.$set.name = body.name;
  if (body.description !== undefined) update.$set.description = body.description;
  if (body.itemIds) update.$set.itemIds = body.itemIds;
  if (body.coverItemIds) update.$set.coverItemIds = body.coverItemIds;

  // Convenience: add single item
  if (body.addItemId) {
    await col.updateOne(
      { _id: new ObjectId(id), userId },
      { 
        $addToSet: { itemIds: body.addItemId },
        $set: { updatedAt: new Date() }
      }
    );
    const updated = await col.findOne({ _id: new ObjectId(id), userId });
    return NextResponse.json(updated);
  }

  // Convenience: remove single item
  if (body.removeItemId) {
    await col.updateOne(
      { _id: new ObjectId(id), userId },
      { 
        $pull: { itemIds: body.removeItemId },
        $set: { updatedAt: new Date() }
      }
    );
    const updated = await col.findOne({ _id: new ObjectId(id), userId });
    return NextResponse.json(updated);
  }

  await col.updateOne({ _id: new ObjectId(id), userId }, update);
  const updated = await col.findOne({ _id: new ObjectId(id), userId });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const col = await vaultCollections();
  await col.deleteOne({ _id: new ObjectId(id), userId });

  return NextResponse.json({ success: true });
}
