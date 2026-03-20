import { NextResponse } from "next/server";
import { vaultItems, vaults, jobs } from "@/core/db/collections";
import { auth } from "@clerk/nextjs/server";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { getLocalMediaRoot, getPublicMediaBaseUrl } from "@/core/config/storage";

cloudinary.config({ secure: true });

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const vaultCol = await vaults();
    const vaultItemCol = await vaultItems();
    const jobCol = await jobs();

    // Find all items for this user regardless of vaultId
    const items = await vaultItemCol.find({ userId }).toArray();

    console.log(`[Vault Delete] Starting hard delete for user ${userId}. Items to delete: ${items.length}`);

    // 1. Delete physical files
    for (const item of items) {
      try {
        if (item.storageId) {
          if (item.storagePath.startsWith("http")) {
            // Cloudinary
            await cloudinary.uploader.destroy(item.storageId, { 
              resource_type: item.type === "video" ? "video" : "image" 
            });
          } else {
            // Local - if storageId is a URL, we need to extract the path
            const relativePath = item.storageId.includes("/vault/") 
                ? item.storageId.split(`${getPublicMediaBaseUrl()}/`)[1] || item.storageId
                : item.storageId;
            const fullPath = path.join(getLocalMediaRoot(), relativePath);
            if (fs.existsSync(fullPath)) {
              await fs.promises.unlink(fullPath);
            }
          }
        }
      } catch (err) {
        console.error(`[Vault Delete] Failed to delete file for item ${item._id}:`, err);
        // Continue deleting others
      }
    }

    // 2. Cleanup local directories if they exist
    const userVaultDir = path.join(getLocalMediaRoot(), "vault", userId);
    if (fs.existsSync(userVaultDir)) {
      await fs.promises.rm(userVaultDir, { recursive: true, force: true });
    }

    // 3. Delete DB records
    await vaultItemCol.deleteMany({ userId });
    const vaultResult = await vaultCol.deleteMany({ userId });

    // 4. Clear ALL jobs for this user to prevent worker looping on stale data
    const clearResult = await jobCol.deleteMany({ userId });

    console.log(`[Vault Delete] Successfully wiped vault (${vaultResult.deletedCount} vaults), deleted ${items.length} items, and cleared ${clearResult.deletedCount} total jobs for user ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: "Vault and all associated media have been permanently deleted." 
    });
  } catch (error) {
    console.error("[Vault Delete] Error during hard delete:", error);
    return NextResponse.json(
      { error: "Failed to fully delete vault. Some assets might remain." }, 
      { status: 500 }
    );
  }
}
