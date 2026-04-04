import { z } from "zod";

export const FindingCategory = z.enum([
  "safety",
  "maintenance",
  "regulatory",
  "observation",
  "recommendation",
]);

export type FindingCategory = z.infer<typeof FindingCategory>;

export const FindingSeverity = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export type FindingSeverity = z.infer<typeof FindingSeverity>;

export const SessionFindingDTO = z.object({
  id: z.string(),
  sessionId: z.string(),
  category: FindingCategory,
  description: z.string(),
  severity: FindingSeverity,
  equipmentModel: z.string().nullable(),
  manufacturer: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type SessionFindingDTO = z.infer<typeof SessionFindingDTO>;

export const CreateSessionFindingDTO = z.object({
  sessionId: z.string(),
  category: FindingCategory,
  description: z.string(),
  severity: FindingSeverity,
  equipmentModel: z.string().optional(),
  manufacturer: z.string().optional(),
});

export type CreateSessionFindingDTO = z.infer<typeof CreateSessionFindingDTO>;
