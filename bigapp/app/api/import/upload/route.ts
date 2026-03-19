import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connections } from "@/core/db";
import { importOfficialExport } from "@/core/imports/exports/pipeline";
import path from "path";
import fs from "fs";
import busboy from "busboy";
import { randomUUID } from "crypto";

// Next.js App Router Config
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tempFilePath = path.join("/tmp", `upload-${randomUUID()}.zip`);
  let platform: string | null = null;
  let fileName: string | null = null;
  let bytesReceived = 0;

  console.log(`[Upload] Starting 1GB+ upload for user ${userId}`);

  try {
    await new Promise<void>((resolve, reject) => {
      const bb = busboy({ 
        headers: { 'content-type': req.headers.get('content-type') || '' },
        limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB limit
      });
      const writeStream = fs.createWriteStream(tempFilePath);

      bb.on('file', (name, file, info) => {
        const { filename } = info;
        fileName = filename;
        console.log(`[Upload] Receiving file: ${filename}`);
        file.pipe(writeStream);
        
        file.on('data', (chunk) => {
          bytesReceived += chunk.length;
          // Log every 100MB
          if (Math.floor(bytesReceived / (100 * 1024 * 1024)) > Math.floor((bytesReceived - chunk.length) / (100 * 1024 * 1024))) {
            console.log(`[Upload] Received ${Math.round(bytesReceived / (1024 * 1024))} MB...`);
          }
        });
      });

      bb.on('field', (name, val) => {
        if (name === 'platform') platform = val;
      });

      bb.on('finish', () => {
        console.log(`[Upload] Finished receiving stream. Total: ${Math.round(bytesReceived / (1024 * 1024))} MB`);
        writeStream.close();
        resolve();
      });

      bb.on('error', (err) => {
        console.error("[Upload] Busboy error:", err);
        writeStream.close();
        reject(err);
      });

      // Convert Web ReadableStream to Node Readable
      const reader = req.body?.getReader();
      if (!reader) {
        reject(new Error("Empty body"));
        return;
      }

      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              bb.end();
              break;
            }
            if (value) {
              bb.write(value);
            }
          }
        } catch (err) {
          console.error("[Upload] Reader loop error:", err);
          bb.destroy(err as any);
        }
      })();
    });

    if (!platform || !fs.existsSync(tempFilePath)) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      return NextResponse.json({ error: "File and platform are required" }, { status: 400 });
    }

    console.log(`[Upload] Processing connection for platform: ${platform}`);
    const connCol = await connections();
    let conn = await connCol.findOne({ userId, platform: platform as any, mode: "export_import" });

    if (!conn) {
      const result = await connCol.insertOne({
        userId,
        platform: platform as any,
        mode: "export_import",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      conn = { _id: result.insertedId } as any;
    }

    console.log(`[Upload] Triggering pipeline for snapshot...`);
    const snapshot = await importOfficialExport(
      conn!._id!.toString(),
      userId,
      fileName || "export.zip",
      tempFilePath
    );

    // Cleanup
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    console.log(`[Upload] Complete and cleaned up.`);

    return NextResponse.json(snapshot, { status: 201 });
  } catch (err: any) {
    console.error("[Upload] Fatal error:", err);
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
