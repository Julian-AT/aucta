---
phase: 02-ai-pipeline-and-tool-system
plan: 01
subsystem: ai
tags: [zod, gemini, tools, system-prompt, safety, f-gas, ai-act]

requires:
  - phase: 01-project-setup
    provides: "@aucta/shared ErrorWithCode, generateId, Zod schemas, tsconfig patterns, vitest workspace"
provides:
  - "buildTool() factory for consistent AI tool interface (ToolDef, ToolResult, GeminiFunctionDeclaration)"
  - "buildEffectiveSystemPrompt() for layered prompt assembly"
  - "Core role prompt with AI Act Art. 50 transparency"
  - "Safety rules prompt with F-Gas EU 2024/573, competence boundaries, emergency response"
  - "HVAC expertise prompt with diagnostic approach and trade terminology"
affects: [02-02, 02-03, 03-session-orchestration, 04-session-lifecycle]

tech-stack:
  added: ["@aucta/ai package (new)"]
  patterns: ["buildTool() factory with frozen ToolDef", "z.toJSONSchema() for Gemini function declarations", "layered system prompt with --- separators", "PromptLayer interface for composable prompts"]

key-files:
  created:
    - packages/ai/package.json
    - packages/ai/tsconfig.json
    - packages/ai/vitest.config.ts
    - packages/ai/src/types.ts
    - packages/ai/src/index.ts
    - packages/ai/src/tools/base.ts
    - packages/ai/src/tools/base.test.ts
    - packages/ai/src/prompts/builder.ts
    - packages/ai/src/prompts/builder.test.ts
    - packages/ai/src/prompts/core.ts
    - packages/ai/src/prompts/hvac-expertise.ts
    - packages/ai/src/prompts/safety.ts
  modified: []

key-decisions:
  - "z.toJSONSchema() with $schema and additionalProperties stripping for Gemini compatibility"
  - "ToolDef objects are Object.freeze'd for immutability"
  - "PromptLayer interface with id, content, required fields for composable assembly"

patterns-established:
  - "buildTool() factory: all AI tools created via this factory, returns frozen ToolDef with call/validateInput/prompt/isReadOnly"
  - "ToolResult discriminated union: { success: true, data } | { success: false, error, code } -- tools never throw"
  - "Layered prompts: independent PromptLayer objects joined with --- separators via buildEffectiveSystemPrompt()"
  - "Zod-to-Gemini: z.toJSONSchema() with post-processing to strip $schema and additionalProperties"

requirements-completed: [TOOL-01, TOOL-08, COMP-03, COMP-04, COMP-05]

duration: 3min
completed: 2026-04-04
---

# Phase 2 Plan 1: AI Package Foundation Summary

**buildTool() factory with frozen ToolDef objects and layered system prompt assembly with F-Gas EU 2024/573, competence boundaries, and AI Act transparency**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-04T12:32:06Z
- **Completed:** 2026-04-04T12:35:02Z
- **Tasks:** 2
- **Files created:** 12

## Accomplishments
- Created @aucta/ai package with buildTool() factory that produces frozen ToolDef objects with call, validateInput, prompt, isReadOnly methods
- Implemented layered system prompt assembly (buildEffectiveSystemPrompt) with core role, HVAC expertise, and safety rule layers
- Safety prompt includes F-Gas EU 2024/573 references, competence boundary refusal rules (REFUSE for unlicensed electrical/gas work), and AI guidance disclaimer
- Core prompt includes AI Act Art. 50 transparency ("AI system, not a human expert") and practical colleague communication style
- 25 tests covering all ToolDef methods, prompt content verification, and full assembly

## Task Commits

Each task was committed atomically:

1. **Task 1: packages/ai/ scaffold + buildTool() factory with tests** - `2c1b7d2` (feat)
2. **Task 2: Layered system prompt assembly with safety, F-Gas, and competence boundaries** - `6528930` (feat)

## Files Created/Modified
- `packages/ai/package.json` - Package manifest with zod and @aucta/shared dependencies
- `packages/ai/tsconfig.json` - TypeScript config extending config/tsconfig.library.json
- `packages/ai/vitest.config.ts` - Vitest project config for ai package
- `packages/ai/src/types.ts` - Shared AI pipeline types (ToolContext, ToolResult, GeminiFunctionDeclaration)
- `packages/ai/src/tools/base.ts` - buildTool() factory with frozen ToolDef, Zod validation, error wrapping, JSON Schema conversion
- `packages/ai/src/tools/base.test.ts` - 9 tests for buildTool factory
- `packages/ai/src/prompts/builder.ts` - buildEffectiveSystemPrompt() and PromptLayer interface
- `packages/ai/src/prompts/builder.test.ts` - 16 tests for builder and prompt content
- `packages/ai/src/prompts/core.ts` - Core role prompt with AI Act transparency
- `packages/ai/src/prompts/hvac-expertise.ts` - HVAC domain knowledge prompt
- `packages/ai/src/prompts/safety.ts` - Safety rules with F-Gas, competence boundaries, emergency response
- `packages/ai/src/index.ts` - Public API barrel export

## Decisions Made
- Used z.toJSONSchema() (Zod 4 built-in) instead of hand-rolled converter, with post-processing to strip $schema and additionalProperties keys for Gemini function declaration compatibility
- ToolDef objects are Object.freeze()'d to prevent mutation after creation
- PromptLayer uses a simple { id, content, required } interface -- keeps layers independently testable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- buildTool() factory ready for Plan 02 to create lookupErrorCode and logFinding tools
- buildEffectiveSystemPrompt() ready for Plan 03 to use in ephemeral token endpoint
- ToolDef type system ready for registry (assembleToolPool) and dispatcher in Plan 03

## Self-Check: PASSED

All 12 created files verified present. Both task commits (2c1b7d2, 6528930) verified in git log.

---
*Phase: 02-ai-pipeline-and-tool-system*
*Completed: 2026-04-04*
