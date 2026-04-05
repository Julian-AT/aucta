import type { ArticleCategory, ConfidenceLevel } from "@aucta/shared/schemas/knowledge-article.schema";

export interface KnowledgeSearchResult {
  id: string;
  title: string;
  summary: string | null;
  contentMd: string;
  confidenceLevel: ConfidenceLevel;
  equipmentBrand: string | null;
  equipmentModel: string | null;
  procedureType: string | null;
  category: ArticleCategory;
  score: number;
  attribution: string;
}

export interface KnowledgeSearchOptions {
  query: string;
  orgId: string;
  equipmentBrand?: string;
  equipmentModel?: string;
  limit?: number;
}

export interface HealthCheckResult {
  coverageGaps: Array<{
    equipmentBrand: string;
    equipmentModel: string;
    sessionCount: number;
  }>;
  staleArticles: Array<{
    articleId: string;
    title: string;
    daysSinceUpdate: number;
  }>;
  conflictingArticles: Array<{
    procedureKey: string;
    articleIds: string[];
  }>;
  checkedAt: Date;
}
