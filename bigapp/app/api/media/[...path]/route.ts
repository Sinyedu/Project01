import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getLocalMediaRoot } from "@/core/config/storage";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const pathParts = (await params).path;
  const mediaPath = pathParts.join("/");
  const baseDir = getLocalMediaRoot();
  const absolutePath = path.join(baseDir, mediaPath);

  console.log(`[MediaServer] Request: ${mediaPath}`);
  console.log(`[MediaServer] Absolute Path: ${absolutePath}`);

  // Security check: ensure the path is within the baseDir
  if (!absolutePath.startsWith(baseDir)) {
    console.warn(`[MediaServer] Forbidden access attempt: ${absolutePath}`);
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!fs.existsSync(absolutePath)) {
    console.warn(`[MediaServer] File not found: ${absolutePath}`);
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    
    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".heic") contentType = "image/heic";
    else if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".mov") contentType = "video/quicktime";
    else if (ext === ".json") contentType = "application/json";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving media:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
