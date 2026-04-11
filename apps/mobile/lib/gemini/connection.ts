import {
  GEMINI_WS_URL,
  AUDIO_INPUT_MIME,
  isSetupComplete,
  isServerContent,
  isToolCall,
  isSessionResumptionUpdate,
  isGoAway,
} from "./protocol";

export interface GeminiConnectionDeps {
  onAudioData: (pcmBase64: string) => void;
  onToolCall: (toolCall: {
    functionCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  }) => void;
  onTurnComplete: () => void;
  onResumptionUpdate: (handle: string) => void;
  onGoAway: (timeLeft: string | undefined) => void;
  onSetupComplete: () => void;
  onDisconnect: (code: number, reason: string) => void;
  onError: (error: string) => void;
}

export interface GeminiConnectionConfig {
  token: string;
  model: string;
  toolDeclarations?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  resumptionHandle?: string | null;
}

/**
 * React Native WebSocket may deliver `data` as a string, ArrayBuffer, or — in some
 * builds — an already-parsed object. Parsing a non-string coerces to "[object Object]"
 * and breaks JSON.parse (error at character 'o').
 */
function parseIncomingWsPayload(data: unknown): unknown {
  if (typeof data === "string") {
    return JSON.parse(data);
  }
  if (data instanceof ArrayBuffer) {
    return JSON.parse(new TextDecoder().decode(data));
  }
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return JSON.parse(
      new TextDecoder().decode(
        view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength),
      ),
    );
  }
  if (data !== null && typeof data === "object") {
    return data;
  }
  throw new TypeError(`Unsupported WebSocket message payload: ${typeof data}`);
}

export class GeminiConnection {
  private ws: WebSocket | null = null;
  private _intentionalClose = false;
  private readonly deps: GeminiConnectionDeps;

  constructor(deps: GeminiConnectionDeps) {
    this.deps = deps;
  }

  connect(config: GeminiConnectionConfig): void {
    this._intentionalClose = false;

    const url = `${GEMINI_WS_URL}?access_token=${config.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("[GeminiWS] Connected, sending setup...");
      this.sendSetupMessage(config);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    this.ws.onclose = (event: CloseEvent) => {
      console.log(`[GeminiWS] Closed: code=${event.code} reason=${event.reason}`);
      if (this._intentionalClose) return;
      if (event.code !== 1000) {
        this.deps.onDisconnect(event.code, event.reason);
      }
    };

    this.ws.onerror = (event: Event) => {
      const message =
        (event as { message?: string }).message ?? "WebSocket error";
      console.error("[GeminiWS] Error:", message);
      this.deps.onError(message);
    };
  }

  sendAudio(pcmBase64: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          audio: { data: pcmBase64, mimeType: AUDIO_INPUT_MIME },
        },
      }),
    );
  }

  sendVideo(jpegBase64: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          video: { data: jpegBase64, mimeType: "image/jpeg" },
        },
      }),
    );
  }

  sendToolResponse(
    functionResponses: Array<{
      id: string;
      name: string;
      response: Record<string, unknown>;
    }>,
  ): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({ toolResponse: { functionResponses } }),
    );
  }

  close(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      this._intentionalClose = true;
      this.ws.close(1000, "client-close");
    }
    this.ws = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private sendSetupMessage(config: GeminiConnectionConfig): void {
    // The BidiGenerateContentConstrained endpoint (ephemeral tokens) uses
    // "setup" as the top-level field, NOT "config" (which is for the regular
    // BidiGenerateContent endpoint). Model, responseModalities, tools, and
    // systemInstruction are already locked in the token's liveConnectConstraints
    // — only session-level fields belong here.
    const setup: Record<string, unknown> = {
      contextWindowCompression: { slidingWindow: {} },
      sessionResumption: config.resumptionHandle
        ? { handle: config.resumptionHandle }
        : {},
    };

    this.ws?.send(JSON.stringify({ setup }));
  }

  private handleMessage(event: MessageEvent): void {
    const raw = event.data;

    if (typeof Blob !== "undefined" && raw instanceof Blob) {
      void raw.text().then(
        (text) => {
          try {
            this.processGeminiMessage(JSON.parse(text));
          } catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            console.warn("[GeminiWS] Failed to parse Blob frame:", detail);
            this.deps.onError(`Invalid Gemini message: ${detail}`);
          }
        },
        () => {
          this.deps.onError("Failed to read WebSocket Blob frame");
        },
      );
      return;
    }

    let msg: unknown;
    try {
      msg = parseIncomingWsPayload(raw);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.warn("[GeminiWS] Failed to parse message:", detail);
      this.deps.onError(`Invalid Gemini message: ${detail}`);
      return;
    }

    this.processGeminiMessage(msg);
  }

  private processGeminiMessage(msg: unknown): void {
    if (isSetupComplete(msg)) {
      console.log("[GeminiWS] Setup complete");
      this.deps.onSetupComplete();
      return;
    }

    if (isServerContent(msg)) {
      const content = msg.serverContent;
      if (content.modelTurn?.parts) {
        const audioChunks = content.modelTurn.parts.filter(
          (p) => p.inlineData?.data,
        );
        if (audioChunks.length > 0) {
          console.log(`[GeminiWS] Audio data: ${audioChunks.length} chunk(s)`);
        }
        for (const part of content.modelTurn.parts) {
          if (part.inlineData?.data) {
            this.deps.onAudioData(part.inlineData.data);
          }
        }
      }
      if (content.turnComplete) {
        console.log("[GeminiWS] Turn complete");
        this.deps.onTurnComplete();
      }
      return;
    }

    if (isToolCall(msg)) {
      this.deps.onToolCall(msg.toolCall);
      return;
    }

    if (isSessionResumptionUpdate(msg)) {
      const update = msg.sessionResumptionUpdate;
      if (update.resumable && update.newHandle) {
        this.deps.onResumptionUpdate(update.newHandle);
      }
      return;
    }

    if (isGoAway(msg)) {
      this.deps.onGoAway(msg.goAway.timeLeft);
      return;
    }
  }
}
