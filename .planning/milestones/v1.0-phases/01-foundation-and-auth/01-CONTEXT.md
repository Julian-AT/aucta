# Phase 1: Foundation and Auth - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up the Turborepo monorepo with all shared packages, Neon Postgres database with Drizzle ORM, Better Auth with organizations/roles/invites, Upstash Redis for rate limiting and caching, CI pipeline, EAS development builds, and a mobile app shell with onboarding, auth screens, and bottom-tab navigation. By the end, technicians can sign up, create or join organizations, and interact with authenticated, org-scoped API endpoints from the mobile app.

</domain>

<decisions>
## Implementation Decisions

### Onboarding Flow
- **D-01:** Split path after sign-up — user chooses "Create organization" or "Join with invite code". Both paths lead to the main app with org context.
- **D-02:** Sign-up collects minimal data: name, email, password. No phone or language preference at sign-up.
- **D-03:** Org creation collects: company name, industry type, and location.

### Invite Code Experience
- **D-04:** 6-character alphanumeric codes, case-insensitive. Easy to read aloud on job sites and type with gloves.
- **D-05:** Join flow shows a preview screen with org name and assigned role before the user confirms. No auto-join.
- **D-06:** Default invite code expiry is 7 days. Owner can set custom expiry when creating a code.
- **D-07:** Invite sharing supports three methods: manual code entry, QR code scanning (device camera), and shareable deep links (for WhatsApp, SMS, messaging apps).

### Mobile App Shell
- **D-08:** Bottom tab bar navigation. Tabs to be determined during planning, but minimum Home + Settings/More.
- **D-09:** Home screen is session-first: one dominant "Start Session" CTA button with minimal chrome. Org name displayed at top. Instructional text below the button. (Session button leads to a placeholder until Phase 3.)
- **D-10:** Phase 1 screens: Login, Sign-up, Org choice (create/join), Org creation form, Join org (code entry + QR scan), Home, Settings/Profile. No session history or analytics placeholders.
- **D-11:** Visual theme: support both light and dark themes. Light (white) is the default. Theme toggle available in settings. Both themes must meet WCAG AAA contrast ratios.

### Role Permissions
- **D-12:** Single org membership per user. A user belongs to exactly one organization.
- **D-13:** Single owner per org with ownership transfer capability.
- **D-14:** Clear three-tier hierarchy:
  - **Owner:** Full control — manage org settings, create/revoke invites for any role, remove members, transfer ownership.
  - **Manager:** Can generate invite codes (technician role only), view team member list, view own profile. Cannot delete org, promote to manager/owner, or change org settings.
  - **Technician:** Can use the app and view own profile only.
- **D-15:** Org-scoped tRPC middleware enforces org_id on every query — no cross-org data access possible at the API layer.

### Claude's Discretion
- Tab bar icon and label choices (Home, Settings, etc.)
- Specific form validation rules and error messages
- Database schema column details beyond what decisions above require
- CI pipeline configuration specifics (GitHub Actions workflow structure)
- Better Auth plugin configuration details
- Loading states, transitions, and micro-interactions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specification
- `TECH-SPEC.md` — Full product spec: tech stack versions, architecture, Gemini integration, data models, system prompt structure. Primary source of truth for implementation details.
- `LEGAL-ADMIN.md` — Legal/regulatory requirements: GDPR, EU AI Act, F-Gas, data residency constraints. Relevant for auth data handling and privacy.

### Architecture Rules
- `agents/rules/architecture-feature-boundaries.md` — Package boundaries: what goes in packages/ vs apps/modules/
- `agents/rules/architecture-vertical-slices.md` — Vertical slice organization by domain
- `agents/rules/data-repository-pattern.md` — Repository pattern: Drizzle stays in repositories, never in services or routers
- `agents/rules/data-dto-boundaries.md` — DTO boundaries: Zod-validated DTOs at every architectural boundary
- `agents/rules/data-drizzle-migrations.md` — Schema change and migration workflow
- `agents/rules/patterns-dependency-injection.md` — Constructor injection for loose coupling
- `agents/rules/quality-error-handling.md` — ErrorWithCode in services, TRPCError only in routers
- `agents/rules/ci-git-workflow.md` — Git workflow, branch strategy, conventional commits
- `agents/rules/quality-pr-creation.md` — PR creation: draft mode, size limits, conventional commit titles
- `agents/rules/testing-coverage-requirements.md` — 80%+ test coverage for new code

### Domain Knowledge
- `agents/knowledge-base.md` — HVAC domain knowledge and AI tool system architecture

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing components, hooks, or utilities.

### Established Patterns
- None yet. Phase 1 establishes the foundational patterns that all subsequent phases follow.

### Integration Points
- Monorepo package structure defined in CLAUDE.md: packages/ai, packages/api, packages/db, packages/auth, packages/shared, packages/config
- Import direction is one-way: shared <- db <- ai <- api <- apps/
- Mobile app lives at apps/mobile/ with Expo Router file-based routing

</code_context>

<specifics>
## Specific Ideas

- Session-first home screen with prominent CTA — the app should feel like a tool, not a social app
- Invite codes designed for job-site conditions: short, alphanumeric, speakable, case-insensitive
- QR scan + share link covers both in-person (supervisor hands phone to technician) and remote (WhatsApp group) invite scenarios
- Light theme default (professional/clean feel) with dark theme available for field conditions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-and-auth*
*Context gathered: 2026-04-03*
