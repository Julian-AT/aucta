import { asc, eq, and } from "drizzle-orm";
import { generateId } from "@aucta/shared/utils/id";
import {
  KnowledgeVerificationDTO as KnowledgeVerificationDTOSchema,
  type CreateKnowledgeVerificationDTO,
  type KnowledgeVerificationDTO,
} from "@aucta/shared/schemas/knowledge-verification.schema";
import type { DrizzleClient } from "../client.js";
import { knowledgeVerifications } from "../schema/knowledge-verifications.js";

export class KnowledgeVerificationRepository {
  constructor(private db: DrizzleClient) {}

  async create(
    input: CreateKnowledgeVerificationDTO,
  ): Promise<KnowledgeVerificationDTO> {
    const id = generateId("ver");
    const now = new Date();

    // Set reviewedAt if status indicates a completed review
    const reviewedAt =
      input.status === "approved" || input.status === "rejected" ? now : null;

    const rows = await this.db
      .insert(knowledgeVerifications)
      .values({
        id,
        articleId: input.articleId,
        orgId: input.orgId,
        reviewerId: input.reviewerId,
        status: input.status,
        reviewerNotes: input.reviewerNotes ?? null,
        reviewedAt,
        createdAt: now,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`Failed to insert knowledge verification ${id}`);
    }

    return KnowledgeVerificationDTOSchema.parse(row);
  }

  async findByArticleId(
    articleId: string,
  ): Promise<KnowledgeVerificationDTO[]> {
    const rows = await this.db
      .select()
      .from(knowledgeVerifications)
      .where(eq(knowledgeVerifications.articleId, articleId))
      .orderBy(asc(knowledgeVerifications.createdAt));

    return rows.map((row) => KnowledgeVerificationDTOSchema.parse(row));
  }

  async findPendingByOrg(
    orgId: string,
  ): Promise<KnowledgeVerificationDTO[]> {
    const rows = await this.db
      .select()
      .from(knowledgeVerifications)
      .where(
        and(
          eq(knowledgeVerifications.orgId, orgId),
          eq(knowledgeVerifications.status, "pending"),
        ),
      )
      .orderBy(asc(knowledgeVerifications.createdAt));

    return rows.map((row) => KnowledgeVerificationDTOSchema.parse(row));
  }
}
