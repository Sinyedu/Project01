import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { archives, records } from "@/core/db/collections";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const oid = new ObjectId(id);

  // Check new records collection first
  const record = await (await records()).findOne({ _id: oid as any, userId });
  if (record) {
    return NextResponse.json({ type: "record", data: record });
  }

  // Fallback to legacy archives collection
  const archive = await (await archives()).findOne({ _id: oid as any, userId });
  if (archive) {
    return NextResponse.json({ type: "archive", data: archive });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
