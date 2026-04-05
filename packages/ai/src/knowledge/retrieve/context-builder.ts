import { CONFIDENCE_ATTRIBUTION } from "../core/constants.js";
import type { KnowledgeSearchResult } from "../core/types.js";
import type { PromptLayer } from "../../prompts/builder.js";

export function getAttributionPhrase(confidenceLevel: string): string {
  return (
    CONFIDENCE_ATTRIBUTION[
      confidenceLevel as keyof typeof CONFIDENCE_ATTRIBUTION
    ] ?? CONFIDENCE_ATTRIBUTION.unverified
  );
}

export function buildKnowledgeContext(
  results: KnowledgeSearchResult[],
): PromptLayer {
  if (results.length === 0) {
    return {
      id: "knowledge-context",
      content: "",
      required: false,
    };
  }

  const formattedResults = results
    .map((r, i) => {
      const equipment = [r.equipmentBrand, r.equipmentModel]
        .filter(Boolean)
        .join(" ");
      return `[${i + 1}] ${r.title}${equipment ? ` (${equipment})` : ""}
Confidence: ${r.attribution}
${r.contentMd}`;
    })
    .join("\n\n---\n\n");

  const content = `KNOWLEDGE BASE RESULTS:
When referencing knowledge base information, naturally attribute the source confidence level to the technician.
Use phrases like "${CONFIDENCE_ATTRIBUTION.expert_approved}" for verified content or "${CONFIDENCE_ATTRIBUTION.unverified}" for unverified observations.

${formattedResults}`;

  return {
    id: "knowledge-context",
    content,
    required: false,
  };
}
