import { GoogleGenAI } from "@google/genai";

export interface ArticleForCompilation {
  id: string;
  title: string;
  contentMd: string;
  category: string;
  equipmentBrand: string | null;
  equipmentModel: string | null;
  procedureType: string | null;
  sourceSessionIds: string[] | null;
  version: number;
}

export interface CompiledArticle {
  title: string;
  summary: string;
  contentMd: string;
  tags: string[];
  sourceSessionIds: string[];
}

/**
 * Merge multiple articles about the same equipment/procedure into one authoritative article.
 * Uses LLM to synthesize observations into a comprehensive wiki-style article.
 */
export async function compileArticle(
  articles: ArticleForCompilation[],
  apiKey: string,
): Promise<CompiledArticle> {
  if (articles.length === 0) {
    throw new Error("Cannot compile zero articles");
  }

  // Single article -- just generate a summary
  if (articles.length === 1) {
    const article = articles[0]!;
    return {
      title: article.title,
      summary: await generateSummary(article.contentMd, apiKey),
      contentMd: article.contentMd,
      tags: [],
      sourceSessionIds: article.sourceSessionIds ?? [],
    };
  }

  const model = process.env.GEMINI_SUMMARY_MODEL || "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });

  const articlesText = articles
    .map((a, i) => `--- Article ${i + 1}: "${a.title}" ---\n${a.contentMd}`)
    .join("\n\n");

  const equipment = [articles[0]!.equipmentBrand, articles[0]!.equipmentModel]
    .filter(Boolean)
    .join(" ");

  const prompt = `You are compiling multiple knowledge articles about ${equipment || "an HVAC topic"} into one comprehensive, authoritative wiki article.

SOURCE ARTICLES:
${articlesText}

Combine all observations, procedures, and learnings into ONE structured article. Requirements:
1. Merge duplicate information, keeping the most detailed version
2. Organize with clear markdown headers (##, ###)
3. Include all safety warnings from source articles
4. Preserve specific model numbers, error codes, and measurements
5. Write in a professional, instructional tone suitable for HVAC technicians
6. Add a "Summary" (1-2 sentences) at the top

Respond with JSON:
{
  "title": "Clear descriptive title",
  "summary": "1-2 sentence summary",
  "contentMd": "Full markdown content",
  "tags": ["relevant", "tags"]
}`;

  const result = await ai.models.generateContent({ model, contents: prompt });
  const text = result.text ?? "{}";

  try {
    const parsed = JSON.parse(text);
    const allSessionIds = articles.flatMap((a) => a.sourceSessionIds ?? []);
    return {
      title: parsed.title ?? articles[0]!.title,
      summary: parsed.summary ?? "",
      contentMd: parsed.contentMd ?? articles[0]!.contentMd,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      sourceSessionIds: [...new Set(allSessionIds)],
    };
  } catch {
    // Fallback: return first article with combined session IDs
    const allSessionIds = articles.flatMap((a) => a.sourceSessionIds ?? []);
    return {
      title: articles[0]!.title,
      summary: "",
      contentMd: articles[0]!.contentMd,
      tags: [],
      sourceSessionIds: [...new Set(allSessionIds)],
    };
  }
}

async function generateSummary(contentMd: string, apiKey: string): Promise<string> {
  const model = process.env.GEMINI_SUMMARY_MODEL || "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });

  const result = await ai.models.generateContent({
    model,
    contents: `Summarize this HVAC knowledge article in 1-2 sentences:\n\n${contentMd}`,
  });

  return result.text ?? "";
}
