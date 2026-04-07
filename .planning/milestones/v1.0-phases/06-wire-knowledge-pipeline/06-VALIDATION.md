---
phase: 6
slug: wire-knowledge-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `packages/ai/vitest.config.ts`, `packages/api/vitest.config.ts` |
| **Quick run command** | `bun run test --filter=ai --filter=api` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test --filter=ai --filter=api`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | KB-04 | integration | `bun run test --filter=api` | ⬜ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | KB-05 | integration | `bun run test --filter=ai` | ⬜ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | KB-07 | integration | `bun run test --filter=api` | ⬜ W0 | ⬜ pending |
| 06-04-01 | 04 | 2 | KB-08 | integration | `bun run test --filter=ai` | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inngest functions visible in dev UI | KB-04 | Requires running Inngest dev server | Start `npx inngest-cli dev`, verify functions appear |
| Health monitoring cron scheduled | KB-08 | Requires Inngest dashboard inspection | Check Inngest dashboard for cron schedule |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
