import type { KnowledgeArticleDTO } from "@aucta/shared/schemas/knowledge-article.schema";
import type { CreateKnowledgeLinkDTO } from "@aucta/shared/schemas/knowledge-link.schema";

export interface LinkerDeps {
  articleRepo: {
    findById: (id: string) => Promise<KnowledgeArticleDTO | null>;
    findByEquipment: (orgId: string, brand: string, model?: string) => Promise<KnowledgeArticleDTO[]>;
  };
  linkRepo: {
    deleteByArticleId: (articleId: string) => Promise<void>;
    create: (input: CreateKnowledgeLinkDTO) => Promise<unknown>;
  };
}

/**
 * Auto-generate typed links between articles that share the same equipment brand.
 * Clears existing outgoing links for the source article, then creates fresh links (idempotent).
 * "related" = same brand + same model, "reference" = same brand + different model.
 */
export async function generateLinks(
  deps: LinkerDeps,
  articleId: string,
  orgId: string,
): Promise<number> {
  const article = await deps.articleRepo.findById(articleId);
  if (!article || !article.equipmentBrand) return 0;

  // Find other articles for the same equipment brand in this org
  const relatedArticles = await deps.articleRepo.findByEquipment(
    orgId,
    article.equipmentBrand,
    undefined, // all models for this brand
  );

  // Remove existing outgoing links for this article (idempotent re-linking)
  await deps.linkRepo.deleteByArticleId(articleId);

  let linkCount = 0;
  for (const related of relatedArticles) {
    if (related.id === articleId) continue; // skip self

    await deps.linkRepo.create({
      sourceArticleId: articleId,
      targetArticleId: related.id,
      linkType: related.equipmentModel === article.equipmentModel ? "related" : "reference",
    });
    linkCount++;
  }

  return linkCount;
}
