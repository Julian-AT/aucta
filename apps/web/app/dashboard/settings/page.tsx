import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your organization and application preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Organization</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your organization details.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="org-name" className="block text-sm font-medium">
                Organization Name
              </label>
              <input
                id="org-name"
                type="text"
                defaultValue="HVAC Solutions GmbH"
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                readOnly
              />
            </div>
            <div>
              <label htmlFor="org-timezone" className="block text-sm font-medium">
                Timezone
              </label>
              <input
                id="org-timezone"
                type="text"
                defaultValue="Europe/Berlin (UTC+2)"
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">AI Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure the AI copilot behavior.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="default-lang" className="block text-sm font-medium">
                Default Language
              </label>
              <input
                id="default-lang"
                type="text"
                defaultValue="Auto-detect"
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                readOnly
              />
            </div>
            <div>
              <label htmlFor="safety-level" className="block text-sm font-medium">
                Safety Disclaimer Level
              </label>
              <input
                id="safety-level"
                type="text"
                defaultValue="Standard (EU AI Act compliant)"
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure when and how you receive alerts.
          </p>
          <div className="mt-6 space-y-3">
            {[
              { label: "Session summaries", description: "Email after each session completes" },
              { label: "Expert escalations", description: "Immediate alert when AI escalates" },
              { label: "Weekly reports", description: "Summary email every Monday" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <div className="h-5 w-9 rounded-full bg-primary" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-muted-foreground" />
            <h2 className="text-lg font-semibold">Usage</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Current billing period usage.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>AI Session Minutes</span>
                <span className="font-medium">342 / 1,000</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-primary" style={{ width: "34.2%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>Knowledge Base Articles</span>
                <span className="font-medium">156 / 500</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-primary" style={{ width: "31.2%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>Team Members</span>
                <span className="font-medium">12 / 25</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-primary" style={{ width: "48%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
