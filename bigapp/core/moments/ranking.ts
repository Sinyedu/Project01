import { moments, mediaAssets, profiles } from "@/core/db";
import { ObjectId } from "mongodb";

export async function rankAndRefineMoment(momentId: string) {
  const momentsCol = await moments();
  const assetsCol = await mediaAssets();
  const profilesCol = await profiles();

  const moment = await momentsCol.findOne({ _id: new ObjectId(momentId) } as any);
  if (!moment) return;

  // 1. Hero Image Selection
  const allAssets = await assetsCol.find({ _id: { $in: (moment.assetIds || []).map(id => new ObjectId(id)) } as any }).toArray();
  const images = allAssets.filter(a => a.assetType === "image" && a.status === "completed");

  let heroImageAssetId: string | undefined = moment.heroImageAssetId;

  if (images.length > 0) {
    // Heuristic:
    // 1. Prefer og:image candidates
    // 2. Prefer larger valid images
    // 3. Ignore icons
    const sorted = images.sort((a, b) => {
      const aIsOg = a.discoveredFrom?.includes("og:") || a.discoveredFrom?.includes("twitter:");
      const bIsOg = b.discoveredFrom?.includes("og:") || b.discoveredFrom?.includes("twitter:");
      if (aIsOg && !bIsOg) return -1;
      if (!aIsOg && bIsOg) return 1;

      const aSize = (a.width || 0) * (a.height || 0);
      const bSize = (b.width || 0) * (b.height || 0);
      return bSize - aSize;
    });

    heroImageAssetId = sorted[0]._id?.toString();
  }

  // 2. Title & Summary Generation
  let title = moment.title || "Untitled Moment";
  const entityProfiles = await profilesCol.find({ _id: { $in: (moment.normalizedEntityIds || []).map(id => new ObjectId(id)) } as any }).toArray();

  if (entityProfiles.length > 0) {
    const mainProfile = entityProfiles[0];
    title = mainProfile.displayName || mainProfile.title || title;
  }

  const assetCount = moment.assetIds.length;
  const imageCount = images.length;
  const videoCount = allAssets.filter(a => a.assetType === "video" && a.status === "completed").length;
  const sourceCount = moment.sourceTypes.length;

  const startAt = allAssets.reduce((min, a) => (!min || a.createdAt < min ? a.createdAt : min), undefined as Date | undefined);
  const endAt = allAssets.reduce((max, a) => (!max || a.createdAt > max ? a.createdAt : max), undefined as Date | undefined);

  const summary = `${title} is a collection of ${assetCount} assets across ${sourceCount} sources. It contains ${imageCount} images and ${videoCount} videos. Extracted from ${moment.sourceUrls.join(", ")}.`;

  await momentsCol.updateOne(
    { _id: new ObjectId(momentId) } as any,
    {
      $set: {
        title,
        summary,
        heroImageAssetId,
        startAt,
        endAt,
        updatedAt: new Date(),
      }
    }
  );
}
