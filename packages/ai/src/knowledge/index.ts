export { GeminiEmbeddingService } from "./retrieve/embeddings.js";
export type { EmbeddingServiceConfig } from "./retrieve/embeddings.js";
export { createQdrantClient, ensureCollection } from "./retrieve/qdrant-client.js";
export type { QdrantClientConfig } from "./retrieve/qdrant-client.js";
export {
  CONFIDENCE_ATTRIBUTION,
  EMBEDDING_CONFIG,
  QDRANT_CONFIG,
  HEALTH_THRESHOLDS,
} from "./core/constants.js";
export type {
  KnowledgeSearchResult,
  KnowledgeSearchOptions,
  HealthCheckResult,
} from "./core/types.js";
