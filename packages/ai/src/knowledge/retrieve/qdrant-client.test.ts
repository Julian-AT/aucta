import { describe, expect, it, vi, beforeEach } from "vitest";
import { ensureCollection } from "./qdrant-client.js";

function createMockQdrantClient() {
  return {
    getCollections: vi.fn(),
    createCollection: vi.fn().mockResolvedValue(undefined),
    createPayloadIndex: vi.fn().mockResolvedValue(undefined),
  };
}

describe("ensureCollection", () => {
  let client: ReturnType<typeof createMockQdrantClient>;

  beforeEach(() => {
    client = createMockQdrantClient();
  });

  it("skips creation when collection already exists", async () => {
    client.getCollections.mockResolvedValue({
      collections: [{ name: "knowledge_articles" }],
    });

    await ensureCollection(client as any);

    expect(client.getCollections).toHaveBeenCalled();
    expect(client.createCollection).not.toHaveBeenCalled();
  });

  it("creates collection with correct vector config when missing", async () => {
    client.getCollections.mockResolvedValue({ collections: [] });

    await ensureCollection(client as any);

    expect(client.createCollection).toHaveBeenCalledWith(
      "knowledge_articles",
      expect.objectContaining({
        vectors: {
          dense: {
            size: 3072,
            distance: "Cosine",
          },
        },
        sparse_vectors: {
          sparse: {
            modifier: "idf",
          },
        },
      }),
    );
  });

  it("creates payload indexes for 5 fields after collection creation", async () => {
    client.getCollections.mockResolvedValue({ collections: [] });

    await ensureCollection(client as any);

    expect(client.createPayloadIndex).toHaveBeenCalledTimes(5);

    const indexedFields = client.createPayloadIndex.mock.calls.map(
      (call: unknown[]) => (call[1] as { field_name: string }).field_name,
    );
    expect(indexedFields).toEqual([
      "org_id",
      "confidence_level",
      "equipment_brand",
      "equipment_model",
      "category",
    ]);
  });

  it("does not create payload indexes when collection exists", async () => {
    client.getCollections.mockResolvedValue({
      collections: [{ name: "knowledge_articles" }],
    });

    await ensureCollection(client as any);

    expect(client.createPayloadIndex).not.toHaveBeenCalled();
  });
});
