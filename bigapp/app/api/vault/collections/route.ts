import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { vaultCollections } from "@/core/db/collections";
import { VaultCollectionSchema } from "@/core/schema/collection";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const col = await vaultCollections();
  const collections = await col.find({ userId }).sort({ updatedAt: -1 }).toArray();

  return NextResponse.json(collections);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const validated = VaultCollectionSchema.parse({
      ...body,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const col = await vaultCollections();
    const result = await col.insertOne(validated as any);

    return NextResponse.json({ _id: result.insertedId, ...validated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
