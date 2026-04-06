import type { AnyToolDef, GeminiFunctionDeclaration } from "./base.js";

export interface ToolPool {
  tools: Map<string, AnyToolDef>;
  functionDeclarations: GeminiFunctionDeclaration[];
  getTool(name: string): AnyToolDef | undefined;
}

export function assembleToolPool(
  tools: AnyToolDef[],
): ToolPool {
  const toolMap = new Map<string, AnyToolDef>();

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
