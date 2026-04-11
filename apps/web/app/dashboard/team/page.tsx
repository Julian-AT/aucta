import { Users, Mail, Shield } from "lucide-react";

interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: "admin" | "technician" | "manager";
  readonly status: "active" | "inactive";
  readonly sessionsThisWeek: number;
}

const MOCK_TEAM: readonly TeamMember[] = [
  {
    id: "usr_001",
    name: "Marco Rossi",
    email: "marco@example.com",
    role: "technician",
    status: "active",
    sessionsThisWeek: 14,
  },
  {
    id: "usr_002",
    name: "Elena Schmidt",
    email: "elena@example.com",
    role: "technician",
    status: "active",
    sessionsThisWeek: 11,
  },
  {
    id: "usr_003",
    name: "Andrei Popescu",
    email: "andrei@example.com",
    role: "technician",
    status: "active",
    sessionsThisWeek: 8,
  },
  {
    id: "usr_004",
    name: "Fatima Kaya",
    email: "fatima@example.com",
    role: "technician",
    status: "inactive",
    sessionsThisWeek: 0,
  },
  {
    id: "usr_005",
    name: "Lukas Weber",
    email: "lukas@example.com",
    role: "manager",
    status: "active",
    sessionsThisWeek: 3,
  },
  {
    id: "usr_006",
    name: "Ana Horvat",
    email: "ana@example.com",
    role: "admin",
    status: "active",
    sessionsThisWeek: 0,
  },
] as const;

const ROLE_STYLES: Record<TeamMember["role"], string> = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  technician: "bg-secondary text-secondary-foreground",
};

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your organization&apos;s technicians and staff.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Mail size={16} />
          Invite Member
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users size={16} />
            <span className="text-sm">Total Members</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{MOCK_TEAM.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield size={16} />
            <span className="text-sm">Active</span>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {MOCK_TEAM.filter((m) => m.status === "active").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users size={16} />
            <span className="text-sm">Technicians</span>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {MOCK_TEAM.filter((m) => m.role === "technician").length}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Sessions (Week)
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TEAM.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{member.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[member.role]}`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${
                        member.status === "active"
                          ? "text-green-700"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          member.status === "active" ? "bg-green-500" : "bg-muted-foreground/40"
                        }`}
                      />
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {member.sessionsThisWeek}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
