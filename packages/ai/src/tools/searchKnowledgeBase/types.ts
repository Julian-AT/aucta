import { z } from "zod";

export const SearchKBInput = z.object({
  query: z
    .string()
    .describe(
      "Natural language search query describing what knowledge to find (e.g., 'Daikin FTXM25 compressor replacement procedure')",
    ),
  equipmentBrand: z
    .string()
    .optional()
    .describe(
      "Filter by equipment brand (e.g., 'Daikin', 'Mitsubishi Electric')",
    ),
  equipmentModel: z
    .string()
    .optional()
    .describe("Filter by specific equipment model (e.g., 'FTXM25')"),
});

export const SearchKBOutput = z.union([
  z.object({
    found: z.literal(true),
    articles: z.array(
      z.object({
        title: z.string(),
        summary: z.string().nullable(),
        content: z.string(),
        confidenceLevel: z.string(),
        equipmentBrand: z.string().nullable(),
        equipmentModel: z.string().nullable(),
        attribution: z.string(),
      }),
    ),
  }),
  z.object({
    found: z.literal(false),
    message: z.string(),
  }),
]);

export type SearchKBInputType = z.infer<typeof SearchKBInput>;
export type SearchKBOutputType = z.infer<typeof SearchKBOutput>;
