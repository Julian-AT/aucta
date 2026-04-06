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
export { hybridSearch } from "./retrieve/search.js";
export type { HybridSearchDeps } from "./retrieve/search.js";
export {
  getAttributionPhrase,
  buildKnowledgeContext,
} from "./retrieve/context-builder.js";
export { extractLearnings } from "./ingest/session-ingester.js";
export type {
  SessionIngestionInput,
  CandidateArticle,
} from "./ingest/session-ingester.js";
export { compileArticle } from "./compile/article-compiler.js";
export type {
  ArticleForCompilation,
  CompiledArticle,
} from "./compile/article-compiler.js";
export { generateLinks } from "./compile/linker.js";
export type { LinkerDeps } from "./compile/linker.js";
export { runHealthCheck } from "./health/health-check.js";
export type { HealthCheckDeps } from "./health/health-check.js";
