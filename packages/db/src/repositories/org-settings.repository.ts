import { eq } from "drizzle-orm";
import { z } from "zod";
import type { DrizzleClient } from "../client.js";
import { orgSettings } from "../schema/org-settings.js";

const OrgSettingsDTO = z.object({
  orgId: z.string(),
  industryType: z.string(),
  location: z.string(),
  updatedAt: z.date(),
});

export type OrgSettingsDTO = z.infer<typeof OrgSettingsDTO>;

export class OrgSettingsRepository {
  constructor(private db: DrizzleClient) {}

  async upsert(data: {
    orgId: string;
    industryType: string;
    location: string;
  }): Promise<void> {
    await this.db
      .insert(orgSettings)
      .values({
        orgId: data.orgId,
        industryType: data.industryType,
        location: data.location,
      })
      .onConflictDoUpdate({
        target: orgSettings.orgId,
        set: {
          industryType: data.industryType,
          location: data.location,
          updatedAt: new Date(),
        },
      });
  }

  async findByOrgId(orgId: string): Promise<OrgSettingsDTO | null> {
    const rows = await this.db
      .select()
      .from(orgSettings)
      .where(eq(orgSettings.orgId, orgId));

    const row = rows[0];
    if (!row) return null;

    return OrgSettingsDTO.parse(row);
  }
}
