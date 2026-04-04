export interface ToolContext {
  orgId: string;
  userId: string;
  sessionId: string;
}

export type ToolResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
