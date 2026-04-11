import { Video, CalendarDays, Users, BookOpen } from "lucide-react";

interface StatCardProps {
  readonly title: string;
  readonly value: string;
  readonly description: string;
  readonly icon: React.ReactNode;
}

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

const STATS: readonly StatCardProps[] = [
  {
    title: "Active Sessions",
    value: "3",
    description: "Currently in progress",
    icon: <Video size={20} />,
  },
  {
    title: "Sessions This Week",
    value: "47",
    description: "+12% from last week",
    icon: <CalendarDays size={20} />,
  },
  {
    title: "Team Members",
    value: "12",
    description: "Across 2 teams",
    icon: <Users size={20} />,
  },
  {
    title: "Knowledge Articles",
    value: "156",
    description: "23 added this month",
    icon: <BookOpen size={20} />,
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your organization&apos;s HVAC operations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Recent Sessions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest AI-assisted sessions from your team.
          </p>
          <div className="mt-6 space-y-4">
            {[
              { tech: "Marco R.", unit: "Carrier 50XC", time: "12 min ago", status: "active" },
              { tech: "Elena S.", unit: "Daikin VRV IV", time: "1 hr ago", status: "completed" },
              { tech: "Andrei P.", unit: "Trane XR15", time: "3 hrs ago", status: "completed" },
            ].map((session) => (
              <div
                key={`${session.tech}-${session.time}`}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{session.tech}</p>
                  <p className="text-xs text-muted-foreground">{session.unit}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      session.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {session.status}
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{session.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Knowledge Base Activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recently added articles and learnings.
          </p>
          <div className="mt-6 space-y-4">
            {[
              {
                title: "Carrier 50XC E4 error code resolution",
                source: "Auto-captured from session",
                date: "Today",
              },
              {
                title: "Daikin VRV IV refrigerant charge procedure",
                source: "Manual entry",
                date: "Yesterday",
              },
              {
                title: "Trane XR15 compressor diagnostics",
                source: "Auto-captured from session",
                date: "Apr 8",
              },
            ].map((article) => (
              <div
                key={article.title}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{article.title}</p>
                  <p className="text-xs text-muted-foreground">{article.source}</p>
                </div>
                <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                  {article.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
