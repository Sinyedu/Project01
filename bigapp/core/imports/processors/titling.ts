import fs from "fs";
import path from "path";
import { memoryBundles, records } from "@/core/db/collections";
import { aiService } from "@/core/ai/service";
import { ObjectId } from "mongodb";
import { format } from "date-fns";

/**
 * Step 4: Auto-title each bundle with AI
 */
export async function autoTitleBundles(userId: string) {
  const bundleCol = await memoryBundles();
  const recordCol = await records();
  
  const bundles = await bundleCol.find({ userId, title: null }).toArray();
  let titledCount = 0;

  for (const bundle of bundles) {
    try {
      // 1. Get cover image record
      const record = await recordCol.findOne({ _id: new ObjectId(bundle.coverImageId) });
      if (!record) continue;

      const filePath = (record.data.path as string || record.data.name as string);
      if (!filePath) continue;

      const baseDir = process.env.LOCAL_MEDIA_ROOT || path.join(process.cwd(), "public", "media");
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(baseDir, filePath);

      if (!fs.existsSync(absolutePath)) continue;

      // 2. Read image buffer
      const buffer = fs.readFileSync(absolutePath);
      const mimeType = getMimeType(filePath);

      // 3. Generate title with AI
      const dateStr = format(bundle.startDate, "MMMM do, yyyy");
      const title = await aiService.generateTitleForImage(buffer, mimeType, dateStr);

      // 4. Update bundle
      await bundleCol.updateOne(
        { _id: bundle._id },
        { $set: { title, updatedAt: new Date() } }
      );
      
      titledCount++;
    } catch (error) {
      console.error(`Failed to title bundle ${bundle._id}:`, error);
    }
  }

  return titledCount;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".heic": return "image/heic";
    default: return "image/jpeg";
  }
}
