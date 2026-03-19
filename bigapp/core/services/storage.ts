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
