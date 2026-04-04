import { desc, eq } from "drizzle-orm";
import { generateId } from "@aucta/shared/utils/id";
import {
  SessionFindingDTO as SessionFindingDTOSchema,
  type CreateSessionFindingDTO,
  type SessionFindingDTO,
} from "@aucta/shared/schemas/session-finding.schema";
import type { DrizzleClient } from "../client.js";
import { sessionFindings } from "../schema/session-findings.js";

export class SessionFindingRepository {
  constructor(private db: DrizzleClient) {}

  async create(input: CreateSessionFindingDTO): Promise<SessionFindingDTO> {
    const id = generateId("fnd");

    const rows = await this.db
      .insert(sessionFindings)
      .values({
        id,
        sessionId: input.sessionId,
        category: input.category,
        description: input.description,
        severity: input.severity,
        equipmentModel: input.equipmentModel ?? null,
        manufacturer: input.manufacturer ?? null,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`Failed to insert session finding ${id}`);
    }

    return SessionFindingDTOSchema.parse(row);
  }

  async findBySessionId(sessionId: string): Promise<SessionFindingDTO[]> {
    const rows = await this.db
      .select()
      .from(sessionFindings)
      .where(eq(sessionFindings.sessionId, sessionId))
      .orderBy(desc(sessionFindings.createdAt));

    return rows.map((row) => SessionFindingDTOSchema.parse(row));
  }
}
