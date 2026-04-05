import { z } from "zod";

export const ConfidenceLevel = z.enum([
  "unverified",
  "technician_reviewed",
  "expert_approved",
  "manufacturer_sourced",
]);

export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

export const ArticleCategory = z.enum([
  "equipment",
  "procedure",
  "safety",
  "regulatory",
  "troubleshooting",
]);

export type ArticleCategory = z.infer<typeof ArticleCategory>;

export const ArticleSourceType = z.enum(["session", "manual", "feedback"]);

export type ArticleSourceType = z.infer<typeof ArticleSourceType>;

export const KnowledgeArticleDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  contentMd: z.string(),
  category: ArticleCategory,
  equipmentBrand: z.string().nullable(),
  equipmentModel: z.string().nullable(),
  procedureType: z.string().nullable(),
  confidenceLevel: ConfidenceLevel,
  sourceType: ArticleSourceType,
  sourceSessionIds: z.array(z.string()).nullable(),
  tags: z.array(z.string()).nullable(),
  version: z.number().int(),
  previousVersionId: z.string().nullable(),
  embeddingId: z.string().nullable(),
  embeddingModel: z.string().nullable(),
  wordCount: z.number().int().nullable(),
  retrievalCount: z.number().int(),
  lastRetrievedAt: z.coerce.date().nullable(),
  isAiGenerated: z.boolean(),
  createdBy: z.string().nullable(),
  verifiedBy: z.string().nullable(),
  verifiedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type KnowledgeArticleDTO = z.infer<typeof KnowledgeArticleDTO>;

export const CreateKnowledgeArticleDTO = z.object({
  orgId: z.string(),
  title: z.string(),
  contentMd: z.string(),
  category: ArticleCategory,
  equipmentBrand: z.string().optional(),
  equipmentModel: z.string().optional(),
  procedureType: z.string().optional(),
  confidenceLevel: ConfidenceLevel.default("unverified"),
  sourceType: ArticleSourceType,
  sourceSessionIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isAiGenerated: z.boolean().default(true),
  createdBy: z.string().optional(),
});

export type CreateKnowledgeArticleDTO = z.infer<typeof CreateKnowledgeArticleDTO>;

export const UpdateKnowledgeArticleDTO = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  contentMd: z.string().optional(),
  category: ArticleCategory.optional(),
  equipmentBrand: z.string().optional(),
  equipmentModel: z.string().optional(),
  procedureType: z.string().optional(),
  confidenceLevel: ConfidenceLevel.optional(),
  tags: z.array(z.string()).optional(),
  version: z.number().int().optional(),
});

export type UpdateKnowledgeArticleDTO = z.infer<typeof UpdateKnowledgeArticleDTO>;
