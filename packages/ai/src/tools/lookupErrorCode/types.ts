import { z } from "zod";

export const LookupErrorCodeInput = z.object({
  manufacturer: z
    .string()
    .describe(
      "Equipment manufacturer name (e.g., Daikin, Mitsubishi Electric, Fujitsu)",
    ),
  errorCode: z
    .string()
    .describe("The error code displayed on the unit (e.g., U4, E3, 01)"),
});

export const LookupErrorCodeOutput = z.union([
  z.object({
    found: z.literal(true),
    manufacturer: z.string(),
    code: z.string(),
    meaning: z.string(),
    severity: z.enum(["low", "medium", "high", "critical"]),
    repairSteps: z.array(z.string()),
    possibleCauses: z.array(z.string()),
    equipmentTypes: z.array(z.string()),
  }),
  z.object({
    found: z.literal(false),
    message: z.string(),
  }),
]);

export type LookupErrorCodeInputType = z.infer<typeof LookupErrorCodeInput>;
export type LookupErrorCodeOutputType = z.infer<typeof LookupErrorCodeOutput>;
