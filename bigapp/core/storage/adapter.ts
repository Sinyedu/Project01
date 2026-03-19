export interface MediaStorageAdapter {
  storeFromUrl(input: {
    remoteUrl: string;
    source: string;
    ownerId?: string;
    assetType: "image" | "video" | "raw" | "unknown";
    folder?: string;
    filenameHint?: string;
    metadata?: Record<string, unknown>;
  }): Promise<StoredMediaResult>;

  storeFromBuffer(input: {
    buffer: Buffer;
    mimeType: string;
    source: string;
    ownerId?: string;
    assetType: "image" | "video" | "raw" | "unknown";
    folder?: string;
    filenameHint?: string;
    metadata?: Record<string, unknown>;
  }): Promise<StoredMediaResult>;
}

export interface StoredMediaResult {
  storageProvider: "local" | "cloudinary";
  storageKey?: string; // e.g. publicId for cloudinary, relative path for local
  secureUrl: string;
  bytes?: number;
  mimeType?: string;
  sha256?: string;
  width?: number;
  height?: number;
  duration?: number;
  resourceType?: string;
}
