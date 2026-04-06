import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router } from "../trpc.js";
import { orgProcedure } from "../middleware/org-scope.js";
import { errorConverter } from "../middleware/error-converter.js";
import { KnowledgeArticleRepository } from "@aucta/db/repositories/knowledge-article.repository";
import { KnowledgeLinkRepository } from "@aucta/db/repositories/knowledge-link.repository";
import { db } from "@aucta/db/client";
import {
  GeminiEmbeddingService,
  createQdrantClient,
  QDRANT_CONFIG,
  EMBEDDING_CONFIG,
  runHealthCheck,
} from "@aucta/ai/knowledge";
import { generateLinks } from "@aucta/ai/knowledge/compile/linker";
import type { KnowledgeArticleDTO } from "@aucta/shared/schemas/knowledge-article.schema";

const articleRepo = new KnowledgeArticleRepository(db);
const linkRepo = new KnowledgeLinkRepository(db);

export const knowledgeRouter = router({
  create: orgProcedure
    .use(errorConverter)
    .input(
      z.object({
        title: z.string().min(1).max(500),
        contentMd: z.string().min(1),
        category: z.enum([
          "equipment",
          "procedure",
          "safety",
          "regulatory",
          "troubleshooting",
        ]),
        equipmentBrand: z.string().optional(),
        equipmentModel: z.string().optional(),
        procedureType: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const article = await articleRepo.create({
        orgId: ctx.orgId,
        title: input.title,
        contentMd: input.contentMd,
        category: input.category,
        equipmentBrand: input.equipmentBrand,
        equipmentModel: input.equipmentModel,
        procedureType: input.procedureType,
        sourceType: "manual",
        confidenceLevel: "technician_reviewed",
        tags: input.tags,
        isAiGenerated: false,
        createdBy: ctx.userId,
      });

      await embedAndUpsert(article);
      await generateLinks({ articleRepo, linkRepo }, article.id, ctx.orgId);

      return article;
    }),

  update: orgProcedure
    .use(errorConverter)
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(500).optional(),
        contentMd: z.string().min(1).optional(),
        category: z
          .enum([
            "equipment",
            "procedure",
            "safety",
            "regulatory",
            "troubleshooting",
          ])
          .optional(),
        equipmentBrand: z.string().optional(),
        equipmentModel: z.string().optional(),
        procedureType: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await articleRepo.findById(input.id);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Article ${input.id} not found`,
        });
      }
      if (existing.orgId !== ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cross-org access denied",
        });
      }

      const { id, ...updateData } = input;
      const updated = await articleRepo.update(id, updateData);

      await embedAndUpsert(updated);
      await generateLinks({ articleRepo, linkRepo }, updated.id, ctx.orgId);

      return updated;
    }),

  list: orgProcedure
    .use(errorConverter)
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          equipmentBrand: z.string().optional(),
          category: z
            .enum([
              "equipment",
              "procedure",
              "safety",
              "regulatory",
              "troubleshooting",
            ])
            .optional(),
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
      const opts = input ?? {};
      const articles = await articleRepo.findByOrgId(
        ctx.orgId,
        opts.limit ?? 20,
      );

      return articles.filter((a) => {
        if (opts.equipmentBrand && a.equipmentBrand !== opts.equipmentBrand)
          return false;
        if (opts.category && a.category !== opts.category) return false;
        if (opts.confidenceLevel && a.confidenceLevel !== opts.confidenceLevel)
          return false;
        return true;
      });
    }),

  getById: orgProcedure
    .use(errorConverter)
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const article = await articleRepo.findById(input.id);
      if (!article) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Article ${input.id} not found`,
        });
      }
      if (article.orgId !== ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cross-org access denied",
        });
      }

      return article;
    }),

  healthCheck: orgProcedure
    .use(errorConverter)
    .query(async ({ ctx }) => {
      return runHealthCheck(
        {
          findStaleArticles: (orgId, staleDays) =>
            articleRepo.findStaleArticles(orgId, staleDays),
          findCoverageGaps: (orgId) => articleRepo.findCoverageGaps(orgId),
          findConflictingArticles: (orgId) =>
            articleRepo.findConflictingArticles(orgId),
        },
        ctx.orgId,
      );
    }),
});

/**
 * Embed article text and upsert to Qdrant.
 * Silent failure -- article is in Postgres regardless.
 */
async function embedAndUpsert(article: KnowledgeArticleDTO): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  const qdrantUrl = process.env.QDRANT_URL;
  if (!apiKey || !qdrantUrl) return;

  try {
    const embeddingService = new GeminiEmbeddingService({ apiKey });
    const qdrantClient = createQdrantClient({
      url: qdrantUrl,
      apiKey: process.env.QDRANT_API_KEY,
    });

    const embeddingText = `${article.title} ${article.summary ?? ""} ${article.contentMd}`;
    const denseVector = await embeddingService.embedDocument(embeddingText);

    await qdrantClient.upsert(QDRANT_CONFIG.COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: article.id,
          vectors: {
            [QDRANT_CONFIG.DENSE_VECTOR_NAME]: denseVector,
          },
          payload: {
            article_id: article.id,
            org_id: article.orgId,
            confidence_level: article.confidenceLevel,
            equipment_brand: article.equipmentBrand ?? "",
            equipment_model: article.equipmentModel ?? "",
            category: article.category,
            title: article.title,
            summary: article.summary ?? "",
            tags: article.tags ?? [],
          },
        },
      ],
    });

    await articleRepo.updateEmbedding(
      article.id,
      article.id,
      EMBEDDING_CONFIG.MODEL,
    );
  } catch (err) {
    console.error(`Failed to embed article ${article.id}:`, err);
  }
}
