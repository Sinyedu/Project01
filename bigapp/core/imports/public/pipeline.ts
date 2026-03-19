import { rawSnapshots, profiles, mediaAssets } from "@/core/db";
import { parseHtml } from "@/core/parsers/html";
import type { RawSnapshot, NormalizedProfile, MediaAsset } from "@/core/schema/ingest";
import { processMediaCandidate } from "@/core/media/resolution";
import { triggerMomentGeneration } from "@/core/moments/jobs";

/**
 * Public Web Import Pipeline
 * Flow: fetch -> save snapshot -> parse -> normalize -> resolve media -> moments
 */
export async function importPublicUrl(url: string, source: string, userId: string) {
  const rawCol = await rawSnapshots();
  const profilesCol = await profiles();
  const mediaCol = await mediaAssets();

  // 1. Fetch & Snapshot
  const res = await fetch(url, {
    headers: { "User-Agent": "BigAppArchiver/2.0" },
  });
  
  const rawHtml = await res.text();
  const fetchedAt = new Date();

  const snapshot: RawSnapshot = {
    userId,
    source,
    sourceUrl: url,
    fetchedAt,
    httpStatus: res.status,
    rawHtml,
    parserVersion: "1.0.0",
    status: res.ok ? "success" : "failed",
  };

  const snapshotInsert = await rawCol.insertOne(snapshot);

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  // 2. Metadata & Media Extraction
  const { profile: parsedProfile, mediaCandidates } = parseHtml(rawHtml, url);

  // Update snapshot with extracted text
  await rawCol.updateOne(
    { _id: snapshotInsert.insertedId },
    { $set: { extractedText: parsedProfile.extractedText } }
  );

  // 3. Normalization
  const profile: NormalizedProfile = {
    userId,
    source,
    sourceUrl: url,
    ingestionMode: "public_import",
    displayName: parsedProfile.title,
    title: parsedProfile.title,
    description: parsedProfile.description,
    canonicalUrl: parsedProfile.canonicalUrl,
    localeText: parsedProfile.localeText,
    completeness: parsedProfile.title ? 1 : 0,
    provenance: snapshotInsert.insertedId.toString(),
    createdAt: fetchedAt,
    updatedAt: fetchedAt,
  };

  const profileInsert = await profilesCol.insertOne(profile);
  const profileId = profileInsert.insertedId.toString();

  // 4. Save Media Candidates
  const jobs: string[] = [];
  const uniqueUrls = new Set<string>();
  const uniqueCandidates = mediaCandidates.filter((c) => {
    if (uniqueUrls.has(c.sourceUrl)) return false;
    uniqueUrls.add(c.sourceUrl);
    return true;
  });

  if (uniqueCandidates.length > 0) {
    const assetsToInsert: MediaAsset[] = uniqueCandidates.map((c) => ({
      userId,
      ownerEntityId: profileId,
      source,
      sourceUrl: url,
      originalRemoteUrl: c.sourceUrl,
      ingestionMode: "public_import",
      storageProvider: "pending",
      assetType: c.mediaType,
      mimeType: c.mimeType,
      width: c.width,
      height: c.height,
      discoveredFrom: c.discoveredFrom,
      extractionConfidence: 1.0,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await mediaCol.insertMany(assetsToInsert);
    for (const id of Object.values(result.insertedIds)) {
      jobs.push(id.toString());
    }
  }

  // 5. Async Media Resolution
  for (const assetId of jobs) {
    processMediaCandidate(assetId).catch(console.error);
  }

  // 6. Async Moment Generation
  setTimeout(() => {
    triggerMomentGeneration(userId).catch(console.error);
  }, 10000);

  return {
    profileId,
    snapshotId: snapshotInsert.insertedId.toString(),
    mediaCandidatesQueued: jobs.length,
  };
}
