---
title: Auth Checks in page.tsx, Never in layout.tsx
impact: HIGH
tags: architecture, auth, next.js
---

## Auth Checks in page.tsx, Never in layout.tsx

**Impact: HIGH**

Permission and auth checks belong in `page.tsx`, never in `layout.tsx`. Layouts are shared across routes and re-render on navigation — putting auth there causes redundant checks and unpredictable behavior.

**Incorrect:**

```typescript
// apps/web/app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session, "org:analytics:view")) redirect("/unauthorized");
  return <DashboardShell>{children}</DashboardShell>;
}
```

**Correct:**

```typescript
// apps/web/app/(dashboard)/analytics/page.tsx
export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session, "org:analytics:view")) redirect("/unauthorized");
  return <AnalyticsView />;
}

// apps/web/app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>;
}
```

Layouts handle shell UI (sidebar, nav, footer). Pages handle auth gates and data fetching for that specific route.
