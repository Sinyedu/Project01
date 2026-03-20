import { NextResponse } from "next/server";
import { vaultItems, vaults } from "@/core/db/collections";
import { auth } from "@clerk/nextjs/server";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({ secure: true });

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const vaultCol = await vaults();
    const vault = await vaultCol.findOne({ userId });
    if (!vault) {
      return NextResponse.json({ message: "No vault found to delete" });
    }

    const vaultId = vault._id.toString();
    const vaultItemCol = await vaultItems();
    const items = await vaultItemCol.find({ userId, vaultId }).toArray();

    console.log(`[Vault Delete] Starting hard delete for user ${userId}, vault ${vaultId}. Items to delete: ${items.length}`);

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
            // Local
            const fullPath = path.join(process.cwd(), "public", item.storageId);
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
    const userVaultDir = path.join(process.cwd(), "public", "media", "vault", userId);
    if (fs.existsSync(userVaultDir)) {
      await fs.promises.rm(userVaultDir, { recursive: true, force: true });
    }

    // 3. Delete DB records
    await vaultItemCol.deleteMany({ userId, vaultId });
    await vaultCol.deleteOne({ _id: vault._id });

    console.log(`[Vault Delete] Successfully deleted vault and ${items.length} items for user ${userId}`);

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
