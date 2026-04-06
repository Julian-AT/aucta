import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { aiSessions } from "./ai-sessions.js";

export const findingCategoryEnum = pgEnum("finding_category", [
  "safety",
  "maintenance",
  "regulatory",
  "observation",
  "recommendation",
]);

export const findingSeverityEnum = pgEnum("finding_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const sessionFindings = pgTable("session_findings", {
  id: varchar("id", { length: 30 }).primaryKey(),
  sessionId: varchar("session_id", { length: 30 })
    .notNull()
    .references(() => aiSessions.id),
  category: findingCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  severity: findingSeverityEnum("severity").notNull(),
  equipmentModel: varchar("equipment_model", { length: 200 }),
  manufacturer: varchar("manufacturer", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
