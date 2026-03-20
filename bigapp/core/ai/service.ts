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
  generateTitleForImage(imageBuffer: Buffer, mimeType: string, date: string): Promise<string>;
  generateCaptionAndTags(imageBuffer: Buffer, mimeType: string): Promise<{ caption: string, tags: string[] }>;
}

export class GeminiAIService implements AIService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }

  async generateCaptionAndTags(imageBuffer: Buffer, mimeType: string): Promise<{ caption: string, tags: string[] }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Analyze this image and provide:
1. A short, descriptive caption (one sentence).
2. A list of 5-10 relevant tags (comma separated).

Format the response as:
Caption: [caption]
Tags: [tag1, tag2, ...]`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType,
          },
        },
      ]);

      const text = result.response.text().trim();
      const captionMatch = text.match(/Caption:\s*(.*)/i);
      const tagsMatch = text.match(/Tags:\s*(.*)/i);

      const caption = captionMatch ? captionMatch[1].trim() : "";
      const tags = tagsMatch ? tagsMatch[1].split(",").map(t => t.trim()) : [];

      return { caption, tags };
    } catch (error) {
      console.error("Failed to generate caption and tags for image:", error);
      return { caption: "", tags: [] };
    }
  }

  async generateTitleForImage(imageBuffer: Buffer, mimeType: string, date: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `This is a photo from ${date}. Give this memory a short, warm, descriptive title in 4-6 words. Examples: 'Summer beach day with friends', 'Rainy city afternoon walk'. Respond with only the title, no quotes, no extra text.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType,
          },
        },
      ]);

      return result.response.text().trim().replace(/^"(.*)"$/, "$1");
    } catch (error) {
      console.error("Failed to generate title for image:", error);
      return `Memory from ${date}`;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text) return new Array(768).fill(0);
    
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-embedding-exp-03-07"
      });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error("Failed to generate embedding with gemini-embedding-exp-03-07:", error);
      console.warn("Using zero vector fallback to unblock pipeline");
      return new Array(768).fill(0);
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

    const modelsToTry = [
      { name: "models/gemini-2.0-flash-lite", apiVersion: "v1beta" },
      { name: "models/gemini-flash-lite-latest", apiVersion: "v1beta" },
      { name: "models/gemini-1.5-flash", apiVersion: "v1beta" },
      { name: "models/gemini-1.5-flash", apiVersion: "v1" }
    ];

    const prompt = `Analyze the provided text and return a JSON object containing:
- summary: A concise 1-sentence summary
- tags: Up to 5 relevant topical keywords
- entities: People, places, or organizations mentioned
- sentiment: "positive", "negative", or "neutral"

Respond with only a valid JSON object, no markdown, no explanation.

Text:
"${text}"`;

    for (const config of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ 
          model: config.name
        }, { apiVersion: config.apiVersion as any });
        
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
        console.error(`Failed to enrich text with ${config.name} (${config.apiVersion}):`, error);
      }
    }

    // Final fallback
    return {
      summary: text.substring(0, 100),
      tags: [],
      entities: [],
      sentiment: "neutral",
    };
  }
}

// Singleton instance
export const aiService = new GeminiAIService();
