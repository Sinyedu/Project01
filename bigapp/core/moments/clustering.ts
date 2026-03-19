import { profiles, mediaAssets, moments, momentMemberships, records } from "@/core/db";
import { ObjectId } from "mongodb";
import { Moment, MomentMembership, MomentMembershipReasonSchema } from "./schema";

export async function clusterIntoMoments(userId: string) {
  const profilesCol = await profiles();
  const assetsCol = await mediaAssets();
  const momentsCol = await moments();
  const membershipsCol = await momentMemberships();
  const recordsCol = await records();

  // --- 1. Handle Public Web Profiles ---
  const userProfiles = await profilesCol.find({ userId }).toArray();
  for (const profile of userProfiles) {
    const existingMembership = await membershipsCol.findOne({
      userId,
      targetId: profile._id?.toString(),
      targetType: "profile",
    });

    if (existingMembership) continue;

    let moment = await momentsCol.findOne({
      userId,
      $or: [
        { title: profile.displayName },
        { sourceUrls: profile.sourceUrl },
      ]
    });

    if (!moment) {
      const newMoment: Moment = {
        userId,
        title: profile.displayName || profile.title || "Public Profile",
        type: "profile",
        sourceTypes: [profile.source],
        sourceUrls: profile.sourceUrl ? [profile.sourceUrl] : [],
        normalizedEntityIds: [profile._id?.toString()!],
        assetIds: [],
        rawSnapshotIds: profile.provenance ? [profile.provenance] : [],
        snapshotIds: [],
        people: [],
        places: [],
        topics: [],
        tags: [],
        confidence: 1.0,
        clusteringVersion: "1.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await momentsCol.insertOne(newMoment as any);
      moment = { ...newMoment, _id: result.insertedId.toString() };
    } else {
      await momentsCol.updateOne(
        { _id: new ObjectId(moment._id) },
        {
          $addToSet: {
            sourceTypes: profile.source,
            sourceUrls: profile.sourceUrl,
            normalizedEntityIds: profile._id?.toString()!,
            rawSnapshotIds: profile.provenance,
          },
          $set: { updatedAt: new Date() }
        }
      );
    }

    await membershipsCol.insertOne({
      userId,
      momentId: moment._id?.toString()!,
      targetId: profile._id?.toString()!,
      targetType: "profile",
      membershipReason: ["same-source-url"],
      score: 1.0,
      createdAt: new Date(),
    });
  }

  // --- 2. Handle Export Snapshots (Folders) ---
  // Group records by snapshotId to create "Import Folders"
  const userRecords = await recordsCol.find({ userId }).toArray();
  const snapshots = [...new Set(userRecords.map(r => r.snapshotId).filter(Boolean))];

  for (const snapId of snapshots) {
    const existingMembership = await membershipsCol.findOne({
      userId,
      targetId: snapId,
      targetType: "record", // We use snapshotId as a proxy for the batch
    });

    // If we've already clustered this snapshot, skip
    // (In v1 we treat one snapshot = one folder/moment)
    const snapshotRecords = userRecords.filter(r => r.snapshotId === snapId);
    if (snapshotRecords.length === 0) continue;

    let moment = await momentsCol.findOne({
      userId,
      snapshotIds: snapId,
    });

    if (!moment) {
      // Find an account record in this snapshot to name the folder
      const accountRec = snapshotRecords.find(r => r.kind === "account");
      const platform = snapshotRecords[0].platform;
      const date = snapshotRecords[0].createdAt.toLocaleDateString();
      
      const title = accountRec 
        ? `${accountRec.data.displayName || accountRec.data.username} on ${platform}`
        : `${platform.toUpperCase()} Export (${date})`;

      const newMoment: Moment = {
        userId,
        title,
        type: "other",
        sourceTypes: [platform],
        sourceUrls: [],
        normalizedEntityIds: [],
        assetIds: [],
        rawSnapshotIds: [],
        snapshotIds: [snapId!],
        people: accountRec?.data.displayName ? [accountRec.data.displayName as string] : [],
        places: [],
        topics: [],
        tags: ["export", platform],
        confidence: 1.0,
        clusteringVersion: "1.0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await momentsCol.insertOne(newMoment as any);
      moment = { ...newMoment, _id: result.insertedId.toString() };
    }

    // Link every record in this snapshot to the moment
    for (const rec of snapshotRecords) {
      const recMembership = await membershipsCol.findOne({
        userId,
        targetId: rec._id?.toString(),
        targetType: "record",
      });

      if (!recMembership) {
        await membershipsCol.insertOne({
          userId,
          momentId: moment._id?.toString()!,
          targetId: rec._id?.toString()!,
          targetType: "record",
          membershipReason: ["same-external-id"], // Logic: they share the same upload batch
          score: 1.0,
          createdAt: new Date(),
        });
      }
    }
  }

  // --- 3. Handle Assets (Media) ---
  const userAssets = await assetsCol.find({ userId, status: "completed" }).toArray();
  for (const asset of userAssets) {
    if (!asset.ownerEntityId) continue;

    // Find the moment that contains the owner entity (profile or record)
    const parentMembership = await membershipsCol.findOne({
      userId,
      targetId: asset.ownerEntityId,
    });

    if (parentMembership) {
      const existingAssetMembership = await membershipsCol.findOne({
        userId,
        targetId: asset._id?.toString(),
        targetType: "asset",
      });

      if (!existingAssetMembership) {
        await membershipsCol.insertOne({
          userId,
          momentId: parentMembership.momentId,
          targetId: asset._id?.toString()!,
          targetType: "asset",
          membershipReason: ["preferred-og-image"],
          score: 1.0,
          createdAt: new Date(),
        });

        await momentsCol.updateOne(
          { _id: new ObjectId(parentMembership.momentId) },
          {
            $addToSet: { assetIds: asset._id?.toString()! },
            $set: { updatedAt: new Date() }
          }
        );
      }
    }
  }
}
