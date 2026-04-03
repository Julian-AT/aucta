import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DrizzleClient } from "../client.js";
import { auditLog } from "../schema/audit-log.js";

const AuditEntryDTO = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.date(),
});

export type AuditEntryDTO = z.infer<typeof AuditEntryDTO>;

export class AuditRepository {
  constructor(private db: DrizzleClient) {}

  async log(data: {
    orgId: string;
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: unknown;
  }): Promise<void> {
    await this.db.insert(auditLog).values({
      orgId: data.orgId,
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId ?? null,
      metadata: data.metadata ?? null,
    });
  }

  async findByOrg(orgId: string, limit = 50): Promise<AuditEntryDTO[]> {
    const rows = await this.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.orgId, orgId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);

    return rows.map((row) => AuditEntryDTO.parse(row));
  }
}
