import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { vaultItems } from "@/core/db/collections";
import { getLocalMediaRoot } from "@/core/config/storage";
import path from "path";
import fs from "fs";
import exifr from "exifr";
import { aiService } from "@/core/ai/service";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { force, useAI } = await req.json().catch(() => ({}));
  const col = await vaultItems();
  
  const query: any = { userId, type: "image" };
  if (!force && !useAI) {
    query.$or = [
      { "metadata.lat": { $exists: false } },
      { "metadata.lat": null }
    ];
  }

  const items = await col.find(query).toArray();

  console.log(`[Maintenance] Rescanning for ${items.length} items (useAI: ${useAI})`);

  let updatedCount = 0;
  const logs: string[] = [];

  for (const item of items) {
    if (!item.storagePath.startsWith("http")) {
       try {
          const decodedPath = decodeURIComponent(item.storagePath);
          const relativePath = decodedPath.replace(/^\/api\/media\//, "");
          const physicalPath = path.join(getLocalMediaRoot(), relativePath);

          console.log(`[Maintenance] Processing: ${item.originalFilename}`);
          console.log(`[Maintenance] PhysicalPath: ${physicalPath}`);

          if (!fs.existsSync(physicalPath)) {
            console.error(`[Maintenance] File NOT found at: ${physicalPath}`);
            logs.push(`File missing: ${item.originalFilename}`);
            continue;
          }

          // Read into buffer - more reliable for exifr in Node
          const fileBuffer = fs.readFileSync(physicalPath);
          console.log(`[Maintenance] Read buffer: ${fileBuffer.length} bytes`);

          let lat: number | undefined;
          let lng: number | undefined;
          let source = "none";

          // 1. Try dedicated GPS method first
          console.log(`[Maintenance] Attempting exifr.gps with buffer...`);
          const gps = await exifr.gps(fileBuffer).catch(err => {
            console.error(`[Maintenance] exifr.gps error:`, err.message);
            return null;
          });
          
          if (gps && gps.latitude && gps.longitude) {
            lat = gps.latitude;
            lng = gps.longitude;
            source = "exif";
            console.log(`[Maintenance] Success! Found via exifr.gps: ${lat}, ${lng}`);
          } else {
            console.log(`[Maintenance] exifr.gps found nothing. Trying full parse with buffer...`);
            const exif = await exifr.parse(fileBuffer, true).catch(() => ({}));
            console.log(`[Maintenance] Full parse keys: ${Object.keys(exif || {}).join(', ')}`);
            
            let latRaw = exif?.latitude ?? exif?.GPSLatitude;
            let lngRaw = exif?.longitude ?? exif?.GPSLongitude;

            if (latRaw && lngRaw) {
              lat = Number(Array.isArray(latRaw) ? latRaw[0] + (latRaw[1]||0)/60 + (latRaw[2]||0)/3600 : latRaw);
              lng = Number(Array.isArray(lngRaw) ? lngRaw[0] + (lngRaw[1]||0)/60 + (lngRaw[2]||0)/3600 : lngRaw);
              if (!isNaN(lat)) {
                source = "exif";
                console.log(`[Maintenance] Success! Found via full parse: ${lat}, ${lng}`);
              }
            }
          }

          logs.push(`${item.originalFilename}: PhysicalPath=${physicalPath} | Lat: ${lat} | Source: ${source}`);

          // 2. Try Sidecar
          if ((!lat || isNaN(lat)) && !item.storagePath.startsWith("http")) {
            const sidecarPath = physicalPath + ".metadata.json";
            if (fs.existsSync(sidecarPath)) {
              try {
                const sidecar = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
                const sLat = Number(sidecar?.platformMetadata?.geoData?.latitude ?? sidecar?.platformMetadata?.location?.latitude);
                const sLng = Number(sidecar?.platformMetadata?.geoData?.longitude ?? sidecar?.platformMetadata?.location?.longitude);
                if (!isNaN(sLat) && !isNaN(sLng) && sLat !== 0) {
                  lat = sLat;
                  lng = sLng;
                  source = "sidecar";
                }
              } catch (e) {
                // ignore
              }
            }
          }

          // 3. AI Fallback
          if ((!lat || isNaN(lat)) && useAI) {
            const buffer = fs.readFileSync(physicalPath);
            const ext = path.extname(physicalPath).toLowerCase();
            const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
            
            const estimation = await aiService.estimateCoordinates(buffer, mimeType);
            if (estimation && estimation.confidence > 0.3) {
              lat = estimation.lat;
              lng = estimation.lng;
              source = "ai";
            }
          }

          if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
             console.log(`[Maintenance] SAVING coordinates for ${item.originalFilename}: ${lat}, ${lng} (Source: ${source})`);
             await col.updateOne(
               { _id: item._id },
               { 
                 $set: { 
                   "metadata.lat": lat, 
                   "metadata.lng": lng,
                   "metadata.locationSource": source,
                   updatedAt: new Date()
                 } 
               }
             );
             updatedCount++;
             logs.push(`${item.originalFilename}: Updated from ${source}`);
          } else {
             console.warn(`[Maintenance] NO coordinates found for ${item.originalFilename} (Final Lat: ${lat})`);
          }
       } catch (err: any) {
          logs.push(`Error ${item.originalFilename}: ${err.message}`);
       }
    }
  }

  return NextResponse.json({ 
    success: true, 
    scanned: items.length, 
    updated: updatedCount,
    logs: logs.slice(0, 50)
  });
}
