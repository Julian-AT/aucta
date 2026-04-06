import { describe, it, expect } from "vitest";
import { assembleToolPool } from "./registry.js";
import { buildTool } from "./base.js";
import { z } from "zod";

function createMockTool(name: string) {
  return buildTool({
    name,
    description: `Mock tool: ${name}`,
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    isReadOnly: true,
    async call(input) {
      return { result: `processed: ${input.query}` };
    },
  });
}

describe("assembleToolPool", () => {
  it("returns ToolPool with tools Map of correct size for 2 tools", () => {
    const pool = assembleToolPool([
      createMockTool("toolA"),
      createMockTool("toolB"),
    ]);
    expect(pool.tools.size).toBe(2);
  });

  it("returns functionDeclarations array with 2 GeminiFunctionDeclaration objects", () => {
    const pool = assembleToolPool([
      createMockTool("toolA"),
      createMockTool("toolB"),
    ]);
    expect(pool.functionDeclarations).toHaveLength(2);
    expect(pool.functionDeclarations[0]).toHaveProperty("name", "toolA");
    expect(pool.functionDeclarations[0]).toHaveProperty("description");
    expect(pool.functionDeclarations[0]).toHaveProperty("parameters");
    expect(pool.functionDeclarations[1]).toHaveProperty("name", "toolB");
  });

  it("getTool returns the correct tool by name", () => {
    const toolA = createMockTool("lookupErrorCode");
    const pool = assembleToolPool([toolA, createMockTool("logFinding")]);
    const retrieved = pool.getTool("lookupErrorCode");
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe("lookupErrorCode");
  });

  it("getTool returns undefined for nonexistent tool", () => {
    const pool = assembleToolPool([createMockTool("toolA")]);
    expect(pool.getTool("nonexistent")).toBeUndefined();
  });

  it("throws on duplicate tool names", () => {
    expect(() =>
      assembleToolPool([createMockTool("sameName"), createMockTool("sameName")]),
    ).toThrow("Duplicate tool name: sameName");
  });

  it("returns ToolPool with 0 tools for empty array", () => {
    const pool = assembleToolPool([]);
    expect(pool.tools.size).toBe(0);
    expect(pool.functionDeclarations).toHaveLength(0);
  });
});
