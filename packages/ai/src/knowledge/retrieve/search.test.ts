import { describe, it, expect, vi, beforeEach } from "vitest";
import { hybridSearch, type HybridSearchDeps } from "./search.js";
import { QDRANT_CONFIG, CONFIDENCE_SCORE_BOOST } from "../core/constants.js";

function createMockDeps(): HybridSearchDeps {
  return {
    qdrantClient: {
      query: vi.fn(),
    } as any,
    embeddingService: {
      embedQuery: vi.fn().mockResolvedValue(new Array(3072).fill(0.1)),
    } as any,
  };
}

const samplePoints = [
  {
    id: "article-1",
    score: 0.95,
    version: 1,
    payload: {
      title: "Daikin FTXM25 Compressor Replacement",
      summary: "Step-by-step compressor replacement guide",
      content_md: "## Steps\n1. Recover refrigerant\n2. Remove compressor",
      confidence_level: "expert_approved",
      equipment_brand: "Daikin",
      equipment_model: "FTXM25",
      procedure_type: "replacement",
      category: "equipment",
      org_id: "org_test",
    },
  },
  {
    id: "article-2",
    score: 0.82,
    version: 1,
    payload: {
      title: "Refrigerant Leak Detection",
      summary: null,
      content_md: "Use electronic leak detector on all joints",
      confidence_level: "unverified",
      equipment_brand: null,
      equipment_model: null,
      procedure_type: null,
      category: "troubleshooting",
      org_id: "org_test",
    },
  },
];

