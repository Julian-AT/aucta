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
} from "@aucta/ai";
import type { ToolContext } from "@aucta/ai";

const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL ?? "gemini-2.5-flash-live-preview";

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

      const pool = assembleToolPool([lookupErrorCodeTool, logFindingTool]);

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
      const pool = assembleToolPool([lookupErrorCodeTool, logFindingTool]);
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
});
