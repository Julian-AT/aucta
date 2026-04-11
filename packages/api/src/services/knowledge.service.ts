import type { KnowledgeArticleRepository } from "@aucta/db/repositories/knowledge-article.repository";
import type { KnowledgeLinkRepository } from "@aucta/db/repositories/knowledge-link.repository";
import type { KnowledgeVerificationRepository } from "@aucta/db/repositories/knowledge-verification.repository";
import {
  GeminiEmbeddingService,
  createQdrantClient,
  QDRANT_CONFIG,
  EMBEDDING_CONFIG,
  runHealthCheck,
} from "@aucta/ai/knowledge";
import { generateLinks } from "@aucta/ai/knowledge/compile/linker";
import { ErrorWithCode } from "@aucta/shared/utils/errors";
import { logger } from "@aucta/shared/utils/logger";
import type { KnowledgeArticleDTO } from "@aucta/shared/schemas/knowledge-article.schema";

interface KnowledgeServiceDeps {
  articleRepo: KnowledgeArticleRepository;
  linkRepo: KnowledgeLinkRepository;
  verificationRepo: KnowledgeVerificationRepository;
}

export class KnowledgeService {
  private readonly articleRepo: KnowledgeArticleRepository;
  private readonly linkRepo: KnowledgeLinkRepository;
  private readonly verificationRepo: KnowledgeVerificationRepository;

  constructor(deps: KnowledgeServiceDeps) {
    this.articleRepo = deps.articleRepo;
    this.linkRepo = deps.linkRepo;
    this.verificationRepo = deps.verificationRepo;
  }

  async createArticle(
    orgId: string,
    userId: string,
    input: {
      title: string;
      contentMd: string;
      category: "equipment" | "procedure" | "safety" | "regulatory" | "troubleshooting";
      equipmentBrand?: string;
      equipmentModel?: string;
      procedureType?: string;
      tags?: string[];
    },
  ) {
    const article = await this.articleRepo.create({
      orgId,
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
      createdBy: userId,
    });

    const embedded = await this.embedAndUpsert(article);
    if (!embedded) {
      logger.warn("article_created_without_embedding", { articleId: article.id });
    }

    await generateLinks(
      { articleRepo: this.articleRepo, linkRepo: this.linkRepo },
      article.id,
      orgId,
    );

    return article;
  }

  async updateArticle(
    orgId: string,
    id: string,
    data: {
      title?: string;
      contentMd?: string;
      category?: "equipment" | "procedure" | "safety" | "regulatory" | "troubleshooting";
      equipmentBrand?: string;
      equipmentModel?: string;
      procedureType?: string;
      tags?: string[];
    },
  ) {
    const existing = await this.articleRepo.findById(id);
    if (!existing) throw ErrorWithCode.NotFound(`Article ${id} not found`);
    if (existing.orgId !== orgId) throw ErrorWithCode.Forbidden("Cross-org access denied");

    const updated = await this.articleRepo.update(id, data);

    await this.embedAndUpsert(updated);
    await generateLinks(
      { articleRepo: this.articleRepo, linkRepo: this.linkRepo },
      updated.id,
      orgId,
    );

    return updated;
  }

  async listArticles(
    orgId: string,
    filters?: {
      limit?: number;
      offset?: number;
      equipmentBrand?: string;
      category?: string;
      confidenceLevel?: string;
    },
  ) {
    return this.articleRepo.findByOrgFiltered(orgId, {
      limit: filters?.limit ?? 20,
      offset: filters?.offset ?? 0,
      equipmentBrand: filters?.equipmentBrand,
      category: filters?.category,
      confidenceLevel: filters?.confidenceLevel,
    });
  }

  async getArticleById(orgId: string, id: string) {
    const article = await this.articleRepo.findById(id);
    if (!article) throw ErrorWithCode.NotFound(`Article ${id} not found`);
    if (article.orgId !== orgId) throw ErrorWithCode.Forbidden("Cross-org access denied");
    return article;
  }

  async healthCheck(orgId: string) {
    return runHealthCheck(
      {
        findStaleArticles: (oId, days) => this.articleRepo.findStaleArticles(oId, days),
        findCoverageGaps: (oId) => this.articleRepo.findCoverageGaps(oId),
        findConflictingArticles: (oId) => this.articleRepo.findConflictingArticles(oId),
      },
      orgId,
    );
  }

  async submitReview(
    orgId: string,
    userId: string,
    input: {
      articleId: string;
      status: "approved" | "rejected" | "needs_revision";
      reviewerNotes?: string;
    },
  ) {
    const article = await this.articleRepo.findById(input.articleId);
    if (!article) throw ErrorWithCode.NotFound(`Article ${input.articleId} not found`);
    if (article.orgId !== orgId) throw ErrorWithCode.Forbidden("Cross-org access denied");

    const verification = await this.verificationRepo.create({
      articleId: input.articleId,
      orgId,
      reviewerId: userId,
      status: input.status,
      reviewerNotes: input.reviewerNotes,
    });

    if (input.status === "approved") {
      const newLevel =
        article.confidenceLevel === "unverified"
          ? "technician_reviewed"
          : article.confidenceLevel === "technician_reviewed"
            ? "expert_approved"
            : article.confidenceLevel;

      if (newLevel !== article.confidenceLevel) {
        const updated = await this.articleRepo.update(article.id, {
          confidenceLevel: newLevel,
        });
        await this.embedAndUpsert(updated);
      }
    }

    return verification;
  }

  async getPendingReviews(orgId: string) {
    return this.verificationRepo.findPendingByOrg(orgId);
  }

  async getReviewsByArticle(orgId: string, articleId: string) {
    const article = await this.articleRepo.findById(articleId);
    if (!article) throw ErrorWithCode.NotFound(`Article ${articleId} not found`);
    if (article.orgId !== orgId) throw ErrorWithCode.Forbidden("Cross-org access denied");
    return this.verificationRepo.findByArticleId(articleId);
  }

  private async embedAndUpsert(article: KnowledgeArticleDTO): Promise<boolean> {
    const apiKey = process.env.GEMINI_API_KEY;
    const qdrantUrl = process.env.QDRANT_URL;
    if (!apiKey || !qdrantUrl) {
      logger.warn("embed_skipped", {
        articleId: article.id,
        reason: "GEMINI_API_KEY or QDRANT_URL not configured",
      });
      return false;
    }

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
            vector: { [QDRANT_CONFIG.DENSE_VECTOR_NAME]: denseVector },
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

      await this.articleRepo.updateEmbedding(article.id, article.id, EMBEDDING_CONFIG.MODEL);
      return true;
    } catch (err) {
      logger.error("embed_failed", {
        articleId: article.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      return false;
    }
  }
}
