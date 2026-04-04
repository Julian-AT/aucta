import { describe, it, expect } from "vitest";
import { dispatchToolCalls, type ToolCallEvent } from "./dispatcher.js";
import { assembleToolPool } from "./registry.js";
import { buildTool } from "./base.js";
import { z } from "zod";
import type { ToolContext } from "../types.js";

const mockContext: ToolContext = {
  orgId: "org_test",
  userId: "user_test",
  sessionId: "session_test",
};

function createEchoTool() {
  return buildTool({
    name: "echo",
    description: "Echoes input back",
    inputSchema: z.object({ message: z.string() }),
    outputSchema: z.object({ echo: z.string() }),
    isReadOnly: true,
    async call(input) {
      return { echo: input.message };
    },
  });
}

function createStrictTool() {
  return buildTool({
    name: "strict",
    description: "Requires specific input",
    inputSchema: z.object({ count: z.number().int().positive() }),
    outputSchema: z.object({ doubled: z.number() }),
    isReadOnly: true,
    async call(input) {
      return { doubled: input.count * 2 };
    },
  });
}

function createSlowTool(delayMs: number) {
  return buildTool({
    name: "slow",
    description: "Takes a long time",
    inputSchema: z.object({}),
    outputSchema: z.object({ done: z.boolean() }),
    isReadOnly: true,
    async call() {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return { done: true };
    },
  });
}

function createThrowingTool() {
  return buildTool({
    name: "throws",
    description: "Always throws",
    inputSchema: z.object({}),
    outputSchema: z.object({}),
    isReadOnly: true,
    async call(): Promise<Record<string, never>> {
      throw new Error("Something went wrong");
    },
  });
}

describe("dispatchToolCalls", () => {
  it("routes to correct tool and returns structured response", async () => {
    const pool = assembleToolPool([createEchoTool(), createStrictTool()]);
    const toolCall: ToolCallEvent = {
      functionCalls: [
        { id: "call_1", name: "echo", args: { message: "hello" } },
      ],
    };

    const result = await dispatchToolCalls(toolCall, pool, mockContext);

    expect(result.functionResponses).toHaveLength(1);
    expect(result.functionResponses[0]).toEqual({
      id: "call_1",
      name: "echo",
      response: { echo: "hello" },
    });
  });

  it("preserves the exact fc.id in the response", async () => {
    const pool = assembleToolPool([createEchoTool()]);
    const specificId = "unique-call-id-abc123";
    const toolCall: ToolCallEvent = {
      functionCalls: [
        { id: specificId, name: "echo", args: { message: "test" } },
      ],
    };

    const result = await dispatchToolCalls(toolCall, pool, mockContext);
    expect(result.functionResponses[0]!.id).toBe(specificId);
  });

  it("returns TOOL_NOT_FOUND for unknown tool name", async () => {
    const pool = assembleToolPool([createEchoTool()]);
    const toolCall: ToolCallEvent = {
      functionCalls: [
        { id: "call_2", name: "nonexistent", args: {} },
      ],
    };

    const result = await dispatchToolCalls(toolCall, pool, mockContext);

    expect(result.functionResponses[0]).toEqual({
      id: "call_2",
      name: "nonexistent",
      response: {
        error: "Unknown tool: nonexistent",
        code: "TOOL_NOT_FOUND",
      },
    });
  });

  it("returns VALIDATION_ERROR for invalid input (D-12)", async () => {
    const pool = assembleToolPool([createStrictTool()]);
    const toolCall: ToolCallEvent = {
      functionCalls: [
        { id: "call_3", name: "strict", args: { count: "not-a-number" } },
      ],
    };

    const result = await dispatchToolCalls(toolCall, pool, mockContext);

    expect(result.functionResponses[0]!.response).toHaveProperty(
      "code",
      "VALIDATION_ERROR",
    );
    expect(
      (result.functionResponses[0]!.response as { error: string }).error,
    ).toContain("Invalid input:");
  });

  it("returns TIMEOUT error after specified timeout (D-11)", async () => {
    const pool = assembleToolPool([createSlowTool(5000)]);
    const toolCall: ToolCallEvent = {
      functionCalls: [{ id: "call_4", name: "slow", args: {} }],
    };

    const result = await dispatchToolCalls(toolCall, pool, mockContext, 50);

    expect(result.functionResponses[0]).toEqual({
      id: "call_4",
      name: "slow",
      response: {
        error: "Tool execution timed out",
        code: "TIMEOUT",
      },
    });
  });

  it("handles multiple function calls in a single toolCall event", async () => {
    const pool = assembleToolPool([createEchoTool(), createStrictTool()]);
    const toolCall: ToolCallEvent = {
      functionCalls: [
        { id: "call_a", name: "echo", args: { message: "first" } },
        { id: "call_b", name: "strict", args: { count: 5 } },
      ],
    };

    const result = await dispatchToolCalls(toolCall, pool, mockContext);

    expect(result.functionResponses).toHaveLength(2);
    expect(result.functionResponses[0]).toEqual({
      id: "call_a",
      name: "echo",
      response: { echo: "first" },
    });
    expect(result.functionResponses[1]).toEqual({
      id: "call_b",
      name: "strict",
      response: { doubled: 10 },
    });
  });

  it("returns TOOL_ERROR when tool throws", async () => {
    const pool = assembleToolPool([createThrowingTool()]);
    const toolCall: ToolCallEvent = {
      functionCalls: [{ id: "call_5", name: "throws", args: {} }],
    };

    const result = await dispatchToolCalls(toolCall, pool, mockContext);

    expect(result.functionResponses[0]!.response).toHaveProperty(
      "code",
      "TOOL_ERROR",
    );
  });
});
