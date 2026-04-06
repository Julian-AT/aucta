export const CONFIDENCE_ATTRIBUTION = {
  unverified: "Based on unverified observation from a field session",
  technician_reviewed: "Based on technician-confirmed procedure",
  expert_approved: "Based on verified procedure",
  manufacturer_sourced: "Per manufacturer documentation",
} as const;

export type ConfidenceLevelKey = keyof typeof CONFIDENCE_ATTRIBUTION;

/**
 * Score multiplier boost applied to Qdrant RRF results based on article confidence tier.
 * Applied as: boostedScore = score * (1 + boost).
 * Verified articles rank above unverified when semantic relevance is similar,
 * but a highly relevant unverified article can still outrank a less relevant verified one.
 */
export const CONFIDENCE_SCORE_BOOST: Record<string, number> = {
  manufacturer_sourced: 0.20,
  expert_approved: 0.15,
  technician_reviewed: 0.10,
  unverified: 0.00,
} as const;

export const HEALTH_THRESHOLDS = {
  STALE_DAYS: 90,
  MIN_ARTICLES_PER_MODEL: 1,
} as const;

export const EMBEDDING_CONFIG = {
  MODEL: "gemini-embedding-001",
  DIMENSIONS: 3072,
  MAX_TOKENS: 2048,
  CHARS_PER_TOKEN_ESTIMATE: 4,
} as const;

export const QDRANT_CONFIG = {
  COLLECTION_NAME: "knowledge_articles",
  DENSE_VECTOR_NAME: "dense",
  SPARSE_VECTOR_NAME: "sparse",
  BM25_MODEL: "qdrant/bm25",
  DEFAULT_SEARCH_LIMIT: 3,
} as const;
