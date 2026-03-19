import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { importOfficialExport } from "@/core/imports/exports/pipeline";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: connectionId } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file field required" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const snapshot = await importOfficialExport(connectionId, userId, file.name, buf);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload processing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
