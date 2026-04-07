---
phase: 7
slug: integration-hardening-tech-debt
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x |
| **Config file** | `vitest.config.ts` (root workspace) + per-package configs |
| **Quick run command** | `bun run --filter @aucta/api test` |
| **Full suite command** | `turbo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `vitest run <changed-test-file>`
- **After every plan wave:** Run `turbo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-XX-01 | 01 | 1 | TOOL-07 | unit | `vitest run packages/api/src/routers/session.router.test.ts -t "tools"` | Extend existing | ⬜ pending |
| 07-XX-02 | 01 | 1 | D-01 | unit | `vitest run packages/ai/src/tools/logFinding/logFinding.test.ts` | Rewrite existing | ⬜ pending |
| 07-XX-03 | 01 | 1 | D-02 | unit | `vitest run packages/api/src/routers/org.router.test.ts` | ❌ W0 (new file) | ⬜ pending |
| 07-XX-04 | 01 | 1 | D-03 | manual | Visual verification on device/simulator | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/api/src/routers/org.router.test.ts` — stubs for D-02 (org.getCurrent with role)
- [ ] Update `session.router.test.ts` — add assertion for tools in liveConnectConstraints (TOOL-07)
- [ ] Rewrite `logFinding.test.ts` — remove InMemoryFindingStore tests, add simplified tool tests (D-01)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Home screen shows org name | D-03 | Visual rendering on device | 1. Login as org member 2. Verify home screen shows org name from API, not "Your Organization" |
| Settings screen shows role | D-03 | Visual rendering on device | 1. Login as org member 2. Navigate to Settings 3. Verify role badge shows actual role, not "Technician" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
