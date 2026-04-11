import { GoogleGenAI, Modality } from "@google/genai";
import {
  buildEffectiveSystemPrompt,
  coreRolePrompt,
  hvacExpertisePrompt,
  safetyRulesPrompt,
  assembleToolPool,
  dispatchToolCalls,
  lookupErrorCodeTool,
  logFindingTool,
  createSearchKnowledgeBaseTool,
} from "@aucta/ai";
import type { ToolContext, AnyToolDef } from "@aucta/ai";
import {
  createQdrantClient,
  GeminiEmbeddingService,
} from "@aucta/ai/knowledge";
import type { SessionRepository } from "@aucta/db/repositories/session.repository";
import type { SessionFindingRepository } from "@aucta/db/repositories/session-finding.repository";
import type { SessionToolCallRepository } from "@aucta/db/repositories/session-tool-call.repository";
import type {
  CreateSessionFindingDTO,
} from "@aucta/shared/schemas/session-finding.schema";
import type {
  CreateSessionToolCallDTO,
} from "@aucta/shared/schemas/session-tool-call.schema";
import { ErrorWithCode } from "@aucta/shared/utils/errors";
import { logger } from "@aucta/shared/utils/logger";
import type { Inngest } from "inngest";

const GEMINI_LIVE_MODEL_DEFAULT = "gemini-3.1-flash-live-preview";
/** Google retired this id; stale .env files still set it and break Live WS (1008). */
const GEMINI_LIVE_MODEL_DEPRECATED = "gemini-2.5-flash-live-preview";

function resolveGeminiLiveModel(): string {
  const raw = process.env.GEMINI_LIVE_MODEL?.trim();
  if (!raw || raw === GEMINI_LIVE_MODEL_DEPRECATED) {
    if (raw === GEMINI_LIVE_MODEL_DEPRECATED) {
      logger.warn("gemini_live_model_deprecated_env", {
        deprecated: GEMINI_LIVE_MODEL_DEPRECATED,
        using: GEMINI_LIVE_MODEL_DEFAULT,
        hint: "Remove GEMINI_LIVE_MODEL or set it to gemini-3.1-flash-live-preview",
      });
    }
    return GEMINI_LIVE_MODEL_DEFAULT;
  }
  return raw;
}

const GEMINI_LIVE_MODEL = resolveGeminiLiveModel();

interface SessionServiceDeps {
  sessionRepo: SessionRepository;
  findingRepo: SessionFindingRepository;
  toolCallRepo: SessionToolCallRepository;
  inngest: Inngest;
}

export class SessionService {
  private readonly sessionRepo: SessionRepository;
  private readonly findingRepo: SessionFindingRepository;
  private readonly toolCallRepo: SessionToolCallRepository;
  private readonly inngest: Inngest;

  constructor(deps: SessionServiceDeps) {
    this.sessionRepo = deps.sessionRepo;
    this.findingRepo = deps.findingRepo;
    this.toolCallRepo = deps.toolCallRepo;
    this.inngest = deps.inngest;
  }

  async createEphemeralToken(): Promise<{
    token: string;
    model: string;
    toolDeclarations: unknown[];
  }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw ErrorWithCode.BadRequest("GEMINI_API_KEY not configured");
    }

    const systemPrompt = buildEffectiveSystemPrompt([
      coreRolePrompt,
      hvacExpertisePrompt,
      safetyRulesPrompt,
    ]);

    const pool = assembleToolPool(this.buildToolList());

    const client = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const tokenResponse = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: GEMINI_LIVE_MODEL,
          config: {
            systemInstruction: systemPrompt,
            responseModalities: [Modality.AUDIO],
            tools: [{ functionDeclarations: pool.functionDeclarations }],
          },
        },
      },
    });

    return {
      token: tokenResponse.name ?? "",
      model: GEMINI_LIVE_MODEL,
      toolDeclarations: pool.functionDeclarations,
    };
  }

  async dispatchToolCalls(
    functionCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>,
    context: ToolContext,
  ) {
    const pool = assembleToolPool(this.buildToolList());
    return dispatchToolCalls({ functionCalls }, pool, context);
  }

  async createSession(orgId: string, userId: string, modelVersion?: string) {
    const session = await this.sessionRepo.create({
      orgId,
      userId,
      modelVersion,
    });
    return { sessionId: session.id };
  }

  async endSession(input: {
    sessionId: string;
    status: "completed" | "failed" | "timeout" | "abandoned";
    durationMs?: number;
    languageDetected?: string;
    tokenCountInput?: number;
    tokenCountOutput?: number;
    toolsUsed?: string[];
  }) {
    const updated = await this.sessionRepo.updateEnd(input.sessionId, {
      status: input.status,
      endedAt: new Date(),
      durationMs: input.durationMs,
      languageDetected: input.languageDetected,
      tokenCountInput: input.tokenCountInput,
      tokenCountOutput: input.tokenCountOutput,
      toolsUsed: input.toolsUsed,
    });

    await this.inngest
      .send({
        name: "session/ended",
        data: { sessionId: input.sessionId },
      })
      .catch((err: unknown) => {
        logger.warn("inngest_send_failed", {
          event: "session/ended",
          sessionId: input.sessionId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      });

    return updated;
  }

  async addFinding(input: CreateSessionFindingDTO) {
    return this.findingRepo.create(input);
  }

  async addToolCall(input: CreateSessionToolCallDTO) {
    return this.toolCallRepo.create(input);
  }

  async submitFeedback(sessionId: string, rating: number, note?: string) {
    return this.sessionRepo.updateFeedback(sessionId, { rating, note });
  }

  async getSession(sessionId: string) {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw ErrorWithCode.NotFound(`Session ${sessionId} not found`);
    }
    return session;
  }

  async getRecentSessions(orgId: string, limit = 20) {
    return this.sessionRepo.findRecentByOrg(orgId, limit);
  }

  async getSessionSummary(sessionId: string) {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw ErrorWithCode.NotFound(`Session ${sessionId} not found`);
    }
    return {
      summary: session.summary,
      isAiGenerated: session.isAiGenerated,
    };
  }

  private buildToolList(): AnyToolDef[] {
    const tools: AnyToolDef[] = [lookupErrorCodeTool, logFindingTool];
    const searchKBTool = this.getSearchKnowledgeBaseTool();
    if (searchKBTool) tools.push(searchKBTool);
    return tools;
  }

  private getSearchKnowledgeBaseTool(): AnyToolDef | null {
    const qdrantUrl = process.env.QDRANT_URL;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!qdrantUrl || !geminiApiKey) return null;

    const qdrantClient = createQdrantClient({
      url: qdrantUrl,
      apiKey: process.env.QDRANT_API_KEY,
    });
    const embeddingService = new GeminiEmbeddingService({
      apiKey: geminiApiKey,
    });

    return createSearchKnowledgeBaseTool({ qdrantClient, embeddingService });
  }
}
