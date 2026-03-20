import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { JobQueue } from "@/core/jobs/client";
import path from "path";
import fs from "fs";
import busboy from "busboy";
import { randomUUID } from "crypto";
import os from "os";

// Next.js App Router Config
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tempDir = path.join(os.tmpdir(), "bigapp-uploads", `upload-${randomUUID()}`);
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  let mode: string | null = null;
  let outputMode: "cloudinary" | "local" | "staging" = "local";
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
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });

        const writeStream = fs.createWriteStream(filePath);
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
        if (name === 'mode') mode = val;
        if (name === 'outputMode' && (val === 'cloudinary' || val === 'local' || val === 'staging')) outputMode = val as any;
      });

      bb.on('finish', async () => {
        try {
          await Promise.all(filePromises);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      bb.on('error', (err) => {
        reject(err);
      });

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
        finalPath = path.join(tempDir, firstFileName);
      } else {
        finalPath = tempDir;
      }

      const jobId = await JobQueue.enqueue("organize_zip", {
        zipPath: finalPath,
        outputMode,
      }, userId);

      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("host");
      fetch(`${protocol}://${host}/api/cron/worker`, { cache: 'no-store' }).catch(err => {
        console.error("[Upload] Failed to trigger worker:", err);
      });

      return NextResponse.json({ jobId }, { status: 202 });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Upload] Fatal error:", err);
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    return NextResponse.json({ error: errorMessage || "Upload failed" }, { status: 500 });
  }
}
