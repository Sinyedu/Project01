import type { MediaStorageAdapter } from "./adapter";
import { LocalFilesystemStorageAdapter } from "./local";
import { CloudinaryStorageAdapter } from "./cloudinary";

let adapterInstance: MediaStorageAdapter | null = null;

export function getStorageAdapter(): MediaStorageAdapter {
  if (adapterInstance) return adapterInstance;

  const provider = process.env.MEDIA_STORAGE_PROVIDER || "local";
  if (provider === "cloudinary") {
    adapterInstance = new CloudinaryStorageAdapter();
  } else {
    adapterInstance = new LocalFilesystemStorageAdapter();
  }

  return adapterInstance;
}
