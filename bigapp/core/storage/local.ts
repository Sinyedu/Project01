import fs from "fs";
import path from "path";
import crypto from "crypto";
import stream from "stream";
import { promisify } from "util";
import type { MediaStorageAdapter, StoredMediaResult } from "./adapter";
import { getLocalMediaRoot, getPublicMediaBaseUrl } from "../config/storage";

const pipeline = promisify(stream.pipeline);

export class LocalFilesystemStorageAdapter implements MediaStorageAdapter {
  private baseDir: string;
  private publicBaseUrl: string;

  constructor() {
    this.baseDir = getLocalMediaRoot();
    this.publicBaseUrl = getPublicMediaBaseUrl();
  }

  private getDeterministicPath(source: string, filenameHint: string, hash: string): string {
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const safeHint = filenameHint.replace(/[^a-z0-9_.-]/gi, "").substring(0, 50) || "file";
    const name = `${hash.substring(0, 12)}-${safeHint}`;
    return path.join(source, yyyy, mm, name);
  }

  async storeFromBuffer(input: {
    buffer: Buffer;
    mimeType: string;
    source: string;
    ownerId?: string;
    assetType: "image" | "video" | "raw" | "unknown";
    folder?: string;
    filenameHint?: string;
    metadata?: Record<string, unknown>;
  }): Promise<StoredMediaResult> {
    const sha256 = crypto.createHash("sha256").update(input.buffer).digest("hex");
    const relativePath = this.getDeterministicPath(input.source, input.filenameHint || "upload", sha256);
    const absolutePath = path.join(this.baseDir, relativePath);

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, input.buffer);

    return {
      storageProvider: "local",
      storageKey: relativePath,
      secureUrl: `${this.publicBaseUrl}/${relativePath.replace(/\\/g, "/")}`,
      bytes: input.buffer.length,
      mimeType: input.mimeType,
      sha256,
    };
  }

  async storeFromUrl(input: {
    remoteUrl: string;
    source: string;
    ownerId?: string;
    assetType: "image" | "video" | "raw" | "unknown";
    folder?: string;
    filenameHint?: string;
    metadata?: Record<string, unknown>;
  }): Promise<StoredMediaResult> {
    const res = await fetch(input.remoteUrl);
    if (!res.ok) throw new Error(`Failed to fetch ${input.remoteUrl}: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = res.headers.get("content-type") || "application/octet-stream";

    let hint = input.filenameHint;
    if (!hint) {
      try {
        const urlObj = new URL(input.remoteUrl);
        hint = path.basename(urlObj.pathname);
      } catch {
        hint = "download";
      }
    }

    return this.storeFromBuffer({ ...input, buffer, mimeType, filenameHint: hint });
  }
}
