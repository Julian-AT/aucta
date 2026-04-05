import { z } from "zod";

export const VerificationStatus = z.enum([
  "pending",
  "approved",
  "rejected",
  "needs_revision",
]);

export type VerificationStatus = z.infer<typeof VerificationStatus>;

export const KnowledgeVerificationDTO = z.object({
  id: z.string(),
  articleId: z.string(),
  orgId: z.string(),
  reviewerId: z.string(),
  status: VerificationStatus,
  reviewerNotes: z.string().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

export type KnowledgeVerificationDTO = z.infer<typeof KnowledgeVerificationDTO>;

export const CreateKnowledgeVerificationDTO = z.object({
  articleId: z.string(),
  orgId: z.string(),
  reviewerId: z.string(),
  status: VerificationStatus,
  reviewerNotes: z.string().optional(),
});

export type CreateKnowledgeVerificationDTO = z.infer<typeof CreateKnowledgeVerificationDTO>;
