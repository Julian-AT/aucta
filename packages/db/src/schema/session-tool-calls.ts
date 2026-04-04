import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { aiSessions } from "./ai-sessions.js";

export const sessionToolCalls = pgTable("session_tool_calls", {
  id: varchar("id", { length: 30 }).primaryKey(),
  sessionId: varchar("session_id", { length: 30 })
    .notNull()
    .references(() => aiSessions.id),
  toolName: varchar("tool_name", { length: 100 }).notNull(),
  input: jsonb("input"),
  output: jsonb("output"),
  durationMs: integer("duration_ms"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
