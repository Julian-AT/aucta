import { KnowledgeArticleRepository } from "@aucta/db/repositories/knowledge-article.repository";
import { KnowledgeVerificationRepository } from "@aucta/db/repositories/knowledge-verification.repository";
import { SessionRepository } from "@aucta/db/repositories/session.repository";
import { GeminiEmbeddingService } from "@aucta/ai/knowledge";
import { createQdrantClient } from "@aucta/ai/knowledge";
import { QDRANT_CONFIG, EMBEDDING_CONFIG } from "@aucta/ai/knowledge";
import { db } from "@aucta/db/client";
import { extractLearnings } from "@aucta/ai/knowledge/ingest/session-ingester";
import { inngest } from "./inngest-client.js";

export const knowledgeIngest = inngest.createFunction(
  {
    id: "knowledge-ingest",
    retries: 3,
    concurrency: [{ key: "event.data.orgId", limit: 1 }],
    triggers: [{ event: "session/ended" }],
  },
  async ({ event, step }) => {
    const sessionData = await step.run("fetch-session", async () => {
      const sessionRepo = new SessionRepository(db);
      return sessionRepo.findWithDetails(event.data.sessionId);
    });

    if (!sessionData) return { status: "not-found" };

    const candidates = await step.run("extract-learnings", async () => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");

      return extractLearnings(
        {
          session: {
            id: sessionData.session.id,
            orgId: sessionData.session.orgId,
            languageDetected: sessionData.session.languageDetected,
            summary: sessionData.session.summary,
          },
          findings: sessionData.findings.map((f) => ({
            category: f.category,
            description: f.description,
            severity: f.severity,
            equipmentModel: f.equipmentModel,
            manufacturer: f.manufacturer,
          })),
          toolCalls: sessionData.toolCalls.map((tc) => ({
            toolName: tc.toolName,
            success: tc.success,
          })),
        },
        apiKey,
      );
    });

    if (candidates.length === 0) return { status: "no-learnings" };

    const articleIds = await step.run("create-articles", async () => {
      const articleRepo = new KnowledgeArticleRepository(db);
      const verificationRepo = new KnowledgeVerificationRepository(db);
      const apiKey = process.env.GEMINI_API_KEY!;
      const qdrantUrl = process.env.QDRANT_URL;
      const qdrantApiKey = process.env.QDRANT_API_KEY;

      const ids: string[] = [];
      for (const candidate of candidates) {
        const article = await articleRepo.create({
          orgId: sessionData.session.orgId,
          title: candidate.title,
          contentMd: candidate.contentMd,
          category: candidate.category,
          confidenceLevel: "unverified" as const,
          equipmentBrand: candidate.equipmentBrand ?? undefined,
          equipmentModel: candidate.equipmentModel ?? undefined,
          procedureType: candidate.procedureType ?? undefined,
          sourceType: "session",
          sourceSessionIds: [event.data.sessionId],
          tags: candidate.tags,
          isAiGenerated: true,
        });

        // KB-07: Auto-create pending verification record so the article enters the review queue
        await verificationRepo.create({
          articleId: article.id,
          orgId: sessionData.session.orgId,
          reviewerId: "system",
          status: "pending",
        });

        // Embed and upsert to Qdrant if configured
        if (qdrantUrl) {
          try {
            const embeddingService = new GeminiEmbeddingService({ apiKey });
            const qdrantClient = createQdrantClient({ url: qdrantUrl, apiKey: qdrantApiKey });
            const embeddingText = `${article.title} ${article.summary ?? ""} ${article.contentMd}`;
            const denseVector = await embeddingService.embedDocument(embeddingText);

            await qdrantClient.upsert(QDRANT_CONFIG.COLLECTION_NAME, {
              wait: true,
              points: [
                {
                  id: article.id,
                  vector: {
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

            await articleRepo.updateEmbedding(article.id, article.id, EMBEDDING_CONFIG.MODEL);
          } catch (err) {
            // Log but don't fail -- article is in Postgres, embedding can be retried
            console.error(`Failed to embed article ${article.id}:`, err);
          }
        }

        ids.push(article.id);
      }
      return ids;
    });

    // Send compilation event for merging related articles
    await step.run("trigger-compilation", async () => {
      await inngest.send({
        name: "knowledge/articles-ingested",
        data: {
          orgId: sessionData.session.orgId,
          articleIds,
          sessionId: event.data.sessionId,
        },
      });
    });

    return { status: "completed", articleCount: candidates.length, articleIds };
  },
);
