import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { promisify } from "util";
import { format } from "date-fns";
import archiver from "archiver";
import exifr from "exifr";
import { v2 as cloudinary } from "cloudinary";
import { ZipFileProvider, FolderFileProvider } from "@/core/utils/zip";
import { vaults, vaultItems } from "@/core/db/collections";
import { JobQueue } from "@/core/jobs/client";
import { getLocalMediaRoot, getPublicMediaBaseUrl } from "@/core/config/storage";

cloudinary.config({ secure: true });

const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const rm = promisify(fs.rm);
const writeFile = promisify(fs.writeFile);

const MEDIA_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".heic", ".webp",
  ".mp4", ".mov", ".avi", ".m4v"
];

const DATE_PATTERNS = [
  /(\d{4})(\d{2})(\d{2})_\d{6}/, // 20230715_123456
  /(\d{4})-(\d{2})-(\d{2})/,     // 2023-07-15
  /(\d{4})(\d{2})(\d{2})/,        // 20230715
];

export interface ZipOrganizeOptions {
  userId: string;
  zipPath: string;
  outputMode: "cloudinary" | "local" | "staging";
}

export interface ArchiveItem {
  originalFilename: string;
  storedFilename: string;
  mediaType: "image" | "video";
  source: string;
  capturedAt: string;
  dateSource: "exif" | "filename" | "filesystem" | "unknown";
  checksumSha256: string;
  importedAt: string;
  archivePath: string;
}

export interface ArchiveManifest {
  title: string;
  year: number;
  month: number;
  itemCount: number;
  createdAt: string;
  formatVersion: "1.0";
  items: ArchiveItem[];
}

export interface ZipOrganizeResult {
  totalFiles: number;
  mediaFilesFound: number;
  skippedFiles: number;
  organizedBy: "month";
  folders: { path: string; count: number }[];
  outputMode: "cloudinary" | "local" | "staging";
  downloadUrl?: string;
  archiveManifests: string[]; // Paths to manifests within the ZIP
  stagingPath?: string; // Path to organizedDir in os.tmpdir()
}

