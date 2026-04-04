import { describe, it, expect } from "vitest";
import { z } from "zod";
import { buildTool } from "./base.js";
import type { ToolContext } from "../types.js";

const testInputSchema = z.object({
  manufacturer: z.string().describe("Equipment manufacturer name"),
  errorCode: z.string().describe("The error code"),
});

const testOutputSchema = z.object({
  meaning: z.string(),
  found: z.boolean(),
});

function createTestTool() {
  return buildTool({
    name: "testTool",
    description: "A test tool for unit tests",
    inputSchema: testInputSchema,
    outputSchema: testOutputSchema,
    isReadOnly: true,
    call: async (input: z.infer<typeof testInputSchema>, _context: ToolContext) => {
      return { meaning: `Error ${input.errorCode} from ${input.manufacturer}`, found: true };
    },
  });
}

describe("buildTool", () => {
  it("returns a frozen object", () => {
    const tool = createTestTool();
    expect(Object.isFrozen(tool)).toBe(true);
  });

  it("returned ToolDef has name, description, inputSchema, outputSchema, call, validateInput, prompt, isReadOnly", () => {
    const tool = createTestTool();
    expect(tool.name).toBe("testTool");
    expect(tool.description).toBe("A test tool for unit tests");
    expect(tool.inputSchema).toBeDefined();
    expect(tool.outputSchema).toBeDefined();
    expect(typeof tool.call).toBe("function");
    expect(typeof tool.validateInput).toBe("function");
    expect(typeof tool.prompt).toBe("function");
    expect(typeof tool.isReadOnly).toBe("function");
  });

  it("validateInput() with valid input returns parsed value", () => {
    const tool = createTestTool();
    const result = tool.validateInput({ manufacturer: "Daikin", errorCode: "U4" });
    expect(result).toEqual({ manufacturer: "Daikin", errorCode: "U4" });
  });

  it("validateInput() with invalid input throws ZodError", () => {
    const tool = createTestTool();
    expect(() => tool.validateInput({ manufacturer: 123 })).toThrow();
  });

  it("call() with successful handler returns { success: true, data: ... }", async () => {
    const tool = createTestTool();
    const context: ToolContext = { orgId: "org_1", userId: "usr_1", sessionId: "ses_1" };
    const result = await tool.call({ manufacturer: "Daikin", errorCode: "U4" }, context);
    expect(result).toEqual({
      success: true,
      data: { meaning: "Error U4 from Daikin", found: true },
    });
  });

  it("call() with throwing handler returns { success: false, error: '...', code: 'TOOL_ERROR' }", async () => {
    const tool = buildTool({
      name: "failingTool",
      description: "A tool that fails",
      inputSchema: testInputSchema,
      outputSchema: testOutputSchema,
      isReadOnly: true,
      call: async () => {
        throw new Error("Something went wrong");
      },
    });

    const context: ToolContext = { orgId: "org_1", userId: "usr_1", sessionId: "ses_1" };
    const result = await tool.call({ manufacturer: "Daikin", errorCode: "U4" }, context);
    expect(result).toEqual({
      success: false,
      error: "Something went wrong",
      code: "TOOL_ERROR",
    });
  });

  it("prompt() returns GeminiFunctionDeclaration with name, description, and parameters", () => {
    const tool = createTestTool();
    const declaration = tool.prompt();
    expect(declaration.name).toBe("testTool");
    expect(declaration.description).toBe("A test tool for unit tests");
    expect(declaration.parameters).toBeDefined();

    const params = declaration.parameters as Record<string, unknown>;
    expect(params.type).toBe("object");
    expect(params.properties).toBeDefined();
    expect(params.required).toBeDefined();
  });

  it("isReadOnly() returns the boolean configured in buildTool", () => {
    const readOnlyTool = createTestTool();
    expect(readOnlyTool.isReadOnly()).toBe(true);

    const writeTool = buildTool({
      name: "writeTool",
      description: "A tool that writes",
      inputSchema: testInputSchema,
      outputSchema: testOutputSchema,
      isReadOnly: false,
      call: async () => ({ meaning: "ok", found: true }),
    });
    expect(writeTool.isReadOnly()).toBe(false);
  });

  it("prompt() parameters do NOT contain $schema key", () => {
    const tool = createTestTool();
    const declaration = tool.prompt();
    const params = declaration.parameters as Record<string, unknown>;
    expect(params).not.toHaveProperty("$schema");
  });
});
