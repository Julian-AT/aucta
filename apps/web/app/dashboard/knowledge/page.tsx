import { BookOpen, Search, Tag } from "lucide-react";

interface KnowledgeArticle {
  readonly id: string;
  readonly title: string;
  readonly source: "auto-captured" | "manual";
  readonly category: string;
  readonly createdAt: string;
  readonly usageCount: number;
}

const MOCK_ARTICLES: readonly KnowledgeArticle[] = [
  {
    id: "kb_001",
    title: "Carrier 50XC E4 error code resolution",
    source: "auto-captured",
    category: "Error Codes",
    createdAt: "Apr 10, 2026",
    usageCount: 12,
  },
  {
    id: "kb_002",
    title: "Daikin VRV IV refrigerant charge procedure",
    source: "manual",
    category: "Procedures",
    createdAt: "Apr 9, 2026",
    usageCount: 8,
  },
  {
    id: "kb_003",
    title: "Trane XR15 compressor diagnostics guide",
    source: "auto-captured",
    category: "Diagnostics",
    createdAt: "Apr 8, 2026",
    usageCount: 23,
  },
  {
    id: "kb_004",
    title: "Mitsubishi PURY heat pump winter startup checklist",
    source: "manual",
    category: "Checklists",
    createdAt: "Apr 7, 2026",
    usageCount: 15,
  },
  {
    id: "kb_005",
    title: "Bosch Climate 5000 F7 fault recovery steps",
    source: "auto-captured",
    category: "Error Codes",
    createdAt: "Apr 7, 2026",
    usageCount: 6,
  },
  {
    id: "kb_006",
    title: "Viessmann Vitocal 200-S defrost cycle troubleshooting",
    source: "auto-captured",
    category: "Diagnostics",
    createdAt: "Apr 6, 2026",
    usageCount: 19,
  },
] as const;

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="mt-1 text-muted-foreground">
            Organizational expertise captured from sessions and manual entries.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <BookOpen size={16} />
          New Article
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search articles..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            readOnly
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_ARTICLES.map((article) => (
          <div
            key={article.id}
            className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-snug">{article.title}</h3>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Tag size={12} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{article.category}</span>
            </div>

            <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  article.source === "auto-captured"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {article.source === "auto-captured" ? "Auto-captured" : "Manual"}
              </span>
              <span>Used {article.usageCount} times</span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">{article.createdAt}</p>
          </div>
        ))}
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {MOCK_ARTICLES.length} of 156 articles
      </div>
    </div>
  );
}