export async function runZipOrganizePipeline(jobId: string, options: ZipOrganizeOptions): Promise<ZipOrganizeResult> {
  const { userId, zipPath, outputMode } = options;
  const timestamp = Date.now();
  const organizedDir = path.join(os.tmpdir(), `organized_${userId}_${timestamp}`);

  // Ensure Vault exists
  const vaultCol = await vaults();
  let vault = await vaultCol.findOne({ userId });
  if (!vault) {
    const vResult = await vaultCol.insertOne({
      userId,
      name: "My Vault",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vault = { _id: vResult.insertedId, userId, name: "My Vault" } as any;
  }
  const vaultId = vault!._id.toString();
  const vaultItemCol = await vaultItems();

  let totalFiles = 0;
  let mediaFilesFound = 0;
  let skippedFiles = 0;
  let processedCount = 0;
  
  // Track items for manifests
  const capsules: Record<string, ArchiveManifest> = {};

  const isDirectory = (await stat(zipPath)).isDirectory();
  const provider = isDirectory ? new FolderFileProvider(zipPath) : new ZipFileProvider(zipPath);

  try {
    console.log(`[Job ${jobId}] Initializing organized directory: ${organizedDir}`);
    await mkdir(organizedDir, { recursive: true });

    // 1. Collect all entries first to avoid generator concurrency issues
    console.log(`[Job ${jobId}] Scanning source for entries...`);
    const allEntries: any[] = [];
    for await (const entry of provider.entries()) {
      allEntries.push(entry);
    }
    console.log(`[Job ${jobId}] Found ${allEntries.length} total entries.`);

    const CONCURRENCY = outputMode === "cloudinary" ? 15 : 10;
    
    const runWorker = async () => {
      while (allEntries.length > 0) {
        const entry = allEntries.shift();
        if (!entry) break;

        totalFiles++;
        const ext = path.extname(entry.path).toLowerCase();
        
        if (!MEDIA_EXTENSIONS.includes(ext)) {
          skippedFiles++;
          continue;
        }

        mediaFilesFound++;
        const currentMediaIndex = mediaFilesFound;
        const tempFilePath = path.join(os.tmpdir(), `temp_media_${timestamp}_${currentMediaIndex}${ext}`);

        try {
          // 1. Extract using streaming
          const inputStream = await entry.stream();
          const writeStream = fs.createWriteStream(tempFilePath);
          const hash = crypto.createHash("sha256");
          
          await new Promise<void>((resolve, reject) => {
            inputStream.on("data", (chunk) => hash.update(chunk));
            inputStream.pipe(writeStream);
            writeStream.on("finish", resolve);
            writeStream.on("error", (err) => {
               writeStream.close();
               reject(err);
            });
            inputStream.on("error", reject);
          });
          
          const checksum = hash.digest("hex");

          // 2. Resolve Date
          const { date, source: dateSource } = await resolveFileDateWithSource(tempFilePath);
          const yearStr = format(date, "yyyy");
          const monthStr = format(date, "MM - MMMM");
          const relativeFolder = path.join(yearStr, monthStr);
          const targetFolder = path.join(organizedDir, relativeFolder);
          
          await mkdir(targetFolder, { recursive: true });

          const baseName = path.basename(entry.path);
          let targetName = baseName;
          let targetPath = path.join(targetFolder, targetName);
          
          if (fs.existsSync(targetPath)) {
            const nameParts = path.parse(baseName);
            let counter = 1;
            while (fs.existsSync(targetPath)) {
              targetName = `${nameParts.name} (${counter})${nameParts.ext}`;
              targetPath = path.join(targetFolder, targetName);
              counter++;
            }
          }

          const mediaType = [".mp4", ".mov", ".avi", ".m4v"].includes(ext) ? "video" : "image";
          const archivePath = path.join(relativeFolder, targetName);

          const metadata: ArchiveItem = {
            originalFilename: baseName,
            storedFilename: targetName,
            mediaType: mediaType as "image" | "video",
            source: "user upload",
            capturedAt: date.toISOString(),
            dateSource,
            checksumSha256: checksum,
            importedAt: new Date().toISOString(),
            archivePath: archivePath.replace(/\\/g, "/"),
          };

          await writeFile(`${targetPath}.metadata.json`, JSON.stringify(metadata, null, 2));

          let finalStoragePath = "";
          let storageId = "";

          if (outputMode === "local") {
            const vaultStorageDir = path.join(getLocalMediaRoot(), "vault", userId, yearStr, monthStr);
            await mkdir(vaultStorageDir, { recursive: true });
            const vaultFilePath = path.join(vaultStorageDir, targetName);
            
            // Copy to vault permanent storage
            await fs.promises.copyFile(tempFilePath, vaultFilePath);
            finalStoragePath = `${getPublicMediaBaseUrl()}/vault/${userId}/${yearStr}/${monthStr}/${targetName}`.replace(/\\/g, "/");
            storageId = finalStoragePath;

            await fs.promises.rename(tempFilePath, targetPath);
          } else if (outputMode === "cloudinary") {
            // Upload with a generous 2-minute timeout to prevent hanging
            const uploadResult: any = await Promise.race([
              cloudinary.uploader.upload(tempFilePath, {
                folder: `users/${userId}/vault/${yearStr}/${monthStr}`,
                resource_type: "auto",
                use_filename: true,
                unique_filename: true,
                context: `checksum=${checksum}|original_name=${baseName}`,
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Cloudinary upload timeout")), 120000))
            ]);
            finalStoragePath = uploadResult.secure_url;
            storageId = uploadResult.public_id;
            await unlink(tempFilePath).catch(() => {});
          } else if (outputMode === "staging") {
            // Just move to the organized targetPath (which is already in organizedDir)
            await fs.promises.rename(tempFilePath, targetPath);
            finalStoragePath = `staged://${targetPath}`;
            storageId = "staged";
          }

          // Create Vault Item if not staging
          if (outputMode !== "staging") {
            const exif = mediaType === "image" ? await exifr.parse(targetPath).catch(() => ({})) : {};
            const vaultItem = {
                vaultId,
                userId,
                type: mediaType as "image" | "video",
                originalFilename: baseName,
                storagePath: finalStoragePath,
                storageId,
                thumbnailPath: mediaType === "image" ? finalStoragePath : undefined,
                captureDate: date,
                dateSource,
                monthKey: format(date, "yyyy-MM"),
                metadata: { exif },
                checksum,
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const viResult = await vaultItemCol.insertOne(vaultItem as any);
            
            // Enqueue background enrichment
            await JobQueue.enqueue("enrich_vault_item", { 
                vaultItemId: viResult.insertedId.toString(),
            }, userId);
          }

          const capsuleKey = relativeFolder;
          if (!capsules[capsuleKey]) {
            capsules[capsuleKey] = {
              title: `${format(date, "MMMM yyyy")} Capsule`,
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              itemCount: 0,
              createdAt: new Date().toISOString(),
              formatVersion: "1.0",
              items: [],
            };
          }
          capsules[capsuleKey].items.push(metadata);
          capsules[capsuleKey].itemCount++;

          processedCount++;
          if (processedCount % 10 === 0) {
            console.log(`[Job ${jobId}] Progress: ${processedCount}/${allEntries.length} items processed...`);
          }

        } catch (err) {
          console.error(`[Job ${jobId}] Error processing entry ${entry.path}:`, err);
          if (fs.existsSync(tempFilePath)) await unlink(tempFilePath).catch(() => {});
          skippedFiles++;
        }
      }
    };

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY, allEntries.length); i++) {
      workers.push(runWorker());
    }

    await Promise.all(workers);
    console.log(`[Job ${jobId}] All workers finished. Writing manifests...`);

    // 7. Write Manifests to Folders
    for (const [relPath, manifest] of Object.entries(capsules)) {
      const manifestPath = path.join(organizedDir, relPath, "manifest.json");
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    }

    let downloadUrl: string | undefined;
    if (outputMode === "local") {
      const publicPath = path.join(process.cwd(), "public", "exports");
      await mkdir(publicPath, { recursive: true });
      const finalZipName = `archive_${userId}_${timestamp}.zip`;
      const finalZipPath = path.join(publicPath, finalZipName);
      
      await createZip(organizedDir, finalZipPath);
      downloadUrl = `/exports/${finalZipName}`;
    }

    const result: ZipOrganizeResult = {
      totalFiles,
      mediaFilesFound,
      skippedFiles,
      organizedBy: "month",
      folders: Object.entries(capsules).map(([path, manifest]) => ({ path, count: manifest.itemCount })),
      outputMode,
      downloadUrl,
      // Limit results list if it's somehow massive, though normally it's by month
      archiveManifests: Object.keys(capsules).slice(0, 100).map(p => path.join(p, "manifest.json").replace(/\\/g, "/")),
      stagingPath: outputMode === "staging" ? organizedDir : undefined,
    };

    return result;

  } finally {
    // Cleanup
    try {
      const p = provider as any;
      if (p.close) p.close();
      
      // CRITICAL: If we are in staging mode, DO NOT delete the organized directory yet.
      // It will be cleaned up by the finalize route.
      if (outputMode !== "staging" && fs.existsSync(organizedDir)) {
        await rm(organizedDir, { recursive: true, force: true });
      }
      
      if (fs.existsSync(zipPath)) await unlink(zipPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

async function resolveFileDateWithSource(filePath: string): Promise<{ date: Date; source: ArchiveItem["dateSource"] }> {
  // 1. EXIF
  try {
    const exifData = await exifr.parse(filePath, ["DateTimeOriginal"]);
    if (exifData && exifData instanceof Date) {
      return { date: exifData, source: "exif" };
    }
  } catch {
    // Ignore error
  }

  // 2. Filename patterns
  const fileName = path.basename(filePath);
  for (const pattern of DATE_PATTERNS) {
    const match = fileName.match(pattern);
    if (match) {
      const [, y, m, d] = match;
      const date = new Date(Number(y), Number(m) - 1, Number(d || 1));
      if (!isNaN(date.getTime())) {
        return { date, source: "filename" };
      }
    }
  }

  // 3. File stats
  try {
    const stats = await stat(filePath);
    const date = stats.birthtime && stats.birthtime.getTime() > 0 ? stats.birthtime : stats.mtime;
    return { date, source: "filesystem" };
  } catch {
    // Ignore error
  }

  return { date: new Date(), source: "unknown" };
}

async function createZip(sourceDir: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}
