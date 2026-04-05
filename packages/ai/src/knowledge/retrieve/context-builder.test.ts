import { describe, it, expect } from "vitest";
import { getAttributionPhrase, buildKnowledgeContext } from "./context-builder.js";
import type { KnowledgeSearchResult } from "../core/types.js";

describe("getAttributionPhrase", () => {
  it("returns correct phrase for manufacturer_sourced", () => {
    expect(getAttributionPhrase("manufacturer_sourced")).toBe(
      "Per manufacturer documentation",
    );
  });

  it("returns correct phrase for expert_approved", () => {
    expect(getAttributionPhrase("expert_approved")).toBe(
      "Based on verified procedure",
    );
  });

  it("returns correct phrase for technician_reviewed", () => {
    expect(getAttributionPhrase("technician_reviewed")).toBe(
      "Based on technician-confirmed procedure",
    );
  });

  it("returns correct phrase for unverified", () => {
    expect(getAttributionPhrase("unverified")).toBe(
      "Based on unverified observation from a field session",
    );
  });

  it("falls back to unverified phrase for unknown confidence level", () => {
    expect(getAttributionPhrase("totally_unknown")).toBe(
      "Based on unverified observation from a field session",
    );
  });
});

describe("buildKnowledgeContext", () => {
  const sampleResults: KnowledgeSearchResult[] = [
    {
      id: "1",
      title: "Daikin FTXM25 Compressor Replacement",
      summary: "Step-by-step guide",
      contentMd: "## Steps\n1. Recover refrigerant",
      confidenceLevel: "expert_approved",
      equipmentBrand: "Daikin",
      equipmentModel: "FTXM25",
      procedureType: "replacement",
      category: "equipment",
      score: 0.95,
      attribution: "Based on verified procedure",
    },
    {
      id: "2",
      title: "General Leak Detection",
      summary: null,
      contentMd: "Use electronic leak detector",
      confidenceLevel: "unverified",
      equipmentBrand: null,
      equipmentModel: null,
      procedureType: null,
      category: "troubleshooting",
      score: 0.8,
      attribution: "Based on unverified observation from a field session",
    },
  ];

  it("returns PromptLayer with empty content for no results", () => {
    const layer = buildKnowledgeContext([]);

    expect(layer.id).toBe("knowledge-context");
    expect(layer.content).toBe("");
    expect(layer.required).toBe(false);
  });

  it("returns PromptLayer with KNOWLEDGE BASE RESULTS header", () => {
    const layer = buildKnowledgeContext(sampleResults);

    expect(layer.content).toContain("KNOWLEDGE BASE RESULTS:");
  });

  it("includes formatted results with titles and attribution", () => {
    const layer = buildKnowledgeContext(sampleResults);

    expect(layer.content).toContain("[1] Daikin FTXM25 Compressor Replacement");
    expect(layer.content).toContain("(Daikin FTXM25)");
    expect(layer.content).toContain("Confidence: Based on verified procedure");
    expect(layer.content).toContain("[2] General Leak Detection");
    expect(layer.content).toContain(
      "Confidence: Based on unverified observation from a field session",
    );
  });

  it("includes content from each result", () => {
    const layer = buildKnowledgeContext(sampleResults);

    expect(layer.content).toContain("## Steps\n1. Recover refrigerant");
    expect(layer.content).toContain("Use electronic leak detector");
  });

  it("omits equipment info when brand and model are null", () => {
    const layer = buildKnowledgeContext(sampleResults);

    // Second result has no equipment info, so no parenthetical
    expect(layer.content).toContain("[2] General Leak Detection\n");
  });

  it("sets required to false on the PromptLayer", () => {
    const layer = buildKnowledgeContext(sampleResults);
    expect(layer.required).toBe(false);
  });
});
