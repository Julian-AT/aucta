import type { ToolDef, GeminiFunctionDeclaration } from "./base.js";

export interface ToolPool {
  tools: Map<string, ToolDef<unknown, unknown>>;
  functionDeclarations: GeminiFunctionDeclaration[];
  getTool(name: string): ToolDef<unknown, unknown> | undefined;
}

export function assembleToolPool(
  tools: ToolDef<unknown, unknown>[],
): ToolPool {
  const toolMap = new Map<string, ToolDef<unknown, unknown>>();

  for (const tool of tools) {
    if (toolMap.has(tool.name)) {
      throw new Error(`Duplicate tool name: ${tool.name}`);
    }
    toolMap.set(tool.name, tool);
  }

  return {
    tools: toolMap,
    functionDeclarations: tools.map((t) => t.prompt()),
    getTool: (name: string) => toolMap.get(name),
  };
}
