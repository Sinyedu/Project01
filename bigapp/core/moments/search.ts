import { moments, mediaAssets, momentMemberships, aiEnrichments } from "@/core/db";
import { ObjectId } from "mongodb";

export interface MomentSearchQuery {
  userId: string;
  query?: string;
  sourceTypes?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  hasMedia?: boolean;
}

export async function searchMoments(query: MomentSearchQuery) {
  const momentsCol = await moments();
  const assetsCol = await mediaAssets();
  const membershipsCol = await momentMemberships();
  const enrichCol = await aiEnrichments();

  const filter: any = { userId: query.userId };

  if (query.query) {
    filter.$or = [
      { title: { $regex: query.query, $options: "i" } },
      { summary: { $regex: query.query, $options: "i" } },
      { topics: { $in: [new RegExp(query.query, "i")] } },
      { people: { $in: [new RegExp(query.query, "i")] } },
    ];
  }

  if (query.sourceTypes && query.sourceTypes.length > 0) {
    filter.sourceTypes = { $in: query.sourceTypes };
  }

  if (query.dateFrom || query.dateTo) {
    filter.startAt = {};
    if (query.dateFrom) filter.startAt.$gte = query.dateFrom;
    if (query.dateTo) filter.startAt.$lte = query.dateTo;
  }

  const foundMoments = await momentsCol.find(filter).sort({ startAt: -1 }).toArray();

  const results = [];

  for (const moment of foundMoments) {
    const heroImage = moment.heroImageAssetId 
      ? await assetsCol.findOne({ _id: new ObjectId(moment.heroImageAssetId) } as any)
      : null;

    const enrichment = await enrichCol.findOne({ userId: query.userId, targetType: "moment", targetId: moment._id?.toString() });

    // "Why this matched" (grounded explanations)
    const whyMatched = [];
    const memberships = await membershipsCol.find({ momentId: moment._id?.toString() }).toArray();
    
    if (memberships.some(m => m.membershipReason.includes("same-display-name"))) {
      whyMatched.push("Matched via name across sources");
    }
    if (memberships.some(m => m.membershipReason.includes("same-source-url"))) {
      whyMatched.push("Included from the same source link");
    }
    if (moment.tags.length > 0) {
      whyMatched.push(`Includes topics: ${moment.tags.join(", ")}`);
    }

    results.push({
      id: moment._id?.toString(),
      title: moment.title,
      summary: enrichment?.summary || moment.summary,
      heroImage: heroImage?.secureUrl,
      startAt: moment.startAt,
      endAt: moment.endAt,
      sourceTypes: moment.sourceTypes,
      assetCount: moment.assetIds.length,
      people: moment.people,
      topics: moment.topics,
      whyMatched,
      confidence: moment.confidence,
    });
  }

  return results;
}
