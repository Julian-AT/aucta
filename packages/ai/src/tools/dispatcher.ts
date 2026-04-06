import type { ToolPool } from "./registry.js";
import type { ToolContext } from "../types.js";
import { ZodError } from "zod";

export interface ToolCallEvent {
  functionCalls: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
}

export interface ToolResponseMessage {
  functionResponses: Array<{
    id: string;
    name: string;
    response: Record<string, unknown>;
  }>;
}

class TimeoutError extends Error {
  constructor() {
    super("Tool execution timed out");
    this.name = "TimeoutError";
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new TimeoutError()), ms);
  });
}

export async function dispatchToolCalls(
  toolCall: ToolCallEvent,
  pool: ToolPool,
  context: ToolContext,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ToolResponseMessage> {
  const functionResponses = await Promise.all(
    toolCall.functionCalls.map(async (fc) => {
      const tool = pool.getTool(fc.name);

      if (!tool) {
        return {
          id: fc.id,
          name: fc.name,
          response: {
            error: `Unknown tool: ${fc.name}`,
            code: "TOOL_NOT_FOUND",
          },
        };
      }

      try {
        const validatedInput = tool.validateInput(fc.args);
        const result = await Promise.race([
          tool.call(validatedInput, context),
          timeoutPromise(timeoutMs),
        ]);

        if (result.success) {
          return {
            id: fc.id,
            name: fc.name,
            response: result.data as Record<string, unknown>,
          };
        }
        return {
          id: fc.id,
          name: fc.name,
          response: { error: result.error, code: result.code },
        };
      } catch (error) {
        if (error instanceof ZodError) {
          return {
            id: fc.id,
            name: fc.name,
            response: {
              error: `Invalid input: ${error.issues.map((i) => i.message).join(", ")}`,
              code: "VALIDATION_ERROR",
            },
          };
        }
        if (error instanceof TimeoutError) {
          return {
            id: fc.id,
            name: fc.name,
            response: { error: "Tool execution timed out", code: "TIMEOUT" },
          };
        }
        return {
          id: fc.id,
          name: fc.name,
          response: { error: "Internal tool error", code: "INTERNAL_ERROR" },
        };
      }
    }),
  );

  return { functionResponses };
}
