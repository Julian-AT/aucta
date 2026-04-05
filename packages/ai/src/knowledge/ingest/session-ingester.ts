import { GoogleGenAI } from "@google/genai";

/**
 * Plain interface for Inngest JSON serialization compatibility.
 * Mirrors the shape from SessionRepository.findWithDetails() but uses
 * primitive types only (no Date objects).
 */
export interface SessionIngestionInput {
  session: {
    id: string;
    orgId: string;
    languageDetected: string | null;
    summary: string | null;
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
  }>;
}

export interface CandidateArticle {
  title: string;
  contentMd: string;
  category: "equipment" | "procedure" | "safety" | "regulatory" | "troubleshooting";
  equipmentBrand: string | null;
  equipmentModel: string | null;
  procedureType: string | null;
  tags: string[];
}

/**
 * Extract reusable knowledge from a completed session's data via Gemini.
 * Returns candidate articles that can be stored in the knowledge base.
 */
export async function extractLearnings(
  data: SessionIngestionInput,
  apiKey: string,
): Promise<CandidateArticle[]> {
  if (data.findings.length === 0 && !data.session.summary) {
    return [];
  }

  const model = process.env.GEMINI_SUMMARY_MODEL || "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });

  const findingsList = data.findings
    .map(
      (f) =>
        `- [${f.severity}] ${f.category}: ${f.description}${f.equipmentModel ? ` (${f.manufacturer ?? ""} ${f.equipmentModel})` : ""}`,
    )
    .join("\n");

  const prompt = `You are extracting reusable knowledge from an HVAC technician's AI copilot session.
Analyze the session data below and output JSON array of knowledge article candidates.

SESSION SUMMARY:
${data.session.summary ?? "No summary available."}

FINDINGS LOGGED:
${findingsList || "No findings logged."}

TOOL CALLS: ${data.toolCalls.map((tc) => tc.toolName).join(", ") || "None"}

For each distinct piece of reusable knowledge, output a JSON object with:
- title: Clear, descriptive title (e.g., "Daikin FTXM25 E3 Error Code Resolution")
- contentMd: Detailed markdown content with steps, observations, and context. Include safety warnings where relevant.
- category: One of "equipment", "procedure", "safety", "regulatory", "troubleshooting"
- equipmentBrand: Brand name if identifiable (e.g., "Daikin"), null otherwise
- equipmentModel: Model number if identifiable (e.g., "FTXM25"), null otherwise
- procedureType: Type of procedure if applicable (e.g., "error_diagnosis", "compressor_replacement"), null otherwise
- tags: Array of relevant tags (e.g., ["error-code", "E3", "outdoor-unit"])

Rules:
- Only extract genuinely reusable knowledge, not trivial observations
- If the session has no meaningful learnings, return an empty array []
- Each article should be self-contained and useful to another technician facing the same issue
- Include safety disclaimers where relevant (refrigerant handling, electrical work)

Respond with ONLY the JSON array, no surrounding text.`;

  const result = await ai.models.generateContent({ model, contents: prompt });
  const text = result.text ?? "[]";

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is CandidateArticle =>
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        "contentMd" in item &&
        "category" in item,
    );
  } catch {
    return [];
  }
}
