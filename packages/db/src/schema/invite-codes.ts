import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const inviteRoleEnum = pgEnum("invite_role", [
  "technician",
  "manager",
]);

export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id", { length: 30 }).primaryKey(),
  // References Better Auth's organization.id -- no FK constraint to avoid
  // conflicting with Better Auth's own schema management.
  orgId: varchar("org_id", { length: 36 }).notNull(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  // References Better Auth's user.id
  createdBy: varchar("created_by", { length: 36 }).notNull(),
  role: inviteRoleEnum("role").notNull(),
  maxUses: integer("max_uses").default(1).notNull(),
  usedCount: integer("used_count").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
