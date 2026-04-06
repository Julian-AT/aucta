import { z } from "zod";

export const FindingCategory = z.enum([
  "safety",
  "maintenance",
  "regulatory",
  "observation",
  "recommendation",
]);

export const FindingSeverity = z.enum(["low", "medium", "high", "critical"]);

export const LogFindingInput = z.object({
  category: FindingCategory.describe("Category of the finding"),
  description: z
    .string()
    .min(1)
    .max(1000)
    .describe("Detailed description of the finding"),
  severity: FindingSeverity.describe("Severity level of the finding"),
  equipmentModel: z
    .string()
    .optional()
    .describe("Equipment model if identifiable"),
  manufacturer: z
    .string()
    .optional()
    .describe("Equipment manufacturer if identifiable"),
});

export const LogFindingOutput = z.object({
  findingId: z.string(),
  recorded: z.boolean(),
  message: z.string(),
});

export type LogFindingInputType = z.infer<typeof LogFindingInput>;
export type LogFindingOutputType = z.infer<typeof LogFindingOutput>;

export interface Finding {
  id: string;
  category: z.infer<typeof FindingCategory>;
  description: string;
  severity: z.infer<typeof FindingSeverity>;
  equipmentModel?: string;
  manufacturer?: string;
  timestamp: Date;
}
