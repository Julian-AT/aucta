import { z } from "zod";
import type {
  ToolContext,
  ToolResult,
  GeminiFunctionDeclaration,
} from "../types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for heterogeneous tool collections (registry, dispatcher). Runtime safety is enforced by Zod validation in validateInput().
export type AnyToolDef = ToolDef<any, any>;

export interface ToolDef<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  call: (input: TInput, context: ToolContext) => Promise<ToolResult<TOutput>>;
  validateInput: (raw: unknown) => TInput;
  prompt: () => GeminiFunctionDeclaration;
  isReadOnly: () => boolean;
}

export function buildTool<TInput, TOutput>(config: {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  isReadOnly: boolean;
  call: (input: TInput, context: ToolContext) => Promise<TOutput>;
}): ToolDef<TInput, TOutput> {
  return Object.freeze({
    name: config.name,
    description: config.description,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,

    validateInput(raw: unknown): TInput {
      return config.inputSchema.parse(raw);
    },

    async call(
      input: TInput,
      context: ToolContext,
    ): Promise<ToolResult<TOutput>> {
      try {
        const data = await config.call(input, context);
        return { success: true, data };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return { success: false, error: message, code: "TOOL_ERROR" };
      }
    },

    prompt(): GeminiFunctionDeclaration {
      const jsonSchema = z.toJSONSchema(config.inputSchema) as Record<
        string,
        unknown
      >;

      // Gemini expects a clean JSON Schema subset without metadata keys
      delete jsonSchema["$schema"];
      delete jsonSchema["additionalProperties"];

      return {
        name: config.name,
        description: config.description,
        parameters: jsonSchema,
      };
    },

    isReadOnly(): boolean {
      return config.isReadOnly;
    },
  });
}

export type { ToolContext, ToolResult, GeminiFunctionDeclaration };
