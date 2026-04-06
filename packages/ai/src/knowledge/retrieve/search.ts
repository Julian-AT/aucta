import type { QdrantClient } from "@qdrant/js-client-rest";
import type { GeminiEmbeddingService } from "./embeddings.js";
import type {
  KnowledgeSearchResult,
  KnowledgeSearchOptions,
} from "../core/types.js";
import { QDRANT_CONFIG } from "../core/constants.js";
import { getAttributionPhrase } from "./context-builder.js";

export interface HybridSearchDeps {
  qdrantClient: QdrantClient;
  embeddingService: GeminiEmbeddingService;
}

export async function hybridSearch(
  deps: HybridSearchDeps,
  options: KnowledgeSearchOptions,
): Promise<KnowledgeSearchResult[]> {
  const { qdrantClient, embeddingService } = deps;
  const limit = options.limit ?? QDRANT_CONFIG.DEFAULT_SEARCH_LIMIT;

  const denseVector = await embeddingService.embedQuery(options.query);

  // org_id is ALWAYS required for tenant isolation -- never omit this filter
  const mustFilters: Array<{ key: string; match: { value: string } }> = [
    { key: "org_id", match: { value: options.orgId } },
  ];
  if (options.equipmentBrand) {
    mustFilters.push({
      key: "equipment_brand",
      match: { value: options.equipmentBrand },
    });
  }
  if (options.equipmentModel) {
    mustFilters.push({
      key: "equipment_model",
      match: { value: options.equipmentModel },
    });
  }

  // Hybrid query: prefetch dense + BM25, fuse with weighted RRF.
  // Dense weighted higher (2.0) for semantic relevance, sparse (1.0) for keyword recall.
  const results = await qdrantClient.query(QDRANT_CONFIG.COLLECTION_NAME, {
    prefetch: [
      {
        query: {
          text: options.query,
          model: QDRANT_CONFIG.BM25_MODEL,
        },
        using: QDRANT_CONFIG.SPARSE_VECTOR_NAME,
        limit: 20,
      },
      {
        query: denseVector,
        using: QDRANT_CONFIG.DENSE_VECTOR_NAME,
        limit: 20,
      },
    ],
    query: { rrf: { weights: [1.0, 2.0] } },
    filter: { must: mustFilters },
    with_payload: true,
    limit,
  });

  return results.points.map((point) => {
    const payload = (point.payload ?? {}) as Record<string, unknown>;
    const confidenceLevel =
      (payload.confidence_level as string) ?? "unverified";

    return {
      id: String(point.id),
      title: String(payload.title ?? ""),
      summary: payload.summary ? String(payload.summary) : null,
      contentMd: String(payload.content_md ?? ""),
      confidenceLevel:
        confidenceLevel as KnowledgeSearchResult["confidenceLevel"],
      equipmentBrand: payload.equipment_brand
        ? String(payload.equipment_brand)
        : null,
      equipmentModel: payload.equipment_model
        ? String(payload.equipment_model)
        : null,
      procedureType: payload.procedure_type
        ? String(payload.procedure_type)
        : null,
      category: (payload.category as string as KnowledgeSearchResult["category"]) ?? "equipment",
      score: point.score ?? 0,
      attribution: getAttributionPhrase(confidenceLevel),
    };
  });
}
