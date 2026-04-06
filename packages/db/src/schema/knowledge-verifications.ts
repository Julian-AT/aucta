import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "approved",
  "rejected",
  "needs_revision",
]);

export const knowledgeVerifications = pgTable("knowledge_verifications", {
  id: varchar("id", { length: 30 }).primaryKey(),
  articleId: varchar("article_id", { length: 30 }).notNull(),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  reviewerId: varchar("reviewer_id", { length: 36 }).notNull(),
  status: verificationStatusEnum("status").notNull(),
  reviewerNotes: text("reviewer_notes"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
