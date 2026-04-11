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
      this.sendSetupMessage(config);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    this.ws.onclose = (event: CloseEvent) => {
      if (this._intentionalClose) return;
      if (event.code !== 1000) {
        this.deps.onDisconnect(event.code, event.reason);
      }
    };

    this.ws.onerror = (event: Event) => {
      const message =
        (event as { message?: string }).message ?? "WebSocket error";
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
    const setupConfig: Record<string, unknown> = {
      model: `models/${config.model}`,
      responseModalities: ["AUDIO"],
      contextWindowCompression: { slidingWindow: {} },
      sessionResumption: config.resumptionHandle
        ? { handle: config.resumptionHandle }
        : {},
    };

    if (config.toolDeclarations) {
      setupConfig.tools = [
        { functionDeclarations: config.toolDeclarations },
      ];
    }

    this.ws?.send(JSON.stringify({ config: setupConfig }));
  }

  private handleMessage(event: MessageEvent): void {
    const msg: unknown = JSON.parse(event.data as string);

    if (isSetupComplete(msg)) {
      this.deps.onSetupComplete();
      return;
    }

    if (isServerContent(msg)) {
      const content = msg.serverContent;
      if (content.modelTurn?.parts) {
        for (const part of content.modelTurn.parts) {
          if (part.inlineData?.data) {
            this.deps.onAudioData(part.inlineData.data);
          }
        }
      }
      if (content.turnComplete) {
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
