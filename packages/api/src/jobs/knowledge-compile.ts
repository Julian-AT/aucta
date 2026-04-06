import { KnowledgeArticleRepository } from "@aucta/db/repositories/knowledge-article.repository";
import { KnowledgeLinkRepository } from "@aucta/db/repositories/knowledge-link.repository";
import { GeminiEmbeddingService, createQdrantClient, QDRANT_CONFIG, EMBEDDING_CONFIG } from "@aucta/ai/knowledge";
import { compileArticle } from "@aucta/ai/knowledge/compile/article-compiler";
import { generateLinks } from "@aucta/ai/knowledge/compile/linker";
import { db } from "@aucta/db/client";
import { inngest } from "./inngest-client.js";

export const knowledgeCompile = inngest.createFunction(
  {
    id: "knowledge-compile",
    retries: 3,
    concurrency: [{ key: "event.data.orgId", limit: 1 }],
    triggers: [{ event: "knowledge/articles-ingested" }],
  },
  async ({ event, step }) => {
    const { orgId, articleIds } = event.data as { orgId: string; articleIds: string[] };

    // Step 1: Check for existing articles that could be merged
    const mergeTargets = await step.run("find-merge-targets", async () => {
      const articleRepo = new KnowledgeArticleRepository(db);
      const results: Array<{ articleId: string; existingIds: string[] }> = [];

      for (const articleId of articleIds) {
        const article = await articleRepo.findById(articleId);
        if (!article || !article.equipmentBrand) continue;

        const existing = await articleRepo.findByEquipment(
          orgId,
          article.equipmentBrand,
          article.equipmentModel ?? undefined,
        );

        // If there are other articles for the same equipment, they're merge candidates
        const otherIds = existing
          .filter((e) => e.id !== articleId)
          .map((e) => e.id);

        if (otherIds.length > 0) {
          results.push({ articleId, existingIds: otherIds });
        }
      }

      return results;
    });

    // Step 2: Compile merged articles where applicable
    const compiledIds = await step.run("compile-articles", async () => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");

      const articleRepo = new KnowledgeArticleRepository(db);
      const compiled: string[] = [];

      for (const target of mergeTargets) {
        const allIds = [target.articleId, ...target.existingIds];
        const articles = await Promise.all(
          allIds.map((id) => articleRepo.findById(id)),
        );

        const validArticles = articles.filter(
          (a): a is NonNullable<typeof a> => a !== null,
        );

        if (validArticles.length < 2) continue;

        const result = await compileArticle(
          validArticles.map((a) => ({
            id: a.id,
            title: a.title,
            contentMd: a.contentMd,
            category: a.category,
            equipmentBrand: a.equipmentBrand,
            equipmentModel: a.equipmentModel,
            procedureType: a.procedureType,
            sourceSessionIds: a.sourceSessionIds,
            version: a.version,
          })),
          apiKey,
        );

        // Update the primary article with compiled content
        const primaryArticle = validArticles[0]!;
        await articleRepo.update(primaryArticle.id, {
          title: result.title,
          summary: result.summary,
          contentMd: result.contentMd,
          tags: result.tags,
          version: primaryArticle.version + 1,
        });

        compiled.push(primaryArticle.id);
      }

      // Also generate summaries for standalone articles
      for (const articleId of articleIds) {
        if (compiled.includes(articleId)) continue;

        const article = await articleRepo.findById(articleId);
        if (!article || article.summary) continue;

        const result = await compileArticle(
          [
            {
              id: article.id,
              title: article.title,
              contentMd: article.contentMd,
              category: article.category,
              equipmentBrand: article.equipmentBrand,
              equipmentModel: article.equipmentModel,
              procedureType: article.procedureType,
              sourceSessionIds: article.sourceSessionIds,
              version: article.version,
            },
          ],
          apiKey,
        );

        await articleRepo.update(article.id, { summary: result.summary });
        compiled.push(article.id);
      }

      return compiled;
    });

    // Step 3: Generate backlinks for all affected articles
    await step.run("generate-links", async () => {
      const articleRepo = new KnowledgeArticleRepository(db);
      const linkRepo = new KnowledgeLinkRepository(db);
      const deps = { articleRepo, linkRepo };

      for (const articleId of [...articleIds, ...compiledIds]) {
        await generateLinks(deps, articleId, orgId);
      }
    });

    // Step 4: Re-embed updated articles in Qdrant
    await step.run("re-embed", async () => {
      const apiKey = process.env.GEMINI_API_KEY!;
      const qdrantUrl = process.env.QDRANT_URL;
      if (!qdrantUrl) return;

      const articleRepo = new KnowledgeArticleRepository(db);
      const embeddingService = new GeminiEmbeddingService({ apiKey });
      const qdrantClient = createQdrantClient({
        url: qdrantUrl,
        apiKey: process.env.QDRANT_API_KEY,
      });

      for (const articleId of compiledIds) {
        const article = await articleRepo.findById(articleId);
        if (!article) continue;

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

        await articleRepo.updateEmbedding(article.id, article.id, EMBEDDING_CONFIG.MODEL);
      }
    });

    return { status: "completed", compiled: compiledIds.length };
  },
);
