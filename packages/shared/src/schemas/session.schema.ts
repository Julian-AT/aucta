import { z } from "zod";

export const SessionStatus = z.enum([
  "connecting",
  "active",
  "completed",
  "failed",
  "timeout",
  "abandoned",
]);

export type SessionStatus = z.infer<typeof SessionStatus>;

export const SessionDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  userId: z.string(),
  status: SessionStatus,
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
  durationMs: z.number().int().nullable(),
  modelVersion: z.string().nullable(),
  languageDetected: z.string().nullable(),
  tokenCountInput: z.number().int().nullable(),
  tokenCountOutput: z.number().int().nullable(),
  feedbackRating: z.number().int().min(1).max(5).nullable(),
  feedbackNote: z.string().nullable(),
  summary: z.string().nullable(),
  isAiGenerated: z.boolean(),
  toolsUsed: z.array(z.string()).nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type SessionDTO = z.infer<typeof SessionDTO>;

export const CreateSessionDTO = z.object({
  orgId: z.string(),
  userId: z.string(),
  modelVersion: z.string().optional(),
});

export type CreateSessionDTO = z.infer<typeof CreateSessionDTO>;

export const UpdateSessionDTO = z.object({
  status: SessionStatus.optional(),
  endedAt: z.coerce.date().optional(),
  durationMs: z.number().int().optional(),
  languageDetected: z.string().optional(),
  tokenCountInput: z.number().int().optional(),
  tokenCountOutput: z.number().int().optional(),
  toolsUsed: z.array(z.string()).optional(),
});

export type UpdateSessionDTO = z.infer<typeof UpdateSessionDTO>;

export const FeedbackInputDTO = z.object({
  rating: z.number().int().min(1).max(5),
  note: z.string().optional(),
});

export type FeedbackInputDTO = z.infer<typeof FeedbackInputDTO>;

export const SessionSummaryDTO = z.object({
  id: z.string(),
  summary: z.string(),
  isAiGenerated: z.boolean(),
  updatedAt: z.coerce.date(),
});

export type SessionSummaryDTO = z.infer<typeof SessionSummaryDTO>;
