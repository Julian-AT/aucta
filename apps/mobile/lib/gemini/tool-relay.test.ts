import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolRelay } from "./tool-relay";

describe("ToolRelay", () => {
  let toolRelay: ToolRelay;
  let mockDispatch: ReturnType<typeof vi.fn>;

  const sampleToolCall = {
    functionCalls: [
      { id: "call-1", name: "lookupErrorCode", args: { errorCode: "E01" } },
      { id: "call-2", name: "logFinding", args: { finding: "Leak detected" } },
    ],
  };

  const sampleResponse = {
    functionResponses: [
      { id: "call-1", name: "lookupErrorCode", response: { found: true, description: "Compressor fault" } },
      { id: "call-2", name: "logFinding", response: { logged: true } },
    ],
  };

  beforeEach(() => {
    mockDispatch = vi.fn();
    toolRelay = new ToolRelay({ dispatchToolCalls: mockDispatch });
  });

  it("relay() sends functionCalls to tRPC endpoint and returns functionResponses", async () => {
    mockDispatch.mockResolvedValue(sampleResponse);

    const result = await toolRelay.relay(sampleToolCall);

    expect(result).toEqual(sampleResponse);
    expect(mockDispatch).toHaveBeenCalledWith({
      functionCalls: sampleToolCall.functionCalls,
    });
  });

  it("relay() passes correct input shape to dispatchToolCalls mutation", async () => {
    mockDispatch.mockResolvedValue(sampleResponse);

    await toolRelay.relay(sampleToolCall);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      functionCalls: [
        { id: "call-1", name: "lookupErrorCode", args: { errorCode: "E01" } },
        { id: "call-2", name: "logFinding", args: { finding: "Leak detected" } },
      ],
    });
  });

  it("relay() on tRPC error returns error responses for each function call with RELAY_ERROR code", async () => {
    mockDispatch.mockRejectedValue(new Error("Network error"));

    const result = await toolRelay.relay(sampleToolCall);

    expect(result.functionResponses).toHaveLength(2);
    expect(result.functionResponses[0]).toEqual({
      id: "call-1",
      name: "lookupErrorCode",
      response: { error: "Tool execution failed", code: "RELAY_ERROR" },
    });
    expect(result.functionResponses[1]).toEqual({
      id: "call-2",
      name: "logFinding",
      response: { error: "Tool execution failed", code: "RELAY_ERROR" },
    });
  });
});
