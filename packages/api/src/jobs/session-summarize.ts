import { GoogleGenAI } from "@google/genai";
import { SessionRepository } from "@aucta/db/repositories/session.repository";
import { db } from "@aucta/db/client";
import { inngest } from "./inngest-client.js";

// Inngest serializes step.run() results to JSON, converting Date -> string.
// This interface accepts both Date and string for date fields.
interface SessionSummaryInput {
  session: {
    id: string;
    durationMs: number | null;
    languageDetected: string | null;
    tokenCountInput: number | null;
    tokenCountOutput: number | null;
    toolsUsed: string[] | null;
  };
  findings: Array<{
    category: string;
    description: string;
    severity: string;
    equipmentModel: string | null;
    manufacturer: string | null;
  }>;
  toolCalls: Array<{
    toolName: string;
    success: boolean;
    errorMessage: string | null;
  }>;
}

/**
 * Generates a structured markdown summary via Gemini for manager review.
 * Exported separately from the Inngest function for unit testing.
 */
export async function generateSessionSummary(
  data: SessionSummaryInput,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const model =
    process.env.GEMINI_SUMMARY_MODEL || "gemini-2.5-pro";

  const ai = new GoogleGenAI({ apiKey });

  const durationMin = data.session.durationMs
    ? Math.round(data.session.durationMs / 60000)
    : "unknown";

  const findingsList = data.findings
    .map(
      (f) =>
        `- [${f.severity.toUpperCase()}] ${f.category}: ${f.description}${f.equipmentModel ? ` (${f.manufacturer ?? ""} ${f.equipmentModel})` : ""}`,
    )
    .join("\n");

  const toolCallsList = data.toolCalls
    .map(
      (tc) =>
        `- ${tc.toolName}: ${tc.success ? "success" : `failed - ${tc.errorMessage ?? "unknown error"}`}`,
    )
    .join("\n");

  const prompt = `You are generating a session summary for an HVAC technician copilot session.
This summary will be read by managers reviewing technician work. Keep it concise and scannable. Use bullet points.

SESSION DATA:
- Duration: ${durationMin} minutes
- Language: ${data.session.languageDetected ?? "not detected"}
- Tools used: ${data.session.toolsUsed?.join(", ") ?? "none"}
- Token usage: ${data.session.tokenCountInput ?? 0} input / ${data.session.tokenCountOutput ?? 0} output

FINDINGS LOGGED:
${findingsList || "No findings logged."}

TOOL CALL RESULTS:
${toolCallsList || "No tool calls recorded."}

Generate a structured summary with EXACTLY these sections:
### Problem Described
### Steps Taken
### Findings Logged
### Recommendations

If information for a section is not available, write "No data available for this section."`;

  const result = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return result.text ?? "";
}

export const sessionSummarize = inngest.createFunction(
  { id: "session-summarize", retries: 3, triggers: [{ event: "session/ended" }] },
  async ({ event, step }) => {
    const sessionData = await step.run("fetch-session", async () => {
      const sessionRepo = new SessionRepository(db);
      return sessionRepo.findWithDetails(event.data.sessionId);
    });

    if (!sessionData) {
      return { status: "not-found" };
    }

    const summary = await step.run("generate-summary", async () => {
      return generateSessionSummary(sessionData);
    });

    await step.run("save-summary", async () => {
      const sessionRepo = new SessionRepository(db);
      // COMP-07: AI-generated content must be labeled
      return sessionRepo.updateSummary(event.data.sessionId, summary, true);
    });

    return { status: "completed", sessionId: event.data.sessionId };
  },
);
