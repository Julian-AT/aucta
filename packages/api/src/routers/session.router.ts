import { z } from "zod";
import { router } from "../trpc.js";
import { orgProcedure } from "../middleware/org-scope.js";
import {
  createRateLimitMiddleware,
  tokenLimiter,
} from "../middleware/rate-limit.js";
import { errorConverter } from "../middleware/error-converter.js";
import { SessionRepository } from "@aucta/db/repositories/session.repository";
import { SessionFindingRepository } from "@aucta/db/repositories/session-finding.repository";
import { SessionToolCallRepository } from "@aucta/db/repositories/session-tool-call.repository";
import { db } from "@aucta/db/client";
import { CreateSessionFindingDTO } from "@aucta/shared/schemas/session-finding.schema";
import { CreateSessionToolCallDTO } from "@aucta/shared/schemas/session-tool-call.schema";
import { inngest } from "../jobs/inngest-client.js";
import { SessionService } from "../services/session.service.js";

const sessionService = new SessionService({
  sessionRepo: new SessionRepository(db),
  findingRepo: new SessionFindingRepository(db),
  toolCallRepo: new SessionToolCallRepository(db),
  inngest,
});

export const sessionRouter = router({
  createToken: orgProcedure
    .use(createRateLimitMiddleware(tokenLimiter))
    .use(errorConverter)
    .mutation(async () => {
      return sessionService.createEphemeralToken();
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
      return sessionService.dispatchToolCalls(input.functionCalls, {
        orgId: ctx.orgId,
        userId: ctx.userId,
        sessionId: "live",
      });
    }),

  createSession: orgProcedure
    .use(errorConverter)
    .input(z.object({ modelVersion: z.string().optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      return sessionService.createSession(ctx.orgId, ctx.userId, input?.modelVersion);
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
      return sessionService.endSession(input);
    }),

  addFinding: orgProcedure
    .use(errorConverter)
    .input(CreateSessionFindingDTO)
    .mutation(async ({ input }) => {
      return sessionService.addFinding(input);
    }),

  addToolCall: orgProcedure
    .use(errorConverter)
    .input(CreateSessionToolCallDTO)
    .mutation(async ({ input }) => {
      return sessionService.addToolCall(input);
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
      return sessionService.submitFeedback(input.sessionId, input.rating, input.note);
    }),

  getSession: orgProcedure
    .use(errorConverter)
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      return sessionService.getSession(input.sessionId);
    }),

  getRecentSessions: orgProcedure
    .use(errorConverter)
    .query(async ({ ctx }) => {
      return sessionService.getRecentSessions(ctx.orgId);
    }),

  getSessionSummary: orgProcedure
    .use(errorConverter)
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      return sessionService.getSessionSummary(input.sessionId);
    }),
});
