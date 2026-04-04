import { desc, eq } from "drizzle-orm";
import { generateId } from "@aucta/shared/utils/id";
import {
  SessionDTO as SessionDTOSchema,
  type CreateSessionDTO,
  type UpdateSessionDTO,
  type FeedbackInputDTO,
  type SessionDTO,
} from "@aucta/shared/schemas/session.schema";
import { SessionFindingDTO as SessionFindingDTOSchema } from "@aucta/shared/schemas/session-finding.schema";
import { SessionToolCallDTO as SessionToolCallDTOSchema } from "@aucta/shared/schemas/session-tool-call.schema";
import type { DrizzleClient } from "../client.js";
import { aiSessions } from "../schema/ai-sessions.js";
import { sessionFindings } from "../schema/session-findings.js";
import { sessionToolCalls } from "../schema/session-tool-calls.js";

export class SessionRepository {
  constructor(private db: DrizzleClient) {}

  async create(input: CreateSessionDTO): Promise<SessionDTO> {
    const id = generateId("ses");
    const now = new Date();

    const rows = await this.db
      .insert(aiSessions)
      .values({
        id,
        orgId: input.orgId,
        userId: input.userId,
        modelVersion: input.modelVersion ?? null,
        status: "connecting",
        startedAt: now,
        isAiGenerated: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`Failed to insert session ${id}`);
    }

    return SessionDTOSchema.parse(row);
  }

  async findById(id: string): Promise<SessionDTO | null> {
    const rows = await this.db
      .select()
      .from(aiSessions)
      .where(eq(aiSessions.id, id));

    const row = rows[0];
    if (!row) return null;

    return SessionDTOSchema.parse(row);
  }

  async updateEnd(id: string, data: UpdateSessionDTO): Promise<SessionDTO> {
    const now = new Date();
    const rows = await this.db
      .update(aiSessions)
      .set({
        status: data.status,
        endedAt: data.endedAt,
        durationMs: data.durationMs,
        languageDetected: data.languageDetected,
        tokenCountInput: data.tokenCountInput,
        tokenCountOutput: data.tokenCountOutput,
        toolsUsed: data.toolsUsed,
        updatedAt: now,
      })
      .where(eq(aiSessions.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`Session ${id} not found for update`);
    }

    return SessionDTOSchema.parse(row);
  }

  async updateFeedback(id: string, data: FeedbackInputDTO): Promise<SessionDTO> {
    const now = new Date();
    const rows = await this.db
      .update(aiSessions)
      .set({
        feedbackRating: data.rating,
        feedbackNote: data.note ?? null,
        updatedAt: now,
      })
      .where(eq(aiSessions.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`Session ${id} not found for feedback update`);
    }

    return SessionDTOSchema.parse(row);
  }

  async updateSummary(
    id: string,
    summary: string,
    isAiGenerated = true,
  ): Promise<SessionDTO> {
    const now = new Date();
    const rows = await this.db
      .update(aiSessions)
      .set({
        summary,
        isAiGenerated,
        updatedAt: now,
      })
      .where(eq(aiSessions.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error(`Session ${id} not found for summary update`);
    }

    return SessionDTOSchema.parse(row);
  }

  async findRecentByOrg(orgId: string, limit = 20): Promise<SessionDTO[]> {
    const rows = await this.db
      .select()
      .from(aiSessions)
      .where(eq(aiSessions.orgId, orgId))
      .orderBy(desc(aiSessions.startedAt))
      .limit(limit);

    return rows.map((row) => SessionDTOSchema.parse(row));
  }

  async findWithDetails(id: string): Promise<{
    session: SessionDTO;
    findings: import("@aucta/shared/schemas/session-finding.schema").SessionFindingDTO[];
    toolCalls: import("@aucta/shared/schemas/session-tool-call.schema").SessionToolCallDTO[];
  } | null> {
    const sessionRow = await this.findById(id);
    if (!sessionRow) return null;

    const findingRows = await this.db
      .select()
      .from(sessionFindings)
      .where(eq(sessionFindings.sessionId, id))
      .orderBy(desc(sessionFindings.createdAt));

    const toolCallRows = await this.db
      .select()
      .from(sessionToolCalls)
      .where(eq(sessionToolCalls.sessionId, id))
      .orderBy(desc(sessionToolCalls.createdAt));

    return {
      session: sessionRow,
      findings: findingRows.map((row) => SessionFindingDTOSchema.parse(row)),
      toolCalls: toolCallRows.map((row) => SessionToolCallDTOSchema.parse(row)),
    };
  }
}
