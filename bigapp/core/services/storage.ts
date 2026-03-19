import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { ArchivedMedia, MediaType } from "@/core/types";

cloudinary.config({ secure: true }); // reads CLOUDINARY_URL from env

function guessMediaType(url: string): MediaType {
  const lower = url.toLowerCase();
  if (/\.(mp4|mov|webm)/.test(lower)) return "video";
  if (/\.(mp3|wav|ogg)/.test(lower)) return "audio";
  if (/\.(pdf|doc|docx)/.test(lower)) return "document";
  return "image";
}

/**
 * Uploads a Buffer directly to Cloudinary.
 * Returns an ArchivedMedia entry.
 */
export async function uploadMedia(
  buffer: Buffer,
  fileName: string,
): Promise<ArchivedMedia> {
  const mediaType = guessMediaType(fileName);
  const resourceType = mediaType === "video" ? "video" : "image";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "bigapp/uploads",
        resource_type: resourceType,
        public_id: fileName.split("/").pop()?.split(".")[0], // Use filename as hint
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error("Upload failed"));
        resolve({
          originalUrl: fileName,
          archivedUrl: result.secure_url,
          mediaType,
          sizeBytes: result.bytes,
        });
      },
    );

    uploadStream.end(buffer);
  });
}

/**
 * Tells Cloudinary to fetch a remote URL and store it.
 * Returns an ArchivedMedia entry pointing to the Cloudinary copy.
 */
export async function archiveMedia(remoteUrl: string): Promise<ArchivedMedia> {
  const mediaType = guessMediaType(remoteUrl);
  const resourceType = mediaType === "video" ? "video" : "image";

  const result: UploadApiResponse = await cloudinary.uploader.upload(remoteUrl, {
    folder: "bigapp/archives",
    resource_type: resourceType,
  });

  return {
    originalUrl: remoteUrl,
    archivedUrl: result.secure_url,
    mediaType,
    sizeBytes: result.bytes,
  };
}
