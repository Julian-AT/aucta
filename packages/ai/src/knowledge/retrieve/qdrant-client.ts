import { QdrantClient } from "@qdrant/js-client-rest";
import { QDRANT_CONFIG, EMBEDDING_CONFIG } from "../core/constants.js";

export interface QdrantClientConfig {
  url: string;
  apiKey?: string;
}

export function createQdrantClient(config: QdrantClientConfig): QdrantClient {
  return new QdrantClient({
    url: config.url,
    apiKey: config.apiKey,
  });
}

export async function ensureCollection(client: QdrantClient): Promise<void> {
  const collections = await client.getCollections();
  const exists = collections.collections.some(
    (c) => c.name === QDRANT_CONFIG.COLLECTION_NAME,
  );

  if (exists) return;

  await client.createCollection(QDRANT_CONFIG.COLLECTION_NAME, {
    vectors: {
      [QDRANT_CONFIG.DENSE_VECTOR_NAME]: {
        size: EMBEDDING_CONFIG.DIMENSIONS,
        distance: "Cosine",
      },
    },
    sparse_vectors: {
      [QDRANT_CONFIG.SPARSE_VECTOR_NAME]: {
        modifier: "idf",
      },
    },
  });

  const indexFields = [
    { field_name: "org_id", field_schema: "keyword" as const },
    { field_name: "confidence_level", field_schema: "keyword" as const },
    { field_name: "equipment_brand", field_schema: "keyword" as const },
    { field_name: "equipment_model", field_schema: "keyword" as const },
    { field_name: "category", field_schema: "keyword" as const },
  ];

  for (const idx of indexFields) {
    await client.createPayloadIndex(QDRANT_CONFIG.COLLECTION_NAME, idx);
  }
}
