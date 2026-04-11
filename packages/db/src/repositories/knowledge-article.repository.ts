import { desc, eq, and, lt, sql } from "drizzle-orm";
import { generateId } from "@aucta/shared/utils/id";
import {
  KnowledgeArticleDTO as KnowledgeArticleDTOSchema,
  type CreateKnowledgeArticleDTO,
  type UpdateKnowledgeArticleDTO,
  type KnowledgeArticleDTO,
} from "@aucta/shared/schemas/knowledge-article.schema";
import type { DrizzleClient } from "../client.js";
import { knowledgeArticles } from "../schema/knowledge-articles.js";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 255);
}

export class KnowledgeArticleRepository {
  constructor(private db: DrizzleClient) {}

  async create(input: CreateKnowledgeArticleDTO): Promise<KnowledgeArticleDTO> {
    const id = generateId("art");
    const now = new Date();
    const slug = slugify(input.title);

    const rows = await this.db
      .insert(knowledgeArticles)
      .values({
        id,
        orgId: input.orgId,
        slug,
        title: input.title,
        contentMd: input.contentMd,
        category: input.category,
        equipmentBrand: input.equipmentBrand ?? null,
        equipmentModel: input.equipmentModel ?? null,
        procedureType: input.procedureType ?? null,
        confidenceLevel: input.confidenceLevel ?? "unverified",
        sourceType: input.sourceType,
        sourceSessionIds: input.sourceSessionIds ?? null,
        tags: input.tags ?? null,
        version: 1,
        retrievalCount: 0,
        isAiGenerated: input.isAiGenerated ?? true,
        createdBy: input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`Failed to insert knowledge article ${id}`);
    }

    return KnowledgeArticleDTOSchema.parse(row);
  }

  async findById(id: string): Promise<KnowledgeArticleDTO | null> {
    const rows = await this.db
      .select()
      .from(knowledgeArticles)
      .where(eq(knowledgeArticles.id, id));

    const row = rows[0];
    if (!row) return null;

    return KnowledgeArticleDTOSchema.parse(row);
  }

  async findByOrgId(
    orgId: string,
    limit = 50,
  ): Promise<KnowledgeArticleDTO[]> {
    const rows = await this.db
      .select()
      .from(knowledgeArticles)
      .where(eq(knowledgeArticles.orgId, orgId))
      .orderBy(desc(knowledgeArticles.updatedAt))
      .limit(limit);

    return rows.map((row) => KnowledgeArticleDTOSchema.parse(row));
  }

  async findByEquipment(
    orgId: string,
    brand: string,
    model?: string,
  ): Promise<KnowledgeArticleDTO[]> {
    const conditions = [
      eq(knowledgeArticles.orgId, orgId),
      eq(knowledgeArticles.equipmentBrand, brand),
    ];

    if (model) {
      conditions.push(eq(knowledgeArticles.equipmentModel, model));
    }

    const rows = await this.db
      .select()
      .from(knowledgeArticles)
      .where(and(...conditions))
      .orderBy(desc(knowledgeArticles.confidenceLevel));

    return rows.map((row) => KnowledgeArticleDTOSchema.parse(row));
  }

  async update(
    id: string,
    data: UpdateKnowledgeArticleDTO,
  ): Promise<KnowledgeArticleDTO> {
    const now = new Date();
    const rows = await this.db
      .update(knowledgeArticles)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(knowledgeArticles.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`Knowledge article ${id} not found for update`);
    }

    return KnowledgeArticleDTOSchema.parse(row);
  }

  async updateEmbedding(
    id: string,
    embeddingId: string,
    embeddingModel: string,
  ): Promise<void> {
    await this.db
      .update(knowledgeArticles)
      .set({ embeddingId, embeddingModel })
      .where(eq(knowledgeArticles.id, id));
  }

  async incrementRetrievalCount(id: string): Promise<void> {
    await this.db
      .update(knowledgeArticles)
      .set({
        retrievalCount: sql`${knowledgeArticles.retrievalCount} + 1`,
        lastRetrievedAt: new Date(),
      })
      .where(eq(knowledgeArticles.id, id));
  }

  async findStaleArticles(
    orgId: string,
    staleDays: number,
  ): Promise<KnowledgeArticleDTO[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - staleDays);

    const rows = await this.db
      .select()
      .from(knowledgeArticles)
      .where(
        and(
          eq(knowledgeArticles.orgId, orgId),
          lt(knowledgeArticles.updatedAt, cutoff),
        ),
      )
      .orderBy(desc(knowledgeArticles.updatedAt));

    return rows.map((row) => KnowledgeArticleDTOSchema.parse(row));
  }

  async findBySlug(
    orgId: string,
    slug: string,
  ): Promise<KnowledgeArticleDTO | null> {
    const rows = await this.db
      .select()
      .from(knowledgeArticles)
      .where(
        and(
          eq(knowledgeArticles.orgId, orgId),
          eq(knowledgeArticles.slug, slug),
        ),
      );

    const row = rows[0];
    if (!row) return null;

    return KnowledgeArticleDTOSchema.parse(row);
  }

  /**
   * Equipment models that appear in session findings but have no matching knowledge article.
   * Cross-joins session_findings -> ai_sessions -> knowledge_articles via NOT EXISTS.
   */
  async findCoverageGaps(
    orgId: string,
  ): Promise<
    Array<{
      equipmentBrand: string;
      equipmentModel: string;
      sessionCount: number;
    }>
  > {
    const result = await this.db.execute(sql`
      SELECT
        f.manufacturer AS equipment_brand,
        f.equipment_model AS equipment_model,
        COUNT(DISTINCT s.id)::int AS session_count
      FROM session_findings f
      JOIN ai_sessions s ON s.id = f.session_id
      WHERE s.org_id = ${orgId}
        AND f.equipment_model IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM knowledge_articles ka
          WHERE ka.org_id = ${orgId}
            AND ka.equipment_model = f.equipment_model
            AND (ka.equipment_brand = f.manufacturer OR f.manufacturer IS NULL)
        )
      GROUP BY f.manufacturer, f.equipment_model
      ORDER BY session_count DESC
    `);

    return (result.rows ?? []).map((row: Record<string, unknown>) => ({
      equipmentBrand: String(row.equipment_brand ?? ""),
      equipmentModel: String(row.equipment_model ?? ""),
      sessionCount: Number(row.session_count ?? 0),
    }));
  }

  /**
   * Articles that cover the same (brand, model, procedureType) -- potential conflicts.
   * Returns groups where count > 1.
   */
  async findConflictingArticles(
    orgId: string,
  ): Promise<Array<{ procedureKey: string; articleIds: string[] }>> {
    const result = await this.db.execute(sql`
      SELECT
        CONCAT(equipment_brand, '/', equipment_model, '/', procedure_type) AS procedure_key,
        ARRAY_AGG(id) AS article_ids
      FROM knowledge_articles
      WHERE org_id = ${orgId}
        AND procedure_type IS NOT NULL
        AND equipment_brand IS NOT NULL
      GROUP BY equipment_brand, equipment_model, procedure_type
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);

    return (result.rows ?? []).map((row: Record<string, unknown>) => ({
      procedureKey: String(row.procedure_key ?? ""),
      articleIds: Array.isArray(row.article_ids)
        ? row.article_ids.map(String)
        : [],
    }));
  }
}
