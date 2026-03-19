import { memoryBundles, records } from "@/core/db/collections";
import { MemoryBundle } from "@/core/schema/memoryBundle";
import { extractDate } from "./dateExtractor";
import { differenceInHours } from "date-fns";
import { NormalizedRecord } from "@/core/schema/record";

/**
 * Step 3: Cluster into memory bundles by date
 */
export async function clusterMediaIntoBundles(userId: string) {
  const col = await records();
  
  // 1. Fetch all non-ignored media records
  const mediaRecords = await col.find({
    userId,
    platform: "instagram",
    tags: { $ne: "ignored" }
  }).toArray();

  if (mediaRecords.length === 0) return 0;

  // 2. Extract dates and attach to records for sorting
  const recordsWithDates = await Promise.all(
    mediaRecords.map(async (record) => ({
      record,
      date: await extractDate(record)
    }))
  );

  // 3. Sort by date ascending
  recordsWithDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 4. Cluster
  const bundles: Partial<MemoryBundle>[] = [];
  let currentBundle: Partial<MemoryBundle> | null = null;

  for (const item of recordsWithDates) {
    if (!currentBundle) {
      currentBundle = createNewBundle(userId, item);
      continue;
    }

    const lastDate = currentBundle.endDate!;
    const gapHours = differenceInHours(item.date, lastDate);

    // If within 24h of each other, or gap < 48h
    // User logic: "Files within 24 hours of each other = same bundle", "Gap > 48h = new bundle"
    // We'll use 48h as the hard break.
    if (gapHours <= 48) {
      currentBundle.mediaIds!.push(item.record._id!.toString());
      currentBundle.endDate = item.date;
      currentBundle.mediaCount!++;
    } else {
      bundles.push(currentBundle);
      currentBundle = createNewBundle(userId, item);
    }
  }

  if (currentBundle) {
    bundles.push(currentBundle);
  }

  // 5. Store in DB
  const bundleCol = await memoryBundles();
  if (bundles.length > 0) {
    // Clear old bundles for this user if we want a fresh start
    await bundleCol.deleteMany({ userId });
    await bundleCol.insertMany(bundles as MemoryBundle[]);
  }

  return bundles.length;
}

function createNewBundle(userId: string, item: { record: NormalizedRecord, date: Date }): Partial<MemoryBundle> {
  return {
    userId,
    startDate: item.date,
    endDate: item.date,
    mediaIds: [item.record._id!.toString()],
    coverImageId: item.record._id!.toString(), // First image is cover
    title: null,
    mediaCount: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
