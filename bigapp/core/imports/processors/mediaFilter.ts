import { records } from "@/core/db/collections";

const MEDIA_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".heic", ".webp",
  ".mp4", ".mov", ".avi"
];

/**
 * Step 1: Filter media files only
 * Scans records for Instagram and keeps only those with media extensions.
 * Marks everything else as ignored.
 */
export async function filterMediaRecords(userId: string) {
  const col = await records();
  
  // We'll process in batches to handle 168k records
  const batchSize = 1000;
  let processedCount = 0;
  
  const cursor = col.find({ 
    userId, 
    platform: "instagram",
    "tags": { $ne: "ignored" } 
  });

  while (await cursor.hasNext()) {
    const batch = [];
    for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
      batch.push(await cursor.next());
    }

    const updates = batch.map(record => {
      if (!record) return null;
      
      const fileName = (record.data.name as string || record.data.path as string || "").toLowerCase();
      const hasMediaExtension = MEDIA_EXTENSIONS.some(ext => fileName.endsWith(ext));
      
      if (hasMediaExtension) {
        return null; // Keep it
      } else {
        return {
          updateOne: {
            filter: { _id: record._id },
            update: { $addToSet: { tags: "ignored" } }
          }
        };
      }
    }).filter(Boolean);

    if (updates.length > 0) {
      await col.bulkWrite(updates as any);
    }
    
    processedCount += batch.length;
    console.log(`Processed ${processedCount} records for filtering...`);
  }

  return processedCount;
}