describe("hybridSearch", () => {
  let deps: HybridSearchDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  it("always includes org_id filter in must array (tenant isolation)", async () => {
    (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      points: [],
    });

    await hybridSearch(deps, { query: "compressor", orgId: "org_abc" });

    const callArgs = (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    const filter = callArgs[1].filter;
    expect(filter.must).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "org_id",
          match: { value: "org_abc" },
        }),
      ]),
    );
  });

  it("adds equipment filters when options provide brand and model", async () => {
    (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      points: [],
    });

    await hybridSearch(deps, {
      query: "compressor",
      orgId: "org_abc",
      equipmentBrand: "Daikin",
      equipmentModel: "FTXM25",
    });

    const callArgs = (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    const mustFilters = callArgs[1].filter.must;
    expect(mustFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "equipment_brand",
          match: { value: "Daikin" },
        }),
        expect.objectContaining({
          key: "equipment_model",
          match: { value: "FTXM25" },
        }),
      ]),
    );
  });

  it("maps Qdrant results to KnowledgeSearchResult with attribution", async () => {
    (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      points: samplePoints,
    });

    const results = await hybridSearch(deps, {
      query: "compressor replacement",
      orgId: "org_test",
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: "article-1",
      title: "Daikin FTXM25 Compressor Replacement",
      confidenceLevel: "expert_approved",
      attribution: "Based on verified procedure",
      score: 0.95,
    });
    expect(results[1]).toMatchObject({
      id: "article-2",
      confidenceLevel: "unverified",
      attribution: "Based on unverified observation from a field session",
    });
  });

  it("returns empty array when Qdrant returns no points", async () => {
    (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      points: [],
    });

    const results = await hybridSearch(deps, {
      query: "nonexistent",
      orgId: "org_test",
    });

    expect(results).toEqual([]);
  });

  it("defaults limit to QDRANT_CONFIG.DEFAULT_SEARCH_LIMIT (3)", async () => {
    (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      points: [],
    });

    await hybridSearch(deps, { query: "test", orgId: "org_test" });

    const callArgs = (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    expect(callArgs[1].limit).toBe(QDRANT_CONFIG.DEFAULT_SEARCH_LIMIT);
  });

  it("respects custom limit when provided", async () => {
    (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      points: [],
    });

    await hybridSearch(deps, { query: "test", orgId: "org_test", limit: 5 });

    const callArgs = (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    expect(callArgs[1].limit).toBe(5);
  });

  it("uses prefetch with both dense and BM25 sparse queries", async () => {
    (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      points: [],
    });

    await hybridSearch(deps, { query: "test", orgId: "org_test" });

    const callArgs = (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    const prefetch = callArgs[1].prefetch;

    // BM25 sparse prefetch
    expect(prefetch[0].using).toBe(QDRANT_CONFIG.SPARSE_VECTOR_NAME);

    // Dense vector prefetch
    expect(prefetch[1].using).toBe(QDRANT_CONFIG.DENSE_VECTOR_NAME);
  });

  it("uses RRF fusion in the query with weights", async () => {
    (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      points: [],
    });

    await hybridSearch(deps, { query: "test", orgId: "org_test" });

    const callArgs = (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    const query = callArgs[1].query;
    expect(query).toHaveProperty("rrf");
    expect(query.rrf.weights).toEqual([1.0, 2.0]);
  });

  it("calls embeddingService.embedQuery with the search query", async () => {
    (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      points: [],
    });

    await hybridSearch(deps, { query: "compressor issue", orgId: "org_test" });

    expect(deps.embeddingService.embedQuery).toHaveBeenCalledWith(
      "compressor issue",
    );
  });

  it("ranks verified articles above unverified when RRF scores are equal", async () => {
    const equalScorePoints = [
      {
        id: "unverified-art",
        score: 0.80,
        version: 1,
        payload: {
          title: "Unverified Article",
          summary: null,
          content_md: "Some content",
          confidence_level: "unverified",
          equipment_brand: "Daikin",
          equipment_model: "FTXM25",
          procedure_type: null,
          category: "equipment",
          org_id: "org_test",
        },
      },
      {
        id: "verified-art",
        score: 0.80,
        version: 1,
        payload: {
          title: "Expert Approved Article",
          summary: null,
          content_md: "Some content",
          confidence_level: "expert_approved",
          equipment_brand: "Daikin",
          equipment_model: "FTXM25",
          procedure_type: null,
          category: "equipment",
          org_id: "org_test",
        },
      },
    ];

    (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      points: equalScorePoints,
    });

    const results = await hybridSearch(deps, {
      query: "compressor",
      orgId: "org_test",
    });

    expect(results[0]!.confidenceLevel).toBe("expert_approved");
    expect(results[1]!.confidenceLevel).toBe("unverified");
  });

  it("preserves relevance-dominated ranking when RRF score gap is large", async () => {
    const gappedPoints = [
      {
        id: "high-score-unverified",
        score: 0.95,
        version: 1,
        payload: {
          title: "Highly Relevant Unverified",
          summary: null,
          content_md: "Very relevant content",
          confidence_level: "unverified",
          equipment_brand: "Daikin",
          equipment_model: "FTXM25",
          procedure_type: null,
          category: "equipment",
          org_id: "org_test",
        },
      },
      {
        id: "low-score-verified",
        score: 0.60,
        version: 1,
        payload: {
          title: "Less Relevant Verified",
          summary: null,
          content_md: "Less relevant content",
          confidence_level: "expert_approved",
          equipment_brand: "Daikin",
          equipment_model: "FTXM25",
          procedure_type: null,
          category: "equipment",
          org_id: "org_test",
        },
      },
    ];

    (deps.qdrantClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      points: gappedPoints,
    });

    const results = await hybridSearch(deps, {
      query: "compressor",
      orgId: "org_test",
    });

    expect(results[0]!.confidenceLevel).toBe("unverified");
    expect(results[1]!.confidenceLevel).toBe("expert_approved");
  });

  it("applies correct boost values from CONFIDENCE_SCORE_BOOST", () => {
    expect(CONFIDENCE_SCORE_BOOST.manufacturer_sourced).toBe(0.20);
    expect(CONFIDENCE_SCORE_BOOST.expert_approved).toBe(0.15);
    expect(CONFIDENCE_SCORE_BOOST.technician_reviewed).toBe(0.10);
    expect(CONFIDENCE_SCORE_BOOST.unverified).toBe(0.00);
  });
});
