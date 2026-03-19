import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { MediaStorageAdapter, StoredMediaResult } from "./adapter";

export class CloudinaryStorageAdapter implements MediaStorageAdapter {
  constructor() {
    cloudinary.config({ secure: true }); // Reads from CLOUDINARY_URL or CLOUDINARY_API_KEY etc.
  }

  private mapResourceType(assetType: string): "image" | "video" | "raw" | "auto" {
    if (assetType === "image") return "image";
    if (assetType === "video") return "video";
    if (assetType === "raw") return "raw";
    return "auto";
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
    const resourceType = this.mapResourceType(input.assetType);
    const folder = input.folder || `bigapp/${input.source}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: input.filenameHint ? input.filenameHint.split(".")[0] : undefined,
          context: input.metadata,
        },
        (error, result) => {
          if (error || !result) return reject(error || new Error("Upload failed"));
          resolve({
            storageProvider: "cloudinary",
            storageKey: result.public_id,
            secureUrl: result.secure_url,
            bytes: result.bytes,
            mimeType: `${result.resource_type}/${result.format}`,
            width: result.width,
            height: result.height,
            duration: result.duration,
            resourceType: result.resource_type,
          });
        }
      );

      uploadStream.end(input.buffer);
    });
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
    const resourceType = this.mapResourceType(input.assetType);
    const folder = input.folder || `bigapp/${input.source}`;

    const result: UploadApiResponse = await cloudinary.uploader.upload(input.remoteUrl, {
      folder,
      resource_type: resourceType,
      context: input.metadata,
    });

    return {
      storageProvider: "cloudinary",
      storageKey: result.public_id,
      secureUrl: result.secure_url,
      bytes: result.bytes,
      mimeType: `${result.resource_type}/${result.format}`,
      width: result.width,
      height: result.height,
      duration: result.duration,
      resourceType: result.resource_type,
    };
  }
}
