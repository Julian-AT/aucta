import { eq, or } from "drizzle-orm";
import { generateId } from "@aucta/shared/utils/id";
import {
  KnowledgeLinkDTO as KnowledgeLinkDTOSchema,
  type CreateKnowledgeLinkDTO,
  type KnowledgeLinkDTO,
} from "@aucta/shared/schemas/knowledge-link.schema";
import type { DrizzleClient } from "../client.js";
import { knowledgeLinks } from "../schema/knowledge-links.js";

export class KnowledgeLinkRepository {
  constructor(private db: DrizzleClient) {}

  async create(input: CreateKnowledgeLinkDTO): Promise<KnowledgeLinkDTO> {
    const id = generateId("lnk");

    const rows = await this.db
      .insert(knowledgeLinks)
      .values({
        id,
        sourceArticleId: input.sourceArticleId,
        targetArticleId: input.targetArticleId,
        linkType: input.linkType,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`Failed to insert knowledge link ${id}`);
    }

    return KnowledgeLinkDTOSchema.parse(row);
  }

  async findByArticleId(articleId: string): Promise<KnowledgeLinkDTO[]> {
    const rows = await this.db
      .select()
      .from(knowledgeLinks)
      .where(
        or(
          eq(knowledgeLinks.sourceArticleId, articleId),
          eq(knowledgeLinks.targetArticleId, articleId),
        ),
      );

    return rows.map((row) => KnowledgeLinkDTOSchema.parse(row));
  }

  async deleteByArticleId(articleId: string): Promise<void> {
    await this.db
      .delete(knowledgeLinks)
      .where(eq(knowledgeLinks.sourceArticleId, articleId));
  }
}
