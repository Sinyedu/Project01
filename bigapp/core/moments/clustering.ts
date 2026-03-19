import { profiles, mediaAssets, moments, momentMemberships } from "@/core/db";
import { ObjectId } from "mongodb";
import { Moment, MomentMembership, MomentMembershipReasonSchema } from "./schema";

export async function clusterIntoMoments(userId: string) {
  // 1. Collect candidate normalized entities and completed assets
  const profilesCol = await profiles();
  const assetsCol = await mediaAssets();
  const momentsCol = await moments();
  const membershipsCol = await momentMemberships();

  const userProfiles = await profilesCol.find({ userId }).toArray();
  const userAssets = await assetsCol.find({ userId, status: "completed" }).toArray();

  for (const profile of userProfiles) {
    // Basic clustering: group by displayName and sourceUrl
    const existingMembership = await membershipsCol.findOne({
      userId,
      targetId: profile._id?.toString(),
      targetType: "profile",
    });

    if (existingMembership) continue;

    // Try to find an existing moment with same displayName or sourceUrl
    let moment = await momentsCol.findOne({
      userId,
      $or: [
        { title: profile.displayName },
        { sourceUrls: profile.sourceUrl },
        { normalizedEntityIds: profile._id?.toString() }
      ]
    });

    const reasons: (typeof MomentMembershipReasonSchema._type)[] = [];
    if (profile.sourceUrl) reasons.push("same-source-url");
    if (profile.displayName) reasons.push("same-display-name");

    if (!moment) {
      // Create new moment
      const newMoment: Moment = {
        userId,
        title: profile.displayName || profile.title || "Untitled Moment",
        type: "profile",
        sourceTypes: [profile.source],
        sourceUrls: profile.sourceUrl ? [profile.sourceUrl] : [],
        normalizedEntityIds: [profile._id?.toString()!],
        assetIds: [],
        rawSnapshotIds: profile.provenance ? [profile.provenance] : [],
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
      // Update existing moment
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

    // Create membership
    await membershipsCol.insertOne({
      userId,
      momentId: moment._id?.toString()!,
      targetId: profile._id?.toString()!,
      targetType: "profile",
      membershipReason: reasons,
      score: 1.0,
      createdAt: new Date(),
    });

    // Cluster assets belonging to this profile
    const relatedAssets = userAssets.filter(a => a.ownerEntityId === profile._id?.toString());
    for (const asset of relatedAssets) {
      const assetMembership = await membershipsCol.findOne({
        userId,
        targetId: asset._id?.toString(),
        targetType: "asset",
      });

      if (assetMembership) continue;

      await membershipsCol.insertOne({
        userId,
        momentId: moment._id?.toString()!,
        targetId: asset._id?.toString()!,
        targetType: "asset",
        membershipReason: ["same-source-url"],
        score: 1.0,
        createdAt: new Date(),
      });

      await momentsCol.updateOne(
        { _id: new ObjectId(moment._id) },
        {
          $addToSet: { assetIds: asset._id?.toString()! },
          $set: { updatedAt: new Date() }
        }
      );
    }
  }
}
