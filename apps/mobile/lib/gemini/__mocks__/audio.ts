export class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  channelData: Map<number, Float32Array> = new Map();

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
  }

  copyToChannel(source: Float32Array, channel: number): void {
    this.channelData.set(channel, new Float32Array(source));
  }

  getChannelData(channel: number): Float32Array {
    return this.channelData.get(channel) ?? new Float32Array(this.length);
  }
}

export class MockAudioBufferSourceNode {
  buffer: MockAudioBuffer | null = null;
  startTime: number | null = null;
  connected = false;

  connect(_destination: unknown): void {
    this.connected = true;
  }

  start(when?: number): void {
    this.startTime = when ?? 0;
  }

  disconnect(): void {
    this.connected = false;
  }
}

export class MockAudioContext {
  sampleRate: number;
  currentTime = 0;
  destination = {};
  state: "running" | "closed" = "running";

  constructor(options?: { sampleRate?: number }) {
    this.sampleRate = options?.sampleRate ?? 44100;
  }

  createBuffer(channels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate });
  }

  createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode();
  }

  async close(): Promise<void> {
    this.state = "closed";
  }
}
