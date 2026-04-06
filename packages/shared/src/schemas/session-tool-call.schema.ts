import { z } from "zod";

export const SessionToolCallDTO = z.object({
  id: z.string(),
  sessionId: z.string(),
  toolName: z.string(),
  input: z.unknown().nullable(),
  output: z.unknown().nullable(),
  durationMs: z.number().int().nullable(),
  success: z.boolean(),
  errorMessage: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type SessionToolCallDTO = z.infer<typeof SessionToolCallDTO>;

export const CreateSessionToolCallDTO = z.object({
  sessionId: z.string(),
  toolName: z.string(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  durationMs: z.number().int().optional(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
});

export type CreateSessionToolCallDTO = z.infer<typeof CreateSessionToolCallDTO>;
