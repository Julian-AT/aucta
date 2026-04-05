import { buildTool } from "../base.js";
import {
  hybridSearch,
  type HybridSearchDeps,
} from "../../knowledge/retrieve/search.js";
import {
  SearchKBInput,
  SearchKBOutput,
  type SearchKBInputType,
  type SearchKBOutputType,
} from "./types.js";

export function createSearchKnowledgeBaseTool(deps: HybridSearchDeps) {
  return buildTool<SearchKBInputType, SearchKBOutputType>({
    name: "searchKnowledgeBase",
    description:
      "Search the organization knowledge base for HVAC procedures, equipment information, troubleshooting guides, and verified knowledge articles",
    inputSchema: SearchKBInput,
    outputSchema: SearchKBOutput,
    isReadOnly: true,
    async call(input, context): Promise<SearchKBOutputType> {
      const results = await hybridSearch(deps, {
        query: input.query,
        orgId: context.orgId,
        equipmentBrand: input.equipmentBrand,
        equipmentModel: input.equipmentModel,
        limit: 3,
      });

      if (results.length === 0) {
        return {
          found: false,
          message:
            "No relevant knowledge articles found in the organization knowledge base. I'll provide guidance based on general HVAC expertise.",
        };
      }

      return {
        found: true,
        articles: results.map((r) => ({
          title: r.title,
          summary: r.summary,
          content: r.contentMd,
          confidenceLevel: r.confidenceLevel,
          equipmentBrand: r.equipmentBrand,
          equipmentModel: r.equipmentModel,
          attribution: r.attribution,
        })),
      };
    },
  });
}
