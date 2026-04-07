---
phase: 1
slug: foundation-and-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test -- --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test -- --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFRA-01 | unit | `bun run test` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | AUTH-01 | unit | `bun run test` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | AUTH-02 | unit | `bun run test` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | AUTH-05 | unit | `bun run test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — root vitest config with workspace support
- [ ] `packages/shared/src/**/*.test.ts` — stubs for shared schemas
- [ ] `packages/db/src/**/*.test.ts` — stubs for repository tests
- [ ] `packages/api/src/**/*.test.ts` — stubs for tRPC router tests

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Session persists across app restart | AUTH-02 | Requires physical device restart | 1. Log in on device 2. Force-quit app 3. Reopen — user stays logged in |
| QR code scan joins org | AUTH-06 | Requires camera interaction | 1. Generate invite code 2. Display QR 3. Scan with second device 4. Verify org membership |
| EAS dev build works on device | INFRA-06 | Requires physical device + EAS | 1. Run `eas build --profile development` 2. Install on device 3. Verify app launches |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
