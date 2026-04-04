export interface PromptLayer {
  id: string;
  content: string;
  required: boolean;
}

export function buildEffectiveSystemPrompt(layers: PromptLayer[]): string {
  return layers
    .filter((layer) => layer.content.trim().length > 0)
    .map((layer) => layer.content.trim())
    .join("\n\n---\n\n");
}
