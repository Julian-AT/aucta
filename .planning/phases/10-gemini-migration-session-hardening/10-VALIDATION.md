---
phase: 10
slug: gemini-migration-session-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x |
| **Config file** | `vitest.config.ts` (root workspace, projects: packages/* + apps/mobile) |
| **Quick run command** | `bun vitest run --project=api` |
| **Full suite command** | `bun vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun vitest run --project=api --project=mobile`
- **After every plan wave:** Run `bun vitest run` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | AI-01 | — | N/A | unit | `bun vitest run packages/api/src/routers/session.router.test.ts -t "model"` | Yes (update assertion) | ⬜ pending |
| 10-01-02 | 01 | 1 | AI-02 | T-10-02 | Auth validated before tool dispatch | integration | Manual deploy test or mock Edge env | Needs new test | ⬜ pending |
| 10-01-03 | 01 | 1 | AI-03 | — | N/A | unit | `bun vitest run packages/api/src/routers/session.router.test.ts -t "prompt"` | Yes (update assertion) | ⬜ pending |
| 10-02-01 | 02 | 1 | SESS-01 | — | N/A | unit | `bun vitest run packages/api/src/services/` | Needs new test file | ⬜ pending |
| 10-02-02 | 02 | 1 | SESS-02 | — | N/A | lint/grep | `grep -c "console\." apps/mobile/lib/gemini/connection.ts` | No test file needed | ⬜ pending |
| 10-02-03 | 02 | 1 | SESS-03 | — | N/A | unit | `bun vitest run apps/mobile/lib/gemini/connection.test.ts` | Needs new test file | ⬜ pending |
| 10-02-04 | 02 | 1 | SESS-04 | — | N/A | unit | `bun vitest run packages/api/src/routers/session.router.test.ts` | Yes (existing covers) | ⬜ pending |
| 10-03-01 | 03 | 2 | COST-01 | — | N/A | unit | `bun vitest run apps/mobile/lib/gemini/vad-filter.test.ts` | Wave 0 (Layer 2) | ⬜ pending |
| 10-03-02 | 03 | 2 | COST-02 | — | N/A | unit | `bun vitest run apps/mobile/lib/gemini/frame-capture.test.ts` | Partial (needs diff test) | ⬜ pending |
| 10-04-01 | 04 | 2 | PRICE-01 | T-10-01 | Atomic session cap check prevents race condition | unit | `bun vitest run packages/api/src/services/session.service.test.ts` | Needs new test | ⬜ pending |
| 10-04-02 | 04 | 2 | PRICE-02 | — | N/A | unit | `bun vitest run packages/api/src/services/usage.service.test.ts` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/api/src/services/session.service.test.ts` — covers AI-01, SESS-01, PRICE-01 (service-level tests for singleton fix and pricing)
- [ ] `apps/mobile/lib/gemini/connection.test.ts` — covers SESS-03 (keepalive test)
- [ ] `packages/api/src/services/usage.service.test.ts` — covers PRICE-02 (usage tracking)
- [ ] `apps/mobile/lib/gemini/vad-filter.test.ts` — covers COST-01 (Layer 2, can be deferred)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Edge Function auth validation | AI-02 | Requires Vercel deployment to test Edge runtime | Deploy to preview, call /api/tools/dispatch without auth token, expect 401 |
| WebSocket keepalive on cellular | SESS-03 | Requires physical device on cellular network | Connect session over LTE, wait 5+ minutes, verify no disconnect |
| CORS after server migration | D-02 | Requires deployed origin to test | Deploy to preview, verify mobile app can reach API routes with CORS headers |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
