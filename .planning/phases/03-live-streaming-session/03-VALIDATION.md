---
phase: 3
slug: live-streaming-session
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x |
| **Config file** | `packages/ai/vitest.config.ts`, `apps/mobile/vitest.config.ts` |
| **Quick run command** | `bun run test --filter=session` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test --filter=session`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test infrastructure for session module (vitest config, test utils)
- [ ] MSW WebSocket mocks for Gemini Live protocol
- [ ] Shared test fixtures for session state, audio buffers

*Populated by planner based on plan tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Camera preview displays full-screen | UX-01 | Requires physical device camera | Start session on device, verify camera fills screen |
| Audio plays through loudspeaker | SESS-04 | Requires physical audio output | Start session, verify AI speech audible on speaker |
| Background audio continues | SESS-06 | Requires app backgrounding | Start session, press home, verify audio continues |
| Landscape orientation layout | UX-04 | Requires device rotation | Rotate device during session, verify controls reposition |
| Glove-friendly touch targets | UX-03 | Requires physical touch test | Tap stop button wearing work gloves |
| Direct sunlight readability | UX-05 | Requires outdoor environment | View session screen in direct sunlight |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
