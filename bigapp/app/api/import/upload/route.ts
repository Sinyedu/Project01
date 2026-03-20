import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connections } from "@/core/db";
import { importOfficialExport } from "@/core/imports/exports/pipeline";
import { JobQueue } from "@/core/jobs/client";
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

  const tempDir = path.join(process.cwd(), ".tmp", `upload-${randomUUID()}`);
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  let platform: string | null = null;
  let mode: string | null = null;
  let outputMode: "cloudinary" | "local" = "local";
  let firstFileName: string | null = null;
  let fileCount = 0;
  let bytesReceived = 0;

  console.log(`[Upload] Starting upload for user ${userId}`);

  try {
    await new Promise<void>((resolve, reject) => {
      const bb = busboy({ 
        headers: { 'content-type': req.headers.get('content-type') || '' },
        limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB limit
      });

      const filePromises: Promise<void>[] = [];

      bb.on('file', (name, file, info) => {
        const { filename } = info;
        if (!firstFileName) firstFileName = filename;
        fileCount++;
        
        const filePath = path.join(tempDir, filename);
        // Ensure subdirectories exist if filename contains paths
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });

        const writeStream = fs.createWriteStream(filePath);
        console.log(`[Upload] Receiving file: ${filename}`);
        file.pipe(writeStream);
        
        const p = new Promise<void>((res, rej) => {
          writeStream.on('finish', res);
          writeStream.on('error', rej);
        });
        filePromises.push(p);

        file.on('data', (chunk) => {
          bytesReceived += chunk.length;
        });
      });

      bb.on('field', (name, val) => {
        if (name === 'platform') platform = val;
        if (name === 'mode') mode = val;
        if (name === 'outputMode' && (val === 'cloudinary' || val === 'local')) outputMode = val as any;
      });

      bb.on('finish', async () => {
        try {
          await Promise.all(filePromises);
          console.log(`[Upload] Finished receiving ${fileCount} files. Total: ${Math.round(bytesReceived / (1024 * 1024))} MB`);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      bb.on('error', (err) => {
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
              const keepWriting = bb.write(value);
              if (!keepWriting) {
                await new Promise<void>((resolve) => bb.once('drain', resolve));
              }
            }
          }
        } catch (err) {
          bb.destroy(err as any);
        }
      })();
    });

    if (mode === "organize") {
      let finalPath: string;

      if (fileCount === 1 && firstFileName?.endsWith(".zip")) {
        // Already a ZIP
        finalPath = path.join(tempDir, firstFileName);
      } else {
        // Multiple files or single non-zip, process the directory directly
        finalPath = tempDir;
      }

      // Create a background job for organizing
      const jobId = await JobQueue.enqueue("organize_zip", {
        zipPath: finalPath, // Pipeline now supports directory as zipPath
        outputMode,
      }, userId);

      // Trigger worker immediately in background (don't await)
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("host");
      fetch(`${protocol}://${host}/api/cron/worker`, { cache: 'no-store' }).catch(err => {
        console.error("[Upload] Failed to trigger worker:", err);
      });

      return NextResponse.json({ jobId }, { status: 202 });
    }

    // For snapshot import (traditional mode), we expect exactly one ZIP
    const tempFilePath = path.join(tempDir, firstFileName || "export.zip");
    
    if (!platform || !fs.existsSync(tempFilePath)) {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
      return NextResponse.json({ error: "File and platform are required for snapshot import" }, { status: 400 });
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

    const snapshot = await importOfficialExport(
      conn!._id!.toString(),
      userId,
      firstFileName || "export.zip",
      tempFilePath
    );

    // Only unlink if not in organize mode (organize mode handles its own cleanup)
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    return NextResponse.json(snapshot, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Upload] Fatal error:", err);
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    return NextResponse.json({ error: errorMessage || "Upload failed" }, { status: 500 });
  }
}
