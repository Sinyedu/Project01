import { moments } from "@/core/db";
import { clusterIntoMoments } from "./clustering";
import { rankAndRefineMoment } from "./ranking";
import { enrichMomentWithAI } from "./enrichment";

export async function triggerMomentGeneration(userId: string) {
  console.log(`[Moments] Starting generation for user ${userId}`);
  
  // 1. Clustering
  await clusterIntoMoments(userId);

  // 2. Ranking and Refinement
  const momentsCol = await moments();
  const userMoments = await momentsCol.find({ userId }).toArray();

  for (const moment of userMoments) {
    await rankAndRefineMoment(moment._id?.toString()!);
    
    // 3. Optional AI Enrichment
    await enrichMomentWithAI(userId, moment._id?.toString()!);
  }

  console.log(`[Moments] Generation complete for user ${userId}`);
}
