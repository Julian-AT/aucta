import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// KB-01: 4-tier confidence levels for knowledge article trust hierarchy
export const confidenceLevelEnum = pgEnum("confidence_level", [
  "unverified",
  "technician_reviewed",
  "expert_approved",
  "manufacturer_sourced",
]);

export const articleCategoryEnum = pgEnum("article_category", [
  "equipment",
  "procedure",
  "safety",
  "regulatory",
  "troubleshooting",
]);

export const articleSourceTypeEnum = pgEnum("article_source_type", [
  "session",
  "manual",
  "feedback",
]);

export const knowledgeArticles = pgTable("knowledge_articles", {
  id: varchar("id", { length: 30 }).primaryKey(),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  summary: text("summary"),
  contentMd: text("content_md").notNull(),
  category: articleCategoryEnum("category").notNull(),
  equipmentBrand: varchar("equipment_brand", { length: 100 }),
  equipmentModel: varchar("equipment_model", { length: 100 }),
  procedureType: varchar("procedure_type", { length: 100 }),
  confidenceLevel: confidenceLevelEnum("confidence_level")
    .notNull()
    .default("unverified"),
  sourceType: articleSourceTypeEnum("source_type").notNull(),
  sourceSessionIds: jsonb("source_session_ids").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>(),
  version: integer("version").notNull().default(1),
  previousVersionId: varchar("previous_version_id", { length: 30 }),
  embeddingId: varchar("embedding_id", { length: 100 }),
  embeddingModel: varchar("embedding_model", { length: 100 }),
  wordCount: integer("word_count"),
  retrievalCount: integer("retrieval_count").notNull().default(0),
  lastRetrievedAt: timestamp("last_retrieved_at", { withTimezone: true }),
  // COMP-07: EU AI Act requires AI-generated content labeling
  isAiGenerated: boolean("is_ai_generated").notNull().default(true),
  createdBy: varchar("created_by", { length: 36 }),
  verifiedBy: varchar("verified_by", { length: 36 }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
