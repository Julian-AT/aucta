import { eq } from "drizzle-orm";
import type { InviteCodeDTO } from "@aucta/shared/schemas/invite.schema";
import { InviteCodeDTO as InviteCodeDTOSchema } from "@aucta/shared/schemas/invite.schema";
import type { DrizzleClient } from "../client.js";
import { inviteCodes } from "../schema/invite-codes.js";

export class InviteRepository {
  constructor(private db: DrizzleClient) {}

  async create(data: {
    id: string;
    orgId: string;
    code: string;
    createdBy: string;
    role: "technician" | "manager";
    maxUses: number;
    expiresAt: Date;
  }): Promise<InviteCodeDTO> {
    const rows = await this.db
      .insert(inviteCodes)
      .values(data)
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`Failed to insert invite code ${data.code}`);
    }

    return InviteCodeDTOSchema.parse(row);
  }

  async findByCode(code: string): Promise<InviteCodeDTO | null> {
    const normalized = code.toUpperCase().trim();
    const rows = await this.db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, normalized));

    const row = rows[0];
    if (!row) return null;

    return InviteCodeDTOSchema.parse(row);
  }

  async findByOrg(orgId: string): Promise<InviteCodeDTO[]> {
    const rows = await this.db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.orgId, orgId));

    return rows.map((row) => InviteCodeDTOSchema.parse(row));
  }

  async incrementUsage(id: string): Promise<void> {
    const rows = await this.db
      .select({ usedCount: inviteCodes.usedCount })
      .from(inviteCodes)
      .where(eq(inviteCodes.id, id));

    const row = rows[0];
    if (!row) {
      throw new Error(`Invite code ${id} not found for usage increment`);
    }

    await this.db
      .update(inviteCodes)
      .set({ usedCount: row.usedCount + 1 })
      .where(eq(inviteCodes.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(inviteCodes)
      .where(eq(inviteCodes.id, id));
  }
}
