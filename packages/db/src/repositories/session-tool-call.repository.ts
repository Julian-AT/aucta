import { desc, eq } from "drizzle-orm";
import { generateId } from "@aucta/shared/utils/id";
import {
  SessionToolCallDTO as SessionToolCallDTOSchema,
  type CreateSessionToolCallDTO,
  type SessionToolCallDTO,
} from "@aucta/shared/schemas/session-tool-call.schema";
import type { DrizzleClient } from "../client.js";
import { sessionToolCalls } from "../schema/session-tool-calls.js";

export class SessionToolCallRepository {
  constructor(private db: DrizzleClient) {}

  async create(input: CreateSessionToolCallDTO): Promise<SessionToolCallDTO> {
    const id = generateId("tc");

    const rows = await this.db
      .insert(sessionToolCalls)
      .values({
        id,
        sessionId: input.sessionId,
        toolName: input.toolName,
        input: input.input ?? null,
        output: input.output ?? null,
        durationMs: input.durationMs ?? null,
        success: input.success,
        errorMessage: input.errorMessage ?? null,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`Failed to insert session tool call ${id}`);
    }

    return SessionToolCallDTOSchema.parse(row);
  }

  async findBySessionId(sessionId: string): Promise<SessionToolCallDTO[]> {
    const rows = await this.db
      .select()
      .from(sessionToolCalls)
      .where(eq(sessionToolCalls.sessionId, sessionId))
      .orderBy(desc(sessionToolCalls.createdAt));

    return rows.map((row) => SessionToolCallDTOSchema.parse(row));
  }
}
