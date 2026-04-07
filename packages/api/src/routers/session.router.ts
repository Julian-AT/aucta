import { TRPCError } from "@trpc/server";
import { router } from "../trpc.js";
import { orgProcedure } from "../middleware/org-scope.js";
import {
  createRateLimitMiddleware,
  tokenLimiter,
} from "../middleware/rate-limit.js";
import { errorConverter } from "../middleware/error-converter.js";
import { GoogleGenAI, Modality } from "@google/genai";
import { z } from "zod";
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
import { SessionRepository } from "@aucta/db/repositories/session.repository";
import { SessionFindingRepository } from "@aucta/db/repositories/session-finding.repository";
import { SessionToolCallRepository } from "@aucta/db/repositories/session-tool-call.repository";
import { db } from "@aucta/db/client";
import { CreateSessionFindingDTO } from "@aucta/shared/schemas/session-finding.schema";
import { CreateSessionToolCallDTO } from "@aucta/shared/schemas/session-tool-call.schema";
import { inngest } from "../jobs/inngest-client.js";

const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL ?? "gemini-2.5-flash-live-preview";

const sessionRepo = new SessionRepository(db);
const findingRepo = new SessionFindingRepository(db);
const toolCallRepo = new SessionToolCallRepository(db);

// Lazy-initialized: returns null when Qdrant is not configured (e.g., dev without vector DB)
function getSearchKnowledgeBaseTool(): AnyToolDef | null {
  const qdrantUrl = process.env.QDRANT_URL;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!qdrantUrl || !geminiApiKey) {
    return null;
  }

  const qdrantClient = createQdrantClient({
    url: qdrantUrl,
    apiKey: process.env.QDRANT_API_KEY,
  });
  const embeddingService = new GeminiEmbeddingService({
    apiKey: geminiApiKey,
  });

  return createSearchKnowledgeBaseTool({ qdrantClient, embeddingService });
}

function buildToolList(): AnyToolDef[] {
  const tools: AnyToolDef[] = [lookupErrorCodeTool, logFindingTool];
  const searchKBTool = getSearchKnowledgeBaseTool();
  if (searchKBTool) tools.push(searchKBTool);
  return tools;
}

export const sessionRouter = router({
  createToken: orgProcedure
    .use(createRateLimitMiddleware(tokenLimiter))
    .use(errorConverter)
    .mutation(async ({ ctx: _ctx }) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }

      const systemPrompt = buildEffectiveSystemPrompt([
        coreRolePrompt,
        hvacExpertisePrompt,
        safetyRulesPrompt,
      ]);

      const pool = assembleToolPool(buildToolList());

      // Ephemeral tokens require v1alpha API version
      const client = new GoogleGenAI({
        apiKey,
        httpOptions: { apiVersion: "v1alpha" },
      });

      const tokenResponse = await client.authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(
            Date.now() + 30 * 60 * 1000,
          ).toISOString(),
          newSessionExpireTime: new Date(
            Date.now() + 60 * 1000,
          ).toISOString(),
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

      // Ephemeral tokens must never be logged (security requirement)
      return {
        token: tokenResponse.name,
        model: GEMINI_LIVE_MODEL,
        toolDeclarations: pool.functionDeclarations,
      };
    }),

  dispatchToolCalls: orgProcedure
    .use(errorConverter)
    .input(
      z.object({
        functionCalls: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            args: z.record(z.string(), z.any()),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const pool = assembleToolPool(buildToolList());
      const context: ToolContext = {
        orgId: ctx.orgId,
        userId: ctx.userId,
        sessionId: "live",
      };
      return dispatchToolCalls(
        { functionCalls: input.functionCalls },
        pool,
        context,
      );
    }),

  createSession: orgProcedure
    .use(errorConverter)
    .input(z.object({ modelVersion: z.string().optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      const session = await sessionRepo.create({
        orgId: ctx.orgId,
        userId: ctx.userId,
        modelVersion: input?.modelVersion,
      });
      return { sessionId: session.id };
    }),

  endSession: orgProcedure
    .use(errorConverter)
    .input(
      z.object({
        sessionId: z.string(),
        status: z.enum(["completed", "failed", "timeout", "abandoned"]),
        durationMs: z.number().int().optional(),
        languageDetected: z.string().optional(),
        tokenCountInput: z.number().int().optional(),
        tokenCountOutput: z.number().int().optional(),
        toolsUsed: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const updated = await sessionRepo.updateEnd(input.sessionId, {
        status: input.status,
        endedAt: new Date(),
        durationMs: input.durationMs,
        languageDetected: input.languageDetected,
        tokenCountInput: input.tokenCountInput,
        tokenCountOutput: input.tokenCountOutput,
        toolsUsed: input.toolsUsed,
      });

      await inngest.send({
        name: "session/ended",
        data: { sessionId: input.sessionId },
      });

      return updated;
    }),

  addFinding: orgProcedure
    .use(errorConverter)
    .input(CreateSessionFindingDTO)
    .mutation(async ({ input }) => {
      return findingRepo.create(input);
    }),

  addToolCall: orgProcedure
    .use(errorConverter)
    .input(CreateSessionToolCallDTO)
    .mutation(async ({ input }) => {
      return toolCallRepo.create(input);
    }),

  submitFeedback: orgProcedure
    .use(errorConverter)
    .input(
      z.object({
        sessionId: z.string(),
        rating: z.number().int().min(1).max(5),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return sessionRepo.updateFeedback(input.sessionId, {
        rating: input.rating,
        note: input.note,
      });
    }),

  getSession: orgProcedure
    .use(errorConverter)
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const session = await sessionRepo.findById(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Session ${input.sessionId} not found`,
        });
      }
      return session;
    }),

  getRecentSessions: orgProcedure
    .use(errorConverter)
    .query(async ({ ctx }) => {
      return sessionRepo.findRecentByOrg(ctx.orgId, 20);
    }),

  getSessionSummary: orgProcedure
    .use(errorConverter)
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const session = await sessionRepo.findById(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Session ${input.sessionId} not found`,
        });
      }
      return {
        summary: session.summary,
        isAiGenerated: session.isAiGenerated,
      };
    }),
});
