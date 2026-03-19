export interface AIEnrichmentResult {
  summary: string;
  tags: string[];
  entities: string[];
  sentiment?: "positive" | "negative" | "neutral";
}

export interface AIService {
  generateEmbedding(text: string): Promise<number[]>;
  enrichText(text: string): Promise<AIEnrichmentResult>;
}

export class MockAIService implements AIService {
  async generateEmbedding(text: string): Promise<number[]> {
    // Return a random 1536-dim vector (OpenAI size)
    return Array.from({ length: 1536 }, () => Math.random() - 0.5);
  }

  async enrichText(text: string): Promise<AIEnrichmentResult> {
    const tags = ["mock-tag", "demo"];
    if (text.toLowerCase().includes("trip")) tags.push("travel");
    if (text.toLowerCase().includes("food")) tags.push("food");
    
    return {
      summary: `Summary of: ${text.substring(0, 50)}...`,
      tags,
      entities: ["Mock Entity"],
      sentiment: "neutral",
    };
  }
}

// Singleton instance
export const aiService = new MockAIService();
