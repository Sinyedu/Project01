import { moments, aiEnrichments } from "@/core/db";
import { ObjectId } from "mongodb";
import { AIEnrichment } from "./schema";

export async function enrichMomentWithAI(userId: string, momentId: string) {
  const momentsCol = await moments();
  const enrichCol = await aiEnrichments();

  const moment = await momentsCol.findOne({ _id: new ObjectId(momentId) } as any);
  if (!moment) return;

  // Placeholder AI Enrichment Logic (AI-enriched but not AI-dependent)
  // In a real app, we'd call OpenAI/Anthropic/Gemini here.
  
  const enrichment: AIEnrichment = {
    userId,
    targetType: "moment",
    targetId: momentId,
    model: "gemini-1.5-flash",
    modelVersion: "1.0",
    tags: ["AI-enriched", ...(moment.tags || [])],
    entities: {
      people: moment.people || [],
      places: moment.places || [],
      events: [],
      themes: moment.topics || [],
    },
    summary: `(AI) This moment captures content from ${moment.sourceUrls.join(", ")}. It appears to be related to ${moment.title}.`,
    titleSuggestion: `${moment.title} — AI Recap`,
    confidence: 0.95,
    rerunnable: true,
    createdAt: new Date(),
  };

  await enrichCol.updateOne(
    { userId, targetType: "moment", targetId: momentId },
    { $set: enrichment },
    { upsert: true } as any
  );
}
