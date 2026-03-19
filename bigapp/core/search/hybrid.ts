import { records, archives } from "@/core/db/collections";
import { aiService } from "@/core/ai/service";
import type { NormalizedRecord } from "@/core/types/normalized";
import type { ArchiveItem } from "@/core/types/archive";

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
  results: (NormalizedRecord | ArchiveItem)[];
  total: number;
}

export class HybridSearchService {
  /**
   * Performs a hybrid search (Keyword + Vector + Filters) across Records and Archives.
   */
  async search(params: SearchParams): Promise<SearchResult> {
    const { query, userId, limit = 20, offset = 0 } = params;
    
    const recordCol = await records();
    const archiveCol = await archives();

    const embedding = query ? await aiService.generateEmbedding(query) : null;

    const buildPipeline = (isArchive: boolean) => {
      const pipeline: any[] = [];

      // 1. Vector Search
      if (embedding) {
        pipeline.push({
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: embedding,
            numCandidates: 100,
            limit: limit * 2,
          }
        });
      }

      // 2. Match Stage (Filters)
      const match: any = { userId };
      
      if (query && !embedding) {
        // Text fallback if vector isn't supported/ready
        if (isArchive) {
          match.$or = [
            { textContent: { $regex: query, $options: "i" } },
            { title: { $regex: query, $options: "i" } },
            { tags: { $in: [new RegExp(query, "i")] } }
          ];
        } else {
          match.$or = [
            { "data.text": { $regex: query, $options: "i" } },
            { "data.title": { $regex: query, $options: "i" } },
            { tags: { $in: [new RegExp(query, "i")] } }
          ];
        }
      }

      if (params.platforms?.length) {
        match.platform = { $in: params.platforms };
      }

      if (params.tags?.length) {
        match.tags = { $all: params.tags };
      }

      if (params.dateRange) {
        const tsField = isArchive ? "createdAt" : "sourceTimestamp";
        match[tsField] = {};
        if (params.dateRange.start) match[tsField].$gte = params.dateRange.start;
        if (params.dateRange.end) match[tsField].$lte = params.dateRange.end;
      }

      pipeline.push({ $match: match });

      // 3. Pagination
      if (!embedding) {
        pipeline.push({ $sort: { createdAt: -1 } });
      }
      
      pipeline.push({ $skip: offset });
      pipeline.push({ $limit: limit });

      return pipeline;
    };

    const [recordResults, archiveResults, recordCount, archiveCount] = await Promise.all([
      recordCol.aggregate(buildPipeline(false)).toArray(),
      archiveCol.aggregate(buildPipeline(true)).toArray(),
      recordCol.countDocuments({ userId }), // Simple count for now, filters could be added
      archiveCol.countDocuments({ userId }),
    ]);

    // Merge and sort results if not already sorted by vector relevance
    const combined = [...(recordResults as any[]), ...(archiveResults as any[])]
      .sort((a, b) => (b.sourceTimestamp || b.createdAt).getTime() - (a.sourceTimestamp || a.createdAt).getTime())
      .slice(0, limit);

    return {
      results: combined,
      total: recordCount + archiveCount,
    };
  }
}

export const searchService = new HybridSearchService();
