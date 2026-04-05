import {
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const linkTypeEnum = pgEnum("link_type", [
  "reference",
  "prerequisite",
  "related",
]);

export const knowledgeLinks = pgTable("knowledge_links", {
  id: varchar("id", { length: 30 }).primaryKey(),
  sourceArticleId: varchar("source_article_id", { length: 30 }).notNull(),
  targetArticleId: varchar("target_article_id", { length: 30 }).notNull(),
  linkType: linkTypeEnum("link_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
