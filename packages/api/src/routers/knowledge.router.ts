import { z } from "zod";
import { router } from "../trpc.js";
import { orgProcedure } from "../middleware/org-scope.js";
import { errorConverter } from "../middleware/error-converter.js";
import { KnowledgeArticleRepository } from "@aucta/db/repositories/knowledge-article.repository";
import { KnowledgeLinkRepository } from "@aucta/db/repositories/knowledge-link.repository";
import { KnowledgeVerificationRepository } from "@aucta/db/repositories/knowledge-verification.repository";
import { db } from "@aucta/db/client";
import { KnowledgeService } from "../services/knowledge.service.js";

const knowledgeService = new KnowledgeService({
  articleRepo: new KnowledgeArticleRepository(db),
  linkRepo: new KnowledgeLinkRepository(db),
  verificationRepo: new KnowledgeVerificationRepository(db),
});

const categoryEnum = z.enum([
  "equipment",
  "procedure",
  "safety",
  "regulatory",
  "troubleshooting",
]);

export const knowledgeRouter = router({
  create: orgProcedure
    .use(errorConverter)
    .input(
      z.object({
        title: z.string().min(1).max(500),
        contentMd: z.string().min(1),
        category: categoryEnum,
        equipmentBrand: z.string().optional(),
        equipmentModel: z.string().optional(),
        procedureType: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return knowledgeService.createArticle(ctx.orgId, ctx.userId, input);
    }),

  update: orgProcedure
    .use(errorConverter)
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(500).optional(),
        contentMd: z.string().min(1).optional(),
        category: categoryEnum.optional(),
        equipmentBrand: z.string().optional(),
        equipmentModel: z.string().optional(),
        procedureType: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return knowledgeService.updateArticle(ctx.orgId, id, data);
    }),

  list: orgProcedure
    .use(errorConverter)
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          equipmentBrand: z.string().optional(),
          category: categoryEnum.optional(),
          confidenceLevel: z
            .enum([
              "unverified",
              "technician_reviewed",
              "expert_approved",
              "manufacturer_sourced",
            ])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return knowledgeService.listArticles(ctx.orgId, input);
    }),

  getById: orgProcedure
    .use(errorConverter)
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return knowledgeService.getArticleById(ctx.orgId, input.id);
    }),

  healthCheck: orgProcedure
    .use(errorConverter)
    .query(async ({ ctx }) => {
      return knowledgeService.healthCheck(ctx.orgId);
    }),

  submitReview: orgProcedure
    .use(errorConverter)
    .input(
      z.object({
        articleId: z.string(),
        status: z.enum(["approved", "rejected", "needs_revision"]),
        reviewerNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return knowledgeService.submitReview(ctx.orgId, ctx.userId, input);
    }),

  getPendingReviews: orgProcedure
    .use(errorConverter)
    .query(async ({ ctx }) => {
      return knowledgeService.getPendingReviews(ctx.orgId);
    }),

  getReviewsByArticle: orgProcedure
    .use(errorConverter)
    .input(z.object({ articleId: z.string() }))
    .query(async ({ ctx, input }) => {
      return knowledgeService.getReviewsByArticle(ctx.orgId, input.articleId);
    }),
});
