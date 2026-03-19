import fs from "fs";
import path from "path";
import exifr from "exifr";
import { NormalizedRecord } from "@/core/schema/record";

/**
 * Step 2: Extract dates from each file
 */
export async function extractDate(record: NormalizedRecord): Promise<Date> {
  // 1. Instagram JSON metadata (most accurate) - parse creation_timestamp field
  if (record.data.creation_timestamp) {
    const timestamp = Number(record.data.creation_timestamp);
    if (!isNaN(timestamp)) {
      // Instagram uses seconds or milliseconds. 
      // If > 10^12 it's likely ms, else seconds.
      return new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
    }
  }

  // Get file path from record data
  const filePath = (record.data.path as string || record.data.name as string);
  if (!filePath) return record.createdAt || new Date();

  // Construct absolute path for local storage
  const baseDir = process.env.LOCAL_MEDIA_ROOT || path.join(process.cwd(), "public", "media");
  // Assuming filePath is relative to baseDir or a direct match in some platform subfolder
  // For Instagram, it might be like 'instagram/2026/03/...'
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(baseDir, filePath);

  if (fs.existsSync(absolutePath)) {
    // 2. EXIF data
    try {
      const fileBuffer = fs.readFileSync(absolutePath);
      const exifDate = await exifr.parse(fileBuffer, ["DateTimeOriginal"]);
      if (exifDate && exifDate instanceof Date) {
        return exifDate;
      }
    } catch (e) {
      // console.warn(`EXIF extraction failed for ${absolutePath}`, e);
    }

    // 3. Filename (Instagram names files like 20230715_123456.jpg)
    const fileName = path.basename(filePath);
    const dateMatch = fileName.match(/(\d{4})(\d{2})(\d{2})_\d{6}/);
    if (dateMatch) {
      const [_, y, m, d] = dateMatch;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }

    // 4. File system createdAt as last resort
    try {
      const stats = fs.statSync(absolutePath);
      return stats.birthtime || stats.mtime;
    } catch (e) {}
  }

  return record.createdAt || new Date();
}
