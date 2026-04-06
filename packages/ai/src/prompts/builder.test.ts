import { describe, it, expect } from "vitest";
import { buildEffectiveSystemPrompt } from "./builder.js";
import type { PromptLayer } from "./builder.js";
import { coreRolePrompt } from "./core.js";
import { hvacExpertisePrompt } from "./hvac-expertise.js";
import { safetyRulesPrompt } from "./safety.js";

describe("buildEffectiveSystemPrompt", () => {
  it("joins multiple layers with '\\n\\n---\\n\\n' separator", () => {
    const layers: PromptLayer[] = [
      { id: "a", content: "Layer A", required: true },
      { id: "b", content: "Layer B", required: true },
      { id: "c", content: "Layer C", required: true },
    ];
    const result = buildEffectiveSystemPrompt(layers);
    expect(result).toBe("Layer A\n\n---\n\nLayer B\n\n---\n\nLayer C");
  });

  it("filters out empty/whitespace-only layers", () => {
    const layers: PromptLayer[] = [
      { id: "a", content: "Layer A", required: true },
      { id: "empty", content: "   ", required: false },
      { id: "b", content: "Layer B", required: true },
    ];
    const result = buildEffectiveSystemPrompt(layers);
    expect(result).toBe("Layer A\n\n---\n\nLayer B");
  });

  it("trims each layer's content", () => {
    const layers: PromptLayer[] = [
      { id: "a", content: "  Layer A  ", required: true },
      { id: "b", content: "\nLayer B\n", required: true },
    ];
    const result = buildEffectiveSystemPrompt(layers);
    expect(result).toBe("Layer A\n\n---\n\nLayer B");
  });

  it("returns just a single layer's content with no separator", () => {
    const layers: PromptLayer[] = [
      { id: "single", content: "Only layer", required: true },
    ];
    const result = buildEffectiveSystemPrompt(layers);
    expect(result).toBe("Only layer");
  });
});

describe("coreRolePrompt", () => {
  it("contains 'AI system, not a human expert' (COMP-03 / AI Act)", () => {
    expect(coreRolePrompt.content).toContain("AI system, not a human expert");
  });

  it("contains 'friendly' or 'colleague' (D-04 practical colleague tone)", () => {
    const hasCollegueTone =
      coreRolePrompt.content.includes("friendly") ||
      coreRolePrompt.content.includes("colleague");
    expect(hasCollegueTone).toBe(true);
  });

  it("has required: true", () => {
    expect(coreRolePrompt.required).toBe(true);
  });
});

describe("safetyRulesPrompt", () => {
  it("contains 'F-Gas' and '2024/573' (COMP-05)", () => {
    expect(safetyRulesPrompt.content).toContain("F-Gas");
    expect(safetyRulesPrompt.content).toContain("2024/573");
  });

  it("contains 'licensed electrician' (COMP-04 competence boundaries)", () => {
    expect(safetyRulesPrompt.content).toContain("licensed electrician");
  });

  it("contains 'does not replace professional training' (COMP-03)", () => {
    expect(safetyRulesPrompt.content).toContain(
      "does not replace professional training",
    );
  });

  it("contains 'REFUSE' (D-06 refuse + redirect)", () => {
    expect(safetyRulesPrompt.content).toContain("REFUSE");
  });

  it("contains 'low-GWP' (COMP-05 F-Gas alternatives)", () => {
    expect(safetyRulesPrompt.content).toContain("low-GWP");
  });

  it("has required: true", () => {
    expect(safetyRulesPrompt.required).toBe(true);
  });
});

describe("hvacExpertisePrompt", () => {
  it("has required: true", () => {
    expect(hvacExpertisePrompt.required).toBe(true);
  });
});

describe("full assembly with all 3 layers", () => {
  it("produces string containing all critical phrases", () => {
    const result = buildEffectiveSystemPrompt([
      coreRolePrompt,
      hvacExpertisePrompt,
      safetyRulesPrompt,
    ]);

    expect(result).toContain("AI system, not a human expert");
    expect(result).toContain("F-Gas");
    expect(result).toContain("2024/573");
    expect(result).toContain("REFUSE");
    expect(result).toContain("licensed electrician");
    expect(result).toContain("does not replace professional training");
    expect(result).toContain("low-GWP");
    expect(result).toContain("lookupErrorCode");
    expect(result).toContain("logFinding");
  });

  it("separates layers with --- separator", () => {
    const result = buildEffectiveSystemPrompt([
      coreRolePrompt,
      hvacExpertisePrompt,
      safetyRulesPrompt,
    ]);

    const separatorCount = (result.match(/\n\n---\n\n/g) ?? []).length;
    expect(separatorCount).toBe(2);
  });
});
