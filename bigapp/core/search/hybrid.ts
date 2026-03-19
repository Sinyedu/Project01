import { records } from "@/core/db/collections";
import { aiService } from "@/core/ai/service";
import type { NormalizedRecord } from "@/core/schema/record";

export interface SearchParams {
  query?: string;
  userId: string;
  limit?: number;
  offset?: number;
  tags?: string[];
  platforms?: string[];
  dateRange?: { start?: Date; end?: Date };
}

export interface SearchResult {
  records: NormalizedRecord[];
  total: number;
}

export class HybridSearchService {
  /**
   * Performs a hybrid search (Keyword + Vector + Filters).
   * Note: Vector search requires MongoDB Atlas Search index configuration.
   */
  async search(params: SearchParams): Promise<SearchResult> {
    const { query, userId, limit = 20, offset = 0 } = params;
    const col = await records();

    const pipeline: any[] = [];

    // 1. Vector Search (if query exists)
    // This stage must be first if used.
    if (query) {
      const embedding = await aiService.generateEmbedding(query);
      
      // $vectorSearch syntax (requires Atlas)
      // We comment this out or use a conditional because it fails on standard MongoDB if not configured.
      // For local/dev without Atlas Vector Search, we fallback to regex/text.
      /*
      pipeline.push({
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: embedding,
          numCandidates: 100,
          limit: limit * 2,
        }
      });
      */
    }

    // 2. Match Stage (Filters)
    const match: any = { userId };
    
    if (query) {
      // Fallback text search if vector search isn't active or as hybrid boost
      match.$or = [
        { "data.text": { $regex: query, $options: "i" } },
        { "data.title": { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } }
      ];
    }

    if (params.platforms?.length) {
      match.platform = { $in: params.platforms };
    }

    if (params.tags?.length) {
      match.tags = { $all: params.tags };
    }

    if (params.dateRange) {
      match.sourceTimestamp = {};
      if (params.dateRange.start) match.sourceTimestamp.$gte = params.dateRange.start;
      if (params.dateRange.end) match.sourceTimestamp.$lte = params.dateRange.end;
    }

    pipeline.push({ $match: match });

    // 3. Sort & Pagination
    pipeline.push({ $sort: { sourceTimestamp: -1, createdAt: -1 } });
    pipeline.push({ $skip: offset });
    pipeline.push({ $limit: limit });

    // Execute
    const results = await col.aggregate(pipeline).toArray();
    
    // Total count (separate query for efficiency, or use $facet)
    const total = await col.countDocuments(match);

    return {
      records: results as NormalizedRecord[],
      total,
    };
  }
}

export const searchService = new HybridSearchService();
