import { Video, Search } from "lucide-react";

interface Session {
  readonly id: string;
  readonly technician: string;
  readonly unit: string;
  readonly duration: string;
  readonly status: "active" | "completed" | "failed";
  readonly date: string;
  readonly articlesGenerated: number;
}

const MOCK_SESSIONS: readonly Session[] = [
  {
    id: "sess_001",
    technician: "Marco R.",
    unit: "Carrier 50XC",
    duration: "12:34",
    status: "active",
    date: "Apr 10, 2026",
    articlesGenerated: 1,
  },
  {
    id: "sess_002",
    technician: "Elena S.",
    unit: "Daikin VRV IV",
    duration: "28:15",
    status: "completed",
    date: "Apr 10, 2026",
    articlesGenerated: 2,
  },
  {
    id: "sess_003",
    technician: "Andrei P.",
    unit: "Trane XR15",
    duration: "15:42",
    status: "completed",
    date: "Apr 10, 2026",
    articlesGenerated: 0,
  },
  {
    id: "sess_004",
    technician: "Marco R.",
    unit: "Mitsubishi Electric PURY",
    duration: "45:10",
    status: "completed",
    date: "Apr 9, 2026",
    articlesGenerated: 3,
  },
  {
    id: "sess_005",
    technician: "Fatima K.",
    unit: "Bosch Climate 5000",
    duration: "08:22",
    status: "failed",
    date: "Apr 9, 2026",
    articlesGenerated: 0,
  },
  {
    id: "sess_006",
    technician: "Lukas W.",
    unit: "Viessmann Vitocal 200-S",
    duration: "33:05",
    status: "completed",
    date: "Apr 9, 2026",
    articlesGenerated: 1,
  },
] as const;

const STATUS_STYLES: Record<Session["status"], string> = {
  active: "bg-green-100 text-green-800",
  completed: "bg-secondary text-secondary-foreground",
  failed: "bg-red-100 text-red-800",
};

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
        <p className="mt-1 text-muted-foreground">
          View and manage AI-assisted technician sessions.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search sessions..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            readOnly
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Technician
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Unit
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Duration
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  KB Articles
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SESSIONS.map((session) => (
                <tr
                  key={session.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{session.technician}</td>
                  <td className="px-4 py-3 text-muted-foreground">{session.unit}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {session.duration}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[session.status]}`}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{session.date}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {session.articlesGenerated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Showing {MOCK_SESSIONS.length} sessions</p>
        <div className="flex items-center gap-1">
          <Video size={14} />
          <span>3 active now</span>
        </div>
      </div>
    </div>
  );
}
