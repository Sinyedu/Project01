import { profiles, mediaAssets } from "@/core/db";
import { getStorageAdapter } from "@/core/storage/factory";
import { ObjectId } from "mongodb";

export async function processMediaCandidate(assetId: string) {
  const assetsCol = await mediaAssets();
  const asset = await assetsCol.findOne({ _id: new ObjectId(assetId) } as any);
  if (!asset || asset.status !== "pending") return;

  await assetsCol.updateOne(
    { _id: asset._id } as any,
    { $set: { status: "downloading", updatedAt: new Date() } }
  );

  try {
    const adapter = getStorageAdapter();
    const result = await adapter.storeFromUrl({
      remoteUrl: asset.originalRemoteUrl,
      source: asset.source,
      ownerId: asset.ownerEntityId,
      assetType: asset.assetType,
      metadata: { discoveredFrom: asset.discoveredFrom },
    });

    await assetsCol.updateOne(
      { _id: asset._id } as any,
      {
        $set: {
          status: "completed",
          storageProvider: result.storageProvider,
          storageKey: result.storageKey,
          secureUrl: result.secureUrl,
          bytes: result.bytes,
          mimeType: result.mimeType,
          width: result.width,
          height: result.height,
          duration: result.duration,
          sha256: result.sha256,
          updatedAt: new Date(),
        },
      }
    );

    if (asset.ownerEntityId) {
      await updateProfileHeroImage(asset.ownerEntityId);
    }
  } catch (error: any) {
    await assetsCol.updateOne(
      { _id: asset._id } as any,
      {
        $set: {
          status: "failed",
          error: error.message || "Unknown error",
          updatedAt: new Date(),
        },
      }
    );
  }
}

async function updateProfileHeroImage(profileId: string) {
  const assetsCol = await mediaAssets();
  const profilesCol = await profiles();

  const completedAssets = await assetsCol
    .find({ ownerEntityId: profileId, status: "completed", assetType: "image" } as any)
    .toArray();

  if (completedAssets.length === 0) return;

  // Heuristic ranking:
  // 1. Prefer og:image or twitter:image
  // 2. Prefer larger images (width * height)
  // 3. Fallback to others
  const sorted = completedAssets.sort((a, b) => {
    const aIsOg = a.discoveredFrom?.includes("og:") || a.discoveredFrom?.includes("twitter:");
    const bIsOg = b.discoveredFrom?.includes("og:") || b.discoveredFrom?.includes("twitter:");
    if (aIsOg && !bIsOg) return -1;
    if (!aIsOg && bIsOg) return 1;

    const aSize = (a.width || 0) * (a.height || 0);
    const bSize = (b.width || 0) * (b.height || 0);
    return bSize - aSize;
  });

  const bestAsset = sorted[0];

  await profilesCol.updateOne(
    { _id: new ObjectId(profileId) } as any,
    {
      $set: {
        profileImageAssetId: bestAsset._id?.toString(),
        updatedAt: new Date(),
      },
    }
  );
}
