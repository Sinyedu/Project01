import { GoogleGenerativeAI } from "@google/generative-ai";

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

export class GeminiAIService implements AIService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text) return Array.from({ length: 768 }, () => 0);
    
    try {
      const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error("Failed to generate embedding with Gemini:", error);
      // Fallback or throw based on desired behavior
      return Array.from({ length: 768 }, () => 0);
    }
  }

  async enrichText(text: string): Promise<AIEnrichmentResult> {
    if (!text) {
      return {
        summary: "",
        tags: [],
        entities: [],
        sentiment: "neutral",
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const prompt = `Analyze the provided text and return a JSON object containing:
- summary: A concise 1-sentence summary
- tags: Up to 5 relevant topical keywords
- entities: People, places, or organizations mentioned
- sentiment: "positive", "negative", or "neutral"

Text:
"${text}"`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const content = JSON.parse(response.text());

      return {
        summary: content.summary || "",
        tags: Array.isArray(content.tags) ? content.tags : [],
        entities: Array.isArray(content.entities) ? content.entities : [],
        sentiment: content.sentiment || "neutral",
      };
    } catch (error) {
      console.error("Failed to enrich text with Gemini:", error);
      return {
        summary: text.substring(0, 100),
        tags: [],
        entities: [],
        sentiment: "neutral",
      };
    }
  }
}

// Singleton instance
export const aiService = new GeminiAIService();
