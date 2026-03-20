import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { vaults, vaultItems } from "@/core/db/collections";
import { getLocalMediaRoot, getPublicMediaBaseUrl } from "@/core/config/storage";
import { v2 as cloudinary } from "cloudinary";
import exifr from "exifr";
import { format } from "date-fns";
import { JobQueue } from "@/core/jobs/client";

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetMode, stagingPath } = await req.json();

  if (!stagingPath || !fs.existsSync(stagingPath)) {
    return NextResponse.json({ error: "Staging path not found" }, { status: 400 });
  }

  try {
    const vaultCol = await vaults();
    let vault = await vaultCol.findOne({ userId });
    if (!vault) {
      const vResult = await vaultCol.insertOne({ userId, name: "My Vault", createdAt: new Date(), updatedAt: new Date() } as any);
      vault = { _id: vResult.insertedId } as any;
    }
    const vaultId = vault!._id.toString();
    const vaultItemCol = await vaultItems();

    const allMediaItems: { currentDir: string; relativePath: string; metadata: any; mediaFilePath: string }[] = [];

    // 1. Recursively collect all items to process
    async function collectItems(currentDir: string, relativePath: string = "") {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await collectItems(fullPath, relPath);
        } else if (entry.name.endsWith(".metadata.json")) {
          const metadata = JSON.parse(await readFile(fullPath, "utf-8"));
          const mediaFileName = metadata.storedFilename;
          const mediaFilePath = path.join(currentDir, mediaFileName);

          if (fs.existsSync(mediaFilePath)) {
            allMediaItems.push({ currentDir, relativePath, metadata, mediaFilePath });
          }
        }
      }
    }

    console.log(`[Finalize] Collecting items from: ${stagingPath}`);
    await collectItems(stagingPath);
    console.log(`[Finalize] Found ${allMediaItems.length} items to process.`);

    // 2. Process in batches
    const BATCH_SIZE = targetMode === "local" ? 50 : 5;
    for (let i = 0; i < allMediaItems.length; i += BATCH_SIZE) {
      const batch = allMediaItems.slice(i, i + BATCH_SIZE);
      console.log(`[Finalize] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} items)`);

      await Promise.all(batch.map(async ({ currentDir, relativePath, metadata, mediaFilePath }) => {
        const mediaFileName = metadata.storedFilename;
        try {
            let finalStoragePath = "";
            let storageId = "";
            const yearMonth = relativePath.replace(/\\/g, "/");

            if (targetMode === "local") {
                const vaultStorageDir = path.join(getLocalMediaRoot(), "vault", userId, yearMonth);
                await mkdir(vaultStorageDir, { recursive: true });
                const vaultFilePath = path.join(vaultStorageDir, mediaFileName);
                await fs.promises.copyFile(mediaFilePath, vaultFilePath);
                
                // Also copy the .metadata.json sidecar if it exists (which it should in staging)
                const stagingMetadataPath = `${mediaFilePath}.metadata.json`;
                if (fs.existsSync(stagingMetadataPath)) {
                  await fs.promises.copyFile(stagingMetadataPath, `${vaultFilePath}.metadata.json`);
                }
                finalStoragePath = `${getPublicMediaBaseUrl()}/vault/${userId}/${yearMonth}/${mediaFileName}`.replace(/\\/g, "/");
                storageId = finalStoragePath;
            } else {
                cloudinary.config({ secure: true });
                const uploadResult = await cloudinary.uploader.upload(mediaFilePath, {
                    folder: `users/${userId}/vault/${yearMonth}`,
                    resource_type: "auto",
                    use_filename: true,
                    unique_filename: true,
                });
                finalStoragePath = uploadResult.secure_url;
                storageId = uploadResult.public_id;
            }

            const date = new Date(metadata.capturedAt);
            const exif = metadata.mediaType === "image" ? await exifr.parse(mediaFilePath, { gps: true }).catch(() => ({})) : {};
            const checksum = metadata.checksumSha256;

            // Priority: 
            // 1. EXIF data from file
            // 2. Sidecar metadata from JSON (e.g. Google Photos geoData)
            const lat = Number(
              exif?.latitude ?? 
              exif?.GPSLatitude ?? 
              exif?.gps?.latitude ?? 
              metadata?.platformMetadata?.geoData?.latitude ?? 
              metadata?.platformMetadata?.location?.latitude
            );
            const lng = Number(
              exif?.longitude ?? 
              exif?.GPSLongitude ?? 
              exif?.gps?.longitude ?? 
              metadata?.platformMetadata?.geoData?.longitude ?? 
              metadata?.platformMetadata?.location?.longitude
            );

            const vaultItem = {
                vaultId: vaultId.toString(),
                userId,
                type: metadata.mediaType,
                originalFilename: metadata.originalFilename,
                storagePath: finalStoragePath,
                storageId,
                thumbnailPath: metadata.mediaType === "image" ? finalStoragePath : undefined,
                captureDate: date,
                dateSource: metadata.dateSource,
                monthKey: format(date, "yyyy-MM"),
                metadata: { 
                  exif, 
                  lat: (!isNaN(lat) && lat !== 0) ? lat : undefined, 
                  lng: (!isNaN(lng) && lng !== 0) ? lng : undefined 
                },
                checksum,
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // HARD PREVENT DUPLICATES: Upsert based on checksum and userId
            await vaultItemCol.updateOne(
                { userId, vaultId: vaultId.toString(), checksum },
                { $set: vaultItem },
                { upsert: true }
            );

            // Fetch the document to get the _id for enrichment
            const finalDoc = await vaultItemCol.findOne({ userId, vaultId: vaultId.toString(), checksum });
            if (finalDoc) {
                await JobQueue.enqueue("enrich_vault_item", { vaultItemId: finalDoc._id.toString() }, userId);
                console.log(`[Finalize] Integrated: ${mediaFileName}`);
            }
        } catch (itemError) {
            console.error(`[Finalize] Failed to process ${mediaFileName}:`, itemError);
            // We don't throw here so other items in the batch can finish
        }
      }));
    }

    console.log(`[Finalize] Finished all batches.`);
    // Cleanup staging directory
    await fs.promises.rm(stagingPath, { recursive: true, force: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Finalize] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
