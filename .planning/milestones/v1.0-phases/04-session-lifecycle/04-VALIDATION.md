---
phase: 4
slug: session-lifecycle
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x |
| **Config file** | vitest.workspace.ts (root) + per-package vitest.config.ts |
| **Quick run command** | `bun run test -- --run` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test -- --run`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SESS-11 | unit | `bun run test -- --run packages/db` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | SESS-11 | unit | `bun run test -- --run packages/db` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | SESS-11 | unit | `bun run test -- --run packages/api` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | INFRA-08 | unit | `bun run test -- --run apps/server` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | SESS-12 | unit | `bun run test -- --run packages/ai` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | SESS-10 | unit | `bun run test -- --run apps/mobile` | ❌ W0 | ⬜ pending |
| 04-05-01 | 05 | 3 | UX-06 | unit | `bun run test -- --run apps/mobile` | ❌ W0 | ⬜ pending |
| 04-05-02 | 05 | 3 | COMP-07 | unit | `bun run test -- --run apps/mobile` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for session repository (packages/db)
- [ ] Test stubs for session tRPC endpoints (packages/api)
- [ ] Test stubs for Inngest summary job (packages/ai or apps/server)
- [ ] Test stubs for feedback screen (apps/mobile)
- [ ] Test stubs for MMKV cache layer (apps/mobile)

*Existing vitest infrastructure covers framework needs — only test file stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Feedback screen appears after session end | SESS-10 | Requires device camera + Gemini session | End a live session on device, verify feedback screen shows |
| MMKV offline access | UX-06 | Requires airplane mode on device | Complete a session, enable airplane mode, verify summaries load |
| AI-generated badge visible | COMP-07 | Visual verification | Check summary card on Home screen has "AI-generated" badge |
| No emotion recognition | COMP-08 | Absence verification | Review codebase for sentiment/emotion keywords — grep confirmation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
