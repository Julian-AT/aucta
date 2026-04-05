import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateLinks, type LinkerDeps } from "./linker.js";

describe("linker", () => {
  const mockArticleRepo = {
    findById: vi.fn(),
    findByEquipment: vi.fn(),
    create: vi.fn(),
    findByOrgId: vi.fn(),
    update: vi.fn(),
    updateEmbedding: vi.fn(),
    incrementRetrievalCount: vi.fn(),
    findStaleArticles: vi.fn(),
    findBySlug: vi.fn(),
  };

  const mockLinkRepo = {
    create: vi.fn(),
    findByArticleId: vi.fn(),
    deleteByArticleId: vi.fn(),
  };

  const deps: LinkerDeps = {
    articleRepo: mockArticleRepo as unknown as LinkerDeps["articleRepo"],
    linkRepo: mockLinkRepo as unknown as LinkerDeps["linkRepo"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 when article has no equipmentBrand", async () => {
    mockArticleRepo.findById.mockResolvedValue({
      id: "art_001",
      equipmentBrand: null,
      equipmentModel: null,
    });

    const result = await generateLinks(deps, "art_001", "org_1");
    expect(result).toBe(0);
    expect(mockLinkRepo.create).not.toHaveBeenCalled();
  });

  it("returns 0 when article is not found", async () => {
    mockArticleRepo.findById.mockResolvedValue(null);

    const result = await generateLinks(deps, "art_missing", "org_1");
    expect(result).toBe(0);
  });

  it("creates 'related' links for articles with same brand and model", async () => {
    mockArticleRepo.findById.mockResolvedValue({
      id: "art_001",
      equipmentBrand: "Daikin",
      equipmentModel: "FTXM25",
    });

    mockArticleRepo.findByEquipment.mockResolvedValue([
      { id: "art_001", equipmentBrand: "Daikin", equipmentModel: "FTXM25" },
      { id: "art_002", equipmentBrand: "Daikin", equipmentModel: "FTXM25" },
    ]);

    mockLinkRepo.create.mockResolvedValue({
      id: "lnk_001",
      sourceArticleId: "art_001",
      targetArticleId: "art_002",
      linkType: "related",
    });

    const result = await generateLinks(deps, "art_001", "org_1");

    expect(result).toBe(1);
    expect(mockLinkRepo.create).toHaveBeenCalledWith({
      sourceArticleId: "art_001",
      targetArticleId: "art_002",
      linkType: "related",
    });
  });

  it("creates 'reference' links for articles with same brand but different model", async () => {
    mockArticleRepo.findById.mockResolvedValue({
      id: "art_001",
      equipmentBrand: "Daikin",
      equipmentModel: "FTXM25",
    });

    mockArticleRepo.findByEquipment.mockResolvedValue([
      { id: "art_001", equipmentBrand: "Daikin", equipmentModel: "FTXM25" },
      { id: "art_003", equipmentBrand: "Daikin", equipmentModel: "FTXM35" },
    ]);

    mockLinkRepo.create.mockResolvedValue({
      id: "lnk_002",
      sourceArticleId: "art_001",
      targetArticleId: "art_003",
      linkType: "reference",
    });

    const result = await generateLinks(deps, "art_001", "org_1");

    expect(result).toBe(1);
    expect(mockLinkRepo.create).toHaveBeenCalledWith({
      sourceArticleId: "art_001",
      targetArticleId: "art_003",
      linkType: "reference",
    });
  });

  it("skips self-linking", async () => {
    mockArticleRepo.findById.mockResolvedValue({
      id: "art_001",
      equipmentBrand: "Daikin",
      equipmentModel: "FTXM25",
    });

    mockArticleRepo.findByEquipment.mockResolvedValue([
      { id: "art_001", equipmentBrand: "Daikin", equipmentModel: "FTXM25" },
    ]);

    const result = await generateLinks(deps, "art_001", "org_1");

    expect(result).toBe(0);
    expect(mockLinkRepo.create).not.toHaveBeenCalled();
  });

  it("deletes old links before creating new ones (idempotent)", async () => {
    mockArticleRepo.findById.mockResolvedValue({
      id: "art_001",
      equipmentBrand: "Daikin",
      equipmentModel: "FTXM25",
    });

    mockArticleRepo.findByEquipment.mockResolvedValue([
      { id: "art_001", equipmentBrand: "Daikin", equipmentModel: "FTXM25" },
      { id: "art_002", equipmentBrand: "Daikin", equipmentModel: "FTXM25" },
    ]);

    mockLinkRepo.create.mockResolvedValue({});

    await generateLinks(deps, "art_001", "org_1");

    expect(mockLinkRepo.deleteByArticleId).toHaveBeenCalledWith("art_001");
    // deleteByArticleId should be called before create
    const deleteOrder = mockLinkRepo.deleteByArticleId.mock.invocationCallOrder[0]!;
    const createOrder = mockLinkRepo.create.mock.invocationCallOrder[0]!;
    expect(deleteOrder).toBeLessThan(createOrder);
  });
});
