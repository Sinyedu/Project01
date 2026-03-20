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
  estimateCoordinates(imageBuffer: Buffer, mimeType: string): Promise<{ lat: number, lng: number, confidence: number } | null>;
}

export class GeminiAIService implements AIService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }

  /**
   * Tries to get a model using multiple name/version combinations to avoid 404s.
   */
  private async callWithFallback(
    fn: (model: any) => Promise<any>,
    models: { name: string }[] = [
      { name: "gemini-1.5-flash" },
      { name: "gemini-1.5-pro" }
    ]
  ) {
    let lastError = null;
    for (const config of models) {
      try {
        // Use basic SDK call without forced versioning or prefixes
        const model = this.genAI.getGenerativeModel({ model: config.name });
        return await fn(model);
      } catch (err: any) {
        lastError = err;
        console.warn(`AI Fallback: ${config.name} failed: ${err.message}`);
        continue;
      }
    }
    throw lastError;
  }

  async estimateCoordinates(imageBuffer: Buffer, mimeType: string): Promise<{ lat: number, lng: number, confidence: number } | null> {
    const prompt = `Analyze this image and estimate its geographic coordinates (latitude and longitude). 
Look for landmarks, architecture, street signs, flora, or climate cues.
Format the response as a JSON object:
{
  "lat": number,
  "lng": number,
  "confidence": number (0.0 to 1.0)
}
Respond with only the JSON object, no markdown.`;

    try {
      return await this.callWithFallback(async (model) => {
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: imageBuffer.toString("base64"),
              mimeType,
            },
          },
        ]);

        const text = result.response.text().trim().replace(/```json|```/g, "");
        const data = JSON.parse(text);

        if (data.lat && data.lng) {
          return {
            lat: Number(data.lat),
            lng: Number(data.lng),
            confidence: Number(data.confidence || 0.5)
          };
        }
        return null;
      });
    } catch (error) {
      console.error("Failed to estimate coordinates after all fallbacks:", error);
      return null;
    }
  }

  async generateCaptionAndTags(imageBuffer: Buffer, mimeType: string): Promise<{ caption: string, tags: string[] }> {
    const prompt = `Analyze this image and provide:
1. A short, descriptive caption (one sentence).
2. A list of 5-10 relevant tags (comma separated).

Format the response as:
Caption: [caption]
Tags: [tag1, tag2, ...]`;

    try {
      return await this.callWithFallback(async (model) => {
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
      });
    } catch (error) {
      console.error("Failed to generate caption and tags after all fallbacks:", error);
      return { caption: "", tags: [] };
    }
  }

  async generateTitleForImage(imageBuffer: Buffer, mimeType: string, date: string): Promise<string> {
    const prompt = `This is a photo from ${date}. Give this memory a short, warm, descriptive title in 4-6 words. Respond with only the title, no quotes, no extra text.`;

    try {
      return await this.callWithFallback(async (model) => {
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
      });
    } catch (error) {
      console.error("Failed to title image:", error);
      return `Memory from ${date}`;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text) return new Array(768).fill(0);
    
    try {
      // Embeddings usually use v1 stable
      const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" }, { apiVersion: "v1" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
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

    const prompt = `Analyze the provided text and return a JSON object containing:
- summary: A concise 1-sentence summary
- tags: Up to 5 relevant topical keywords
- entities: People, places, or organizations mentioned
- sentiment: "positive", "negative", or "neutral"

Respond with only a valid JSON object, no markdown, no explanation.

Text:
"${text}"`;

    try {
      return await this.callWithFallback(async (model) => {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const content = JSON.parse(response.text().trim().replace(/```json|```/g, ""));

        return {
          summary: content.summary || "",
          tags: Array.isArray(content.tags) ? content.tags : [],
          entities: Array.isArray(content.entities) ? content.entities : [],
          sentiment: content.sentiment || "neutral",
        };
      });
    } catch (error) {
      console.error(`Failed to enrich text:`, error);
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
