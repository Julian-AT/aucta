import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const orgSettings = pgTable("org_settings", {
  // References Better Auth's organization.id -- serves as PK (one settings row per org)
  orgId: varchar("org_id", { length: 36 }).primaryKey(),
  industryType: varchar("industry_type", { length: 50 }).notNull(),
  location: varchar("location", { length: 200 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
