import { GoogleGenAI } from "@google/genai";
import { EMBEDDING_CONFIG } from "../core/constants.js";

export interface EmbeddingServiceConfig {
  apiKey: string;
}

export class GeminiEmbeddingService {
  private ai: GoogleGenAI;

  constructor(config: EmbeddingServiceConfig) {
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
  }

  async embedDocument(text: string): Promise<number[]> {
    const truncated = this.truncateIfNeeded(text);
    const result = await this.ai.models.embedContent({
      model: EMBEDDING_CONFIG.MODEL,
      contents: [truncated],
      config: {
        outputDimensionality: EMBEDDING_CONFIG.DIMENSIONS,
        taskType: "RETRIEVAL_DOCUMENT",
      },
    });
    return result.embeddings![0]!.values!;
  }

  async embedQuery(text: string): Promise<number[]> {
    const result = await this.ai.models.embedContent({
      model: EMBEDDING_CONFIG.MODEL,
      contents: [text],
      config: {
        outputDimensionality: EMBEDDING_CONFIG.DIMENSIONS,
        taskType: "RETRIEVAL_QUERY",
      },
    });
    return result.embeddings![0]!.values!;
  }

  /**
   * Rough estimate: 1 token per 4 chars for English text.
   * Truncate to MAX_TOKENS worth of characters if input is oversized.
   */
  private truncateIfNeeded(text: string): string {
    const estimatedTokens = Math.ceil(
      text.length / EMBEDDING_CONFIG.CHARS_PER_TOKEN_ESTIMATE,
    );
    if (estimatedTokens <= EMBEDDING_CONFIG.MAX_TOKENS) return text;

    const maxChars =
      EMBEDDING_CONFIG.MAX_TOKENS * EMBEDDING_CONFIG.CHARS_PER_TOKEN_ESTIMATE;
    return text.slice(0, maxChars);
  }
}
