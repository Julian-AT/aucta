---
phase: 2
slug: ai-pipeline-and-tool-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x |
| **Config file** | `packages/ai/vitest.config.ts` (Wave 0 — create) |
| **Quick run command** | `bun vitest run --filter ai` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun vitest run --filter ai`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | TOOL-01 | unit | `bun vitest run packages/ai/src/tools/base.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | TOOL-02 | unit | `bun vitest run packages/ai/src/tools/registry.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | TOOL-03 | unit | `bun vitest run packages/ai/src/tools/dispatcher.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 0 | TOOL-08, COMP-03, COMP-04, COMP-05 | unit | `bun vitest run packages/ai/src/prompts/builder.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | TOOL-04 | unit | `bun vitest run packages/ai/src/tools/lookupErrorCode/lookupErrorCode.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | TOOL-06 | unit | `bun vitest run packages/ai/src/tools/logFinding/logFinding.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | TOOL-07 | unit | `bun vitest run packages/api/src/routers/session.router.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/ai/vitest.config.ts` — Vitest project config (defineProject, name: "ai")
- [ ] `packages/ai/tsconfig.json` — TypeScript config extending config/tsconfig.library.json
- [ ] `packages/ai/package.json` — Package manifest with dependencies (@google/genai, zod, @aucta/shared)
- [ ] `packages/ai/src/tools/base.test.ts` — buildTool() factory tests
- [ ] `packages/ai/src/tools/registry.test.ts` — assembleToolPool() tests
- [ ] `packages/ai/src/tools/dispatcher.test.ts` — dispatchToolCalls() tests
- [ ] `packages/ai/src/prompts/builder.test.ts` — buildEffectiveSystemPrompt() tests including COMP-03/04/05

*Existing infrastructure covers API package (packages/api) testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ephemeral token connects to Gemini Live | TOOL-07 | Requires live Gemini API key | Create token, connect WebSocket, verify handshake |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
