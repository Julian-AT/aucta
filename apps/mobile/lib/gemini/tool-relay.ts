/**
 * Dependency interface for ToolRelay.
 * The dispatchToolCalls function is wired to trpcClient.session.dispatchToolCalls.mutate
 * in the orchestration hook (Plan 05). Injecting it as a dependency makes ToolRelay
 * testable without a real tRPC client.
 */
export interface ToolRelayDeps {
  dispatchToolCalls: (input: {
    functionCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>;
  }) => Promise<{
    functionResponses: Array<{ id: string; name: string; response: Record<string, unknown> }>;
  }>;
}

/**
 * Forwards Gemini tool calls to the server via tRPC and returns responses.
 * Only structured JSON data flows through our server -- no audio/video (COMP-06).
 * This is what makes tool calls work without interrupting the audio stream (SESS-06).
 */
export class ToolRelay {
  constructor(private deps: ToolRelayDeps) {}

  /**
   * Relay tool calls to the server for execution.
   * On tRPC failure, returns error responses for each function call
   * with a RELAY_ERROR code so Gemini knows the tool execution failed.
   */
  async relay(toolCall: {
    functionCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>;
  }): Promise<{
    functionResponses: Array<{ id: string; name: string; response: Record<string, unknown> }>;
  }> {
    try {
      return await this.deps.dispatchToolCalls({
        functionCalls: toolCall.functionCalls,
      });
    } catch {
      const errorResponses = toolCall.functionCalls.map((fc) => ({
        id: fc.id,
        name: fc.name,
        response: { error: "Tool execution failed", code: "RELAY_ERROR" },
      }));
      return { functionResponses: errorResponses };
    }
  }
}
