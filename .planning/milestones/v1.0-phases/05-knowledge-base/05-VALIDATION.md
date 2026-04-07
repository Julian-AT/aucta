---
phase: 5
slug: knowledge-base
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x |
| **Config file** | `packages/ai/vitest.config.ts` |
| **Quick run command** | `bun run --filter @aucta/ai test` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run --filter @aucta/ai test`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | KB-01 | unit | `bun run --filter @aucta/ai test` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | KB-02 | unit | `bun run --filter @aucta/ai test` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | KB-03, KB-04, KB-05 | unit + integration | `bun run --filter @aucta/ai test` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | KB-06 | unit | `bun run --filter @aucta/ai test` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 3 | KB-07, KB-08 | unit | `bun run --filter @aucta/ai test` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 3 | KB-09, KB-10 | unit | `bun run --filter @aucta/ai test` | ❌ W0 | ⬜ pending |
| 05-03-03 | 03 | 3 | TOOL-05 | unit | `bun run --filter @aucta/ai test` | ❌ W0 | ⬜ pending |
| 05-03-04 | 03 | 3 | INFRA-07 | integration | `bun run --filter @aucta/ai test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/ai/src/knowledge/__tests__/` — test directory structure
- [ ] `packages/ai/src/knowledge/__tests__/setup.ts` — shared fixtures (mock Qdrant client, mock embedding client, mock repos)
- [ ] Vitest config verified for packages/ai workspace

*Existing vitest infrastructure in packages/ai covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confidence attribution in live session audio | KB-07 | Requires Gemini Live API integration during active session | Start session, ask about known article, verify spoken response includes confidence prefix |
| Qdrant Cloud EU deployment | INFRA-07 | Infrastructure provisioning | Verify collection created in EU region via Qdrant dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
