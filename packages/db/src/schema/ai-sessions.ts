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

export const aiSessionStatusEnum = pgEnum("ai_session_status", [
  "connecting",
  "active",
  "completed",
  "failed",
  "timeout",
  "abandoned",
]);

export const aiSessions = pgTable("ai_sessions", {
  id: varchar("id", { length: 30 }).primaryKey(),
  // References Better Auth's organization.id -- no FK constraint to avoid
  // conflicting with Better Auth's own schema management.
  orgId: varchar("org_id", { length: 36 }).notNull(),
  // References Better Auth's user.id
  userId: varchar("user_id", { length: 36 }).notNull(),
  status: aiSessionStatusEnum("status").notNull().default("connecting"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  modelVersion: varchar("model_version", { length: 100 }),
  languageDetected: varchar("language_detected", { length: 10 }),
  tokenCountInput: integer("token_count_input"),
  tokenCountOutput: integer("token_count_output"),
  feedbackRating: integer("feedback_rating"),
  feedbackNote: text("feedback_note"),
  summary: text("summary"),
  isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
  toolsUsed: jsonb("tools_used").$type<string[]>(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
