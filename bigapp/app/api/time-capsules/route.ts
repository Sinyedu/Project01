import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { timeCapsules } from "@/core/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const col = await timeCapsules();
  const items = await col.find({ userId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, textContent, tags = [], lockedUntil, recipientEmail } = body as {
    title: string;
    textContent?: string;
    tags?: string[];
    lockedUntil: string;
    recipientEmail?: string;
  };

  if (!title || !lockedUntil) {
    return NextResponse.json({ error: "title and lockedUntil required" }, { status: 400 });
  }

  const unlockDate = new Date(lockedUntil);
  if (unlockDate <= new Date()) {
    return NextResponse.json({ error: "lockedUntil must be in the future" }, { status: 400 });
  }

  const col = await timeCapsules();
  const capsule = {
    userId,
    title,
    textContent,
    media: [],
    tags,
    lockedUntil: unlockDate,
    recipientEmail,
    status: "locked" as const,
    createdAt: new Date(),
  };

  const result = await col.insertOne(capsule);
  return NextResponse.json({ _id: result.insertedId, ...capsule }, { status: 201 });
}
