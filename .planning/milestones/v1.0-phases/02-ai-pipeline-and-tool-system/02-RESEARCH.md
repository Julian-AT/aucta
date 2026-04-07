# Phase 2: AI Pipeline and Tool System - Research

**Researched:** 2026-04-04
**Domain:** Gemini Live API integration, tool system architecture, system prompt engineering
**Confidence:** HIGH

## Summary

This phase creates the `packages/ai/` package from scratch and adds a tRPC router for ephemeral Gemini token issuance. The core deliverables are: (1) a `buildTool()` factory enforcing consistent tool structure, (2) a tool registry (`assembleToolPool()`) exporting Gemini function declarations, (3) a tool dispatcher resolving Gemini `toolCall` events to registered tools, (4) two initial tools (`lookupErrorCode` and `logFinding`), (5) a layered system prompt builder with safety disclaimers and F-Gas references, and (6) an ephemeral token endpoint that assembles prompt + tools and issues constrained Gemini tokens.

The `@google/genai` SDK (v1.48.0) provides `client.authTokens.create()` for ephemeral token generation with `liveConnectConstraints` to lock system prompt and tool declarations. Function declarations follow an OpenAPI-like subset schema (name, description, parameters with JSON Schema types). The Live API's `toolCall` events include `functionCalls` with unique `id` fields; responses are sent via `session.sendToolResponse({ functionResponses })` matching each `id`.

No database schema changes are required in this phase. Error code data is static JSON (D-01). logFinding stores to in-memory session metadata (persistence deferred to Phase 4). The `packages/ai/` package must remain framework-agnostic -- no React, no tRPC client imports. The tRPC router for token issuance lives in `packages/api/`.

**Primary recommendation:** Build `packages/ai/` as a pure TypeScript package with zero framework dependencies, using constructor injection for all external concerns, and `@google/genai` as the sole runtime dependency alongside Zod.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Static JSON seed data for v1. Ship with bundled JSON files per manufacturer.
- **D-02:** Cover top 3 brands common in Austrian/EU market: Daikin, Mitsubishi Electric, Fujitsu. ~50-80 error codes total.
- **D-03:** Design the tool interface (repository abstraction) so it can be swapped to a database-backed implementation later without changing the tool contract.
- **D-04:** Practical colleague tone. Like a friendly senior colleague on the radio -- uses trade terminology naturally, avoids jargon overload, direct but not robotic.
- **D-05:** Context-aware safety. Upfront disclaimer at session start, then safety warnings only when the specific task involves risk (refrigerants, electrical, gas). Does not nag on routine work.
- **D-06:** Refuse + redirect on competence boundaries. When a task requires credentials the technician may not have, the AI refuses, explains why, and offers to help document findings.
- **D-07:** 5 core finding categories: safety, maintenance, regulatory, observation, recommendation.
- **D-08:** 4 severity levels: low, medium, high, critical. "Critical" triggers visual flags in session summaries and future dashboard alerts.
- **D-09:** Optional equipment context. Findings include optional equipment_model and manufacturer fields.
- **D-10:** Acknowledge + fallback on missing data. Tool returns structured "not found" response.
- **D-11:** 10-second timeout per tool call. On timeout, return structured error and let AI continue.
- **D-12:** Validation errors returned to Gemini. When Gemini sends invalid input (Zod failure), return structured error response.

### Claude's Discretion
- buildTool() factory API design and internal implementation
- Tool registry and dispatcher architecture
- System prompt layer ordering and exact wording beyond the tone/safety decisions above
- Ephemeral token endpoint implementation details (tRPC procedure vs standalone route)
- Test strategy for tools (unit test structure, mocking approach)
- Error code JSON file structure and organization
- logFinding in-memory storage strategy (pending session persistence in Phase 4)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOOL-01 | buildTool() factory enforcing consistent tool structure: call(), prompt(), validateInput(), isReadOnly(), Zod schemas | Architecture Patterns section: buildTool factory design with ToolDef type |
| TOOL-02 | Tool registry (assembleToolPool) registers all tools and exports Gemini function declarations | Architecture Patterns section: registry pattern, functionDeclarations array format |
| TOOL-03 | Tool dispatcher resolves Gemini toolCall events to matching tools, validates input, returns toolResponse | Architecture Patterns section: dispatcher with id matching, Zod validation, timeout handling |
| TOOL-04 | lookupErrorCode tool: manufacturer + error code -> meaning, repair steps, severity | Code Examples section: error code data structure, repository abstraction |
| TOOL-06 | logFinding tool: logs structured observations to session metadata | Code Examples section: finding schema with 5 categories and 4 severities |
| TOOL-07 | Ephemeral token endpoint: auth, builds layered system prompt, registers tools, issues constrained token | Standard Stack section: @google/genai authTokens.create() API, liveConnectConstraints |
| TOOL-08 | Layered system prompt assembly: core role, HVAC expertise, safety rules, org overlay, AI Act transparency | Architecture Patterns section: buildEffectiveSystemPrompt pattern, layer ordering |
| COMP-03 | Safety disclaimers in system prompt | Code Examples section: safety prompt layer content |
| COMP-04 | AI scope limitation: refuses to guide work outside competence boundaries | Code Examples section: competence boundary rules in safety prompt |
| COMP-05 | F-Gas EU 2024/573 references in AI guidance when handling refrigerants | Code Examples section: F-Gas regulation references in HVAC expertise prompt |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @google/genai | 1.48.0 | Gemini SDK for ephemeral token creation | Unified SDK replacing legacy @google/generative-ai. authTokens.create() for ephemeral tokens with liveConnectConstraints. |
| zod | 4.3.6 | Tool input/output validation | Already used across the project. Validates tool inputs before execution and outputs before returning to Gemini. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @upstash/redis | 1.37.x | Token caching (optional) | Cache ephemeral token metadata for audit/rate-limiting. Already in packages/api. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static JSON error codes | SQLite/Neon table | JSON is simpler for ~80 codes, but D-03 mandates repository abstraction for future swap |
| In-memory finding storage | Immediate DB writes | No DB schema for sessions yet (Phase 4). In-memory Map keyed by session ID is sufficient. |

**Installation:**
```bash
bun add @google/genai zod --filter packages/ai
```

**Version verification:** @google/genai 1.48.0 confirmed via npm registry (2026-04-04). Zod 4.3.6 confirmed. Both packages are already pinned in the project.

## Architecture Patterns

### Recommended Project Structure
```
packages/ai/
  src/
    tools/
      base.ts                        # buildTool() factory, ToolDef type, ToolResult type
      registry.ts                    # assembleToolPool() -- registers tools, exports declarations
      dispatcher.ts                  # toolDispatcher -- resolves toolCall to tool, validates, executes
      lookupErrorCode/
        index.ts                     # call(), validateInput(), isReadOnly(), prompt()
        types.ts                     # Zod input/output schemas
        lookupErrorCode.test.ts      # Co-located tests
      logFinding/
        index.ts
        types.ts
        logFinding.test.ts
    prompts/
      core.ts                        # Core role + AI Act transparency
      hvac-expertise.ts              # HVAC domain knowledge
      safety.ts                      # Safety rules, F-Gas EU 2024/573
      builder.ts                     # buildEffectiveSystemPrompt()
      builder.test.ts
    data/
      error-codes/
        daikin.json                  # Static error code data
        mitsubishi-electric.json
        fujitsu.json
        index.ts                     # ErrorCodeRepository interface + JSON implementation
        error-code-repository.test.ts
    types.ts                         # Shared AI pipeline types
    index.ts                         # Public API exports
  package.json
  tsconfig.json
  vitest.config.ts
```

### Pattern 1: buildTool() Factory
**What:** A factory function that enforces a consistent interface for every tool. Returns a frozen `ToolDef` object.
**When to use:** Every tool in the system must be created via buildTool().

```typescript
// packages/ai/src/tools/base.ts
import { z } from "zod";

export interface ToolDef<TInput, TOutput> {
  name: string;
  description: string;
  call: (input: TInput, context: ToolContext) => Promise<ToolResult<TOutput>>;
  validateInput: (raw: unknown) => TInput;
  prompt: () => GeminiFunctionDeclaration;
  isReadOnly: () => boolean;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
}

export interface ToolContext {
  orgId: string;
  userId: string;
  sessionId: string;
}

export type ToolResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
}

export function buildTool<TInput, TOutput>(config: {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  isReadOnly: boolean;
  call: (input: TInput, context: ToolContext) => Promise<TOutput>;
}): ToolDef<TInput, TOutput> {
  return Object.freeze({
    name: config.name,
    description: config.description,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,

    validateInput(raw: unknown): TInput {
      return config.inputSchema.parse(raw);
    },

    async call(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>> {
      try {
        const data = await config.call(input, context);
        return { success: true, data };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message, code: "TOOL_ERROR" };
      }
    },

    prompt(): GeminiFunctionDeclaration {
      return {
        name: config.name,
        description: config.description,
        parameters: zodToJsonSchema(config.inputSchema),
      };
    },

    isReadOnly(): boolean {
      return config.isReadOnly;
    },
  });
}
```

**Key design decisions:**
- `call()` wraps exceptions into `ToolResult` so the dispatcher never throws -- it always returns structured data to Gemini (D-10, D-12).
- `validateInput()` uses Zod `.parse()` and throws `ZodError` on invalid input. The dispatcher catches this and returns a structured validation error to Gemini (D-12).
- `prompt()` converts the Zod schema to JSON Schema for Gemini function declarations. Use `z.toJSONSchema()` (Zod 4 built-in) instead of a hand-rolled converter.
- `isReadOnly()` classifies tools for potential future parallel execution optimizations.

### Pattern 2: Zod to JSON Schema Conversion
**What:** Convert Zod schemas to the JSON Schema subset that Gemini function declarations expect.
**When to use:** In every tool's `prompt()` method.

```typescript
// Zod 4 has built-in JSON Schema conversion
import { z } from "zod";

const schema = z.object({
  manufacturer: z.string().describe("Equipment manufacturer name"),
  errorCode: z.string().describe("The error code displayed on the unit"),
});

// Zod 4 built-in conversion
const jsonSchema = z.toJSONSchema(schema);
// Result: { type: "object", properties: { manufacturer: { type: "string", description: "..." }, ... }, required: [...] }
```

### Pattern 3: Tool Registry (assembleToolPool)
**What:** Central registry that collects all tools and exports their Gemini function declarations as a single array.
**When to use:** When building the ephemeral token request -- the registry provides the `tools[].functionDeclarations` array.

```typescript
// packages/ai/src/tools/registry.ts
import type { ToolDef, GeminiFunctionDeclaration } from "./base.js";

export interface ToolPool {
  tools: Map<string, ToolDef<unknown, unknown>>;
  functionDeclarations: GeminiFunctionDeclaration[];
  getTool(name: string): ToolDef<unknown, unknown> | undefined;
}

export function assembleToolPool(
  tools: ToolDef<unknown, unknown>[]
): ToolPool {
  const toolMap = new Map<string, ToolDef<unknown, unknown>>();

  for (const tool of tools) {
    if (toolMap.has(tool.name)) {
      throw new Error(`Duplicate tool name: ${tool.name}`);
    }
    toolMap.set(tool.name, tool);
  }

  return {
    tools: toolMap,
    functionDeclarations: tools.map((t) => t.prompt()),
    getTool: (name: string) => toolMap.get(name),
  };
}
```

### Pattern 4: Tool Dispatcher
**What:** Resolves incoming Gemini `toolCall` events to registered tools, validates input via Zod, executes with timeout, and returns structured `toolResponse`.
**When to use:** In the session orchestrator (Phase 3) when processing WebSocket messages from Gemini.

```typescript
// packages/ai/src/tools/dispatcher.ts
import type { ToolPool, ToolContext, ToolResult } from "./base.js";
import { ZodError } from "zod";

export interface ToolCallEvent {
  functionCalls: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
}

export interface ToolResponseMessage {
  functionResponses: Array<{
    id: string;
    name: string;
    response: Record<string, unknown>;
  }>;
}

const DEFAULT_TIMEOUT_MS = 10_000; // D-11: 10-second timeout

export async function dispatchToolCalls(
  toolCall: ToolCallEvent,
  pool: ToolPool,
  context: ToolContext,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ToolResponseMessage> {
  const functionResponses = await Promise.all(
    toolCall.functionCalls.map(async (fc) => {
      const tool = pool.getTool(fc.name);

      if (!tool) {
        return {
          id: fc.id,
          name: fc.name,
          response: { error: `Unknown tool: ${fc.name}`, code: "TOOL_NOT_FOUND" },
        };
      }

      try {
        // Validate input via Zod (D-12: validation errors returned to Gemini)
        const validatedInput = tool.validateInput(fc.args);

        // Execute with timeout (D-11)
        const result = await Promise.race([
          tool.call(validatedInput, context),
          timeout(timeoutMs),
        ]);

        if (result.success) {
          return { id: fc.id, name: fc.name, response: result.data };
        }
        return { id: fc.id, name: fc.name, response: { error: result.error, code: result.code } };
      } catch (error) {
        if (error instanceof ZodError) {
          return {
            id: fc.id,
            name: fc.name,
            response: {
              error: `Invalid input: ${error.issues.map((i) => i.message).join(", ")}`,
              code: "VALIDATION_ERROR",
            },
          };
        }
        if (error instanceof TimeoutError) {
          return {
            id: fc.id,
            name: fc.name,
            response: { error: "Tool execution timed out", code: "TIMEOUT" },
          };
        }
        return {
          id: fc.id,
          name: fc.name,
          response: { error: "Internal tool error", code: "INTERNAL_ERROR" },
        };
      }
    }),
  );

  return { functionResponses };
}
```

### Pattern 5: Layered System Prompt Assembly
**What:** Assembles the system instruction from multiple independent layers, concatenated with clear section separators.
**When to use:** When creating an ephemeral token -- the assembled prompt is locked into the token via `liveConnectConstraints`.

```typescript
// packages/ai/src/prompts/builder.ts
export interface PromptLayer {
  id: string;
  content: string;
  required: boolean;
}

export function buildEffectiveSystemPrompt(layers: PromptLayer[]): string {
  return layers
    .filter((layer) => layer.content.trim().length > 0)
    .map((layer) => layer.content.trim())
    .join("\n\n---\n\n");
}
```

### Pattern 6: Ephemeral Token Endpoint (tRPC)
**What:** An org-scoped tRPC procedure that authenticates the user, builds the system prompt, registers tool declarations, and calls `authTokens.create()` on the Gemini SDK.
**When to use:** Called by the mobile app before starting a Live API session.

```typescript
// packages/api/src/routers/session.router.ts (token procedure)
// Uses orgProcedure (auth + org-scope middleware chain)
// Calls packages/ai/ for prompt assembly and tool declarations
// Calls @google/genai for ephemeral token creation
// Returns: { token, sessionId, config }
```

**Key config for authTokens.create():**
```typescript
const token = await client.authTokens.create({
  config: {
    uses: 1,
    expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
    httpOptions: { apiVersion: "v1alpha" },
    liveConnectConstraints: {
      model: "gemini-2.5-flash-live-preview",
      config: {
        systemInstruction: assembledPrompt,
        responseModalities: ["AUDIO"],
        // tools are declared on the client setup message, not in constraints
      },
    },
  },
});
```

### Anti-Patterns to Avoid
- **Drizzle in packages/ai/:** The AI package must never import from drizzle-orm. Data access goes through repository interfaces injected via constructor.
- **tRPC imports in packages/ai/:** Use ErrorWithCode for all errors. The tRPC router in packages/api/ catches and converts.
- **String concatenation for prompts:** Use the layered builder pattern. Each layer is testable independently.
- **Catching and silencing tool errors:** Always return structured error responses to Gemini so it can inform the technician (D-10, D-12).
- **Hardcoded API keys:** The GEMINI_API_KEY env var is only read in the token endpoint (packages/api/), never in packages/ai/.
- **Barrel file re-exports in tools/:** Each tool directory exports directly. The registry imports individual tools.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zod to JSON Schema | Custom schema converter | `z.toJSONSchema()` (Zod 4 built-in) | Gemini function declarations need JSON Schema. Zod 4 has this built-in. |
| UUID generation | crypto.randomUUID() alone | Existing `generateId()` from @aucta/shared/utils/id | Project uses prefixed IDs (ses_, org_, etc.). findingId should use `generateId("fnd")`. |
| Error handling in AI package | Custom error classes | Existing `ErrorWithCode` from @aucta/shared/utils/errors | Already established pattern. AI package uses ErrorWithCode, routers convert to TRPCError. |
| Rate limiting for token endpoint | Custom middleware | Existing `tokenLimiter` from packages/api/middleware/rate-limit | Already configured at 5/minute per user. Token endpoint reuses this. |

**Key insight:** The codebase already has established patterns for error handling, ID generation, rate limiting, and middleware chains. The AI package should plug into these, not create parallel systems.

## Common Pitfalls

### Pitfall 1: Gemini API Version for Ephemeral Tokens
**What goes wrong:** Using the default API version instead of `v1alpha` causes ephemeral token creation to fail.
**Why it happens:** Ephemeral tokens and Live API require `apiVersion: 'v1alpha'` as of April 2026.
**How to avoid:** Always pass `httpOptions: { apiVersion: 'v1alpha' }` in the authTokens.create() config.
**Warning signs:** "Invalid API version" or "Feature not available" errors from the Gemini SDK.

### Pitfall 2: Tool ID Matching in Dispatcher
**What goes wrong:** Sending a `toolResponse` with a mismatched `id` causes Gemini to ignore the result or error.
**Why it happens:** Each `functionCall` in a `toolCall` event has a unique `id`. The response must include the exact same `id`.
**How to avoid:** Always propagate `fc.id` directly into the response object. Never generate new IDs.
**Warning signs:** Gemini repeats the same tool call or ignores tool results entirely.

### Pitfall 3: Zod 4 toJSONSchema() Output Format
**What goes wrong:** Gemini rejects the function declaration parameters because the JSON Schema wrapper includes unexpected top-level keys.
**Why it happens:** `z.toJSONSchema()` may produce a full JSON Schema with `$schema` and other metadata. Gemini expects a subset.
**How to avoid:** Extract only the `type`, `properties`, and `required` fields from the output. Strip `$schema`, `$ref`, and `additionalProperties` if present.
**Warning signs:** Gemini returns errors about invalid tool declarations or refuses to call tools.

### Pitfall 4: System Prompt Size Limits
**What goes wrong:** The assembled system prompt exceeds Gemini's context limits, causing token creation to fail or degrade performance.
**Why it happens:** Layered prompts with safety rules, HVAC expertise, org overlay, and knowledge context can grow large.
**How to avoid:** Keep static layers (core, safety, HVAC) under 2000 tokens total. Org overlay is user-controlled (validate max length). Knowledge context and session history are dynamic (Phase 4+).
**Warning signs:** Slow model responses, ignored instructions, or API errors.

### Pitfall 5: ErrorWithCode Not Imported Correctly in AI Package
**What goes wrong:** Circular dependencies or missing exports when packages/ai imports from @aucta/shared.
**Why it happens:** The import direction packages/shared <- packages/ai is correct, but the exports map in packages/shared/package.json must cover the utils path.
**How to avoid:** Verify that `@aucta/shared/utils/errors` resolves correctly. The existing exports map `"./utils/*": "./src/utils/*.ts"` covers this.
**Warning signs:** TypeScript resolution errors or "module not found" at runtime.

### Pitfall 6: Timeout Race Condition in Dispatcher
**What goes wrong:** After a timeout, the tool's promise continues executing and may cause side effects.
**Why it happens:** `Promise.race()` resolves with the timeout but does not cancel the original promise.
**How to avoid:** For side-effecting tools (like logFinding), use AbortController to signal cancellation. For read-only tools (like lookupErrorCode), the orphaned promise is harmless.
**Warning signs:** Duplicate findings logged, or stale results returned after a timeout response was already sent.

## Code Examples

Verified patterns from the existing codebase and Gemini SDK documentation:

### Error Code JSON Data Structure (D-01, D-02)
```typescript
// packages/ai/src/data/error-codes/daikin.json
{
  "manufacturer": "Daikin",
  "codes": [
    {
      "code": "U4",
      "meaning": "Communication error between indoor and outdoor units",
      "severity": "high",
      "repairSteps": [
        "Check wiring connections between indoor and outdoor units",
        "Verify power supply to outdoor unit",
        "Check for damaged communication cables",
        "Reset the system by turning off power for 30 seconds",
        "If persists, check the PCB for damage"
      ],
      "possibleCauses": [
        "Loose or damaged wiring",
        "PCB failure",
        "Power supply issue"
      ],
      "equipmentTypes": ["split", "multi-split", "VRV"]
    }
  ]
}
```

### ErrorCodeRepository Interface (D-03)
```typescript
// packages/ai/src/data/error-codes/index.ts
export interface ErrorCodeEntry {
  manufacturer: string;
  code: string;
  meaning: string;
  severity: "low" | "medium" | "high" | "critical";
  repairSteps: string[];
  possibleCauses: string[];
  equipmentTypes: string[];
}

export interface ErrorCodeRepository {
  lookup(manufacturer: string, code: string): Promise<ErrorCodeEntry | null>;
  listManufacturers(): Promise<string[]>;
}

// JSON-backed implementation (v1)
export class JsonErrorCodeRepository implements ErrorCodeRepository {
  private data: Map<string, ErrorCodeEntry[]>;

  constructor() {
    this.data = new Map();
    // Load JSON files at construction time
  }

  async lookup(manufacturer: string, code: string): Promise<ErrorCodeEntry | null> {
    const entries = this.data.get(manufacturer.toLowerCase());
    if (!entries) return null;
    return entries.find((e) => e.code.toUpperCase() === code.toUpperCase()) ?? null;
  }

  async listManufacturers(): Promise<string[]> {
    return Array.from(this.data.keys());
  }
}
```

### logFinding Tool Schema (D-07, D-08, D-09)
```typescript
// packages/ai/src/tools/logFinding/types.ts
import { z } from "zod";

export const FindingCategory = z.enum([
  "safety",
  "maintenance",
  "regulatory",
  "observation",
  "recommendation",
]);

export const FindingSeverity = z.enum(["low", "medium", "high", "critical"]);

export const LogFindingInput = z.object({
  category: FindingCategory.describe("Category of the finding"),
  description: z.string().min(1).max(1000).describe("Detailed description of the finding"),
  severity: FindingSeverity.describe("Severity level of the finding"),
  equipmentModel: z.string().optional().describe("Equipment model if identifiable"),
  manufacturer: z.string().optional().describe("Equipment manufacturer if identifiable"),
});

export const LogFindingOutput = z.object({
  findingId: z.string(),
  recorded: z.boolean(),
  message: z.string(),
});
```

### In-Memory Finding Store
```typescript
// packages/ai/src/tools/logFinding/index.ts
// Findings stored in-memory, keyed by sessionId
// Persisted to DB in Phase 4 when session lifecycle is implemented

export interface FindingStore {
  add(sessionId: string, finding: Finding): string;
  getBySession(sessionId: string): Finding[];
}

export class InMemoryFindingStore implements FindingStore {
  private findings = new Map<string, Finding[]>();

  add(sessionId: string, finding: Finding): string {
    const id = generateId("fnd");
    const entry = { ...finding, id, timestamp: new Date() };
    const existing = this.findings.get(sessionId) ?? [];
    existing.push(entry);
    this.findings.set(sessionId, existing);
    return id;
  }

  getBySession(sessionId: string): Finding[] {
    return this.findings.get(sessionId) ?? [];
  }
}
```

### System Prompt Layers (D-04, D-05, D-06, COMP-03, COMP-04, COMP-05)
```typescript
// packages/ai/src/prompts/core.ts
export const coreRolePrompt: PromptLayer = {
  id: "core-role",
  content: `You are Aucta, an AI copilot for HVAC technicians. You provide real-time guidance during service, maintenance, and installation work.

IMPORTANT: You are an AI system, not a human expert. This interaction is AI-generated guidance and does not replace professional training, certification, or the technician's own judgment.

Communication style:
- Speak like a friendly, experienced colleague -- direct, practical, using trade terminology naturally
- Be concise during active work. Save detailed explanations for when the technician asks
- Adapt to the technician's language automatically
- When you identify equipment, mention the model to confirm recognition`,
  required: true,
};

// packages/ai/src/prompts/safety.ts
export const safetyRulesPrompt: PromptLayer = {
  id: "safety-rules",
  content: `SAFETY RULES (always active):

1. ELECTRICAL WORK: When you see or the technician mentions electrical panels, wiring, or high-voltage components, remind about lockout/tagout procedures before any work begins.

2. REFRIGERANT HANDLING (F-Gas EU 2024/573):
   - Leak-check requirements apply to equipment with >= 5 tonnes CO2 equivalent refrigerant charge
   - Reference current low-GWP alternatives (R-290, CO2, R-32) when discussing new installations
   - Remind about proper recovery procedures -- never vent refrigerants
   - If you cannot confirm the technician holds valid F-Gas certification, note this and suggest they verify

3. COMPETENCE BOUNDARIES:
   - If a task requires a licensed electrician (high-voltage wiring, panel modifications), REFUSE to guide the work. Explain that this requires a licensed electrician and offer to document findings for handoff.
   - If a task involves gas work beyond HVAC scope, REFUSE and redirect to a qualified gas engineer.
   - When uncertain about certification requirements, err on the side of caution and recommend verification.

4. EMERGENCY RESPONSE: If the technician describes a gas leak, electrical shock, injury, or any emergency, provide immediate first-response guidance and advise calling emergency services (112 in the EU).

5. AI GUIDANCE DISCLAIMER: Your guidance does not replace professional training or certification. The technician is responsible for all decisions on the job site.`,
  required: true,
};
```

### Ephemeral Token Creation
```typescript
// In packages/api/ -- the tRPC router for token creation
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const token = await client.authTokens.create({
  config: {
    uses: 1,
    expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
    httpOptions: { apiVersion: "v1alpha" },
    liveConnectConstraints: {
      model: "gemini-2.5-flash-live-preview",
      config: {
        systemInstruction: systemPrompt,
        responseModalities: ["AUDIO"],
      },
    },
  },
});

// token.name is the ephemeral API key to return to the client
// NEVER log token.name or expose in error messages
```

### Gemini Function Declaration Format
```typescript
// What Gemini expects in the setup message tools array
const toolDeclarations = {
  functionDeclarations: [
    {
      name: "lookupErrorCode",
      description: "Look up the meaning and repair steps for an HVAC error code displayed on equipment",
      parameters: {
        type: "object",
        properties: {
          manufacturer: {
            type: "string",
            description: "Equipment manufacturer name (e.g., Daikin, Mitsubishi Electric, Fujitsu)",
          },
          errorCode: {
            type: "string",
            description: "The error code displayed on the unit (e.g., U4, E3, 01)",
          },
        },
        required: ["manufacturer", "errorCode"],
      },
    },
    {
      name: "logFinding",
      description: "Record an observation, safety concern, or recommendation during the session",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["safety", "maintenance", "regulatory", "observation", "recommendation"],
            description: "Category of the finding",
          },
          description: {
            type: "string",
            description: "Detailed description of the finding",
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "Severity level",
          },
          equipmentModel: {
            type: "string",
            description: "Equipment model if identifiable",
          },
          manufacturer: {
            type: "string",
            description: "Equipment manufacturer if identifiable",
          },
        },
        required: ["category", "description", "severity"],
      },
    },
  ],
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @google/generative-ai | @google/genai (unified SDK) | 2025 | Single SDK for all Gemini features including Live API and ephemeral tokens |
| Manual JSON Schema for tools | z.toJSONSchema() (Zod 4) | 2026 | Built-in conversion eliminates manual schema writing |
| Server-side WebSocket proxy | Ephemeral tokens (client-direct) | 2025 | Mobile connects directly to Gemini; no audio/video touches our servers |
| Custom error classes per package | Shared ErrorWithCode | Phase 1 | Established in Phase 1, reuse in packages/ai/ |

**Deprecated/outdated:**
- `@google/generative-ai`: Legacy SDK. Replaced by `@google/genai`. Do not install.
- `zod-to-openapi` for JSON Schema: Zod 4 has built-in `z.toJSONSchema()`. Evaluate if the built-in covers Gemini's requirements before adding third-party.

## Open Questions

1. **z.toJSONSchema() compatibility with Gemini function declarations**
   - What we know: Zod 4 has built-in JSON Schema conversion. Gemini accepts an OpenAPI-like subset.
   - What's unclear: Whether z.toJSONSchema() output needs post-processing (stripping $schema, etc.) to match Gemini's expectations exactly.
   - Recommendation: Test the output format in Wave 0. If incompatible, write a thin adapter function that extracts only `type`, `properties`, `required` from the Zod output. Do NOT hand-roll a full Zod-to-JSON-Schema converter.

2. **Gemini model name for Live API**
   - What we know: Documentation shows `gemini-3.1-flash-live-preview` in recent examples. The TECH-SPEC references `gemini-2.5-flash-live-preview`.
   - What's unclear: Which model name is current. Gemini model names change with releases.
   - Recommendation: Make the model name configurable (env var `GEMINI_LIVE_MODEL`). Default to what the SDK accepts at runtime. The liveConnectConstraints lock the model per-token.

3. **Behavior.NON_BLOCKING for tool declarations**
   - What we know: The Gemini SDK supports `behavior: Behavior.NON_BLOCKING` on function declarations, allowing async tool execution while audio continues.
   - What's unclear: Whether NON_BLOCKING is required for good UX in this phase (tools are not called from a live session yet).
   - Recommendation: Declare all tools with NON_BLOCKING behavior since that matches the production use case. It does not affect Phase 2 testing (which tests tools via unit tests, not live sessions).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Runtime + package manager | Verified | 1.3.8 | -- |
| Node.js | Metro, some tooling | Verified | Available | -- |
| @google/genai | Ephemeral token creation | Via npm | 1.48.0 | -- |
| GEMINI_API_KEY env var | Token endpoint | Not in .env.example | -- | Must be added |
| Neon Postgres | Existing DB (no new tables this phase) | Verified | Available | -- |
| Upstash Redis | Rate limiting (existing) | Verified | Available | -- |

**Missing dependencies with no fallback:**
- `GEMINI_API_KEY` must be added to `.env.example` and `.env.local` for the ephemeral token endpoint to work.

**Missing dependencies with fallback:**
- None. All code dependencies are available via npm.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `packages/ai/vitest.config.ts` (Wave 0 -- create) |
| Quick run command | `bun vitest run --filter ai` |
| Full suite command | `bun run test` (Turborepo runs all packages) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOOL-01 | buildTool() creates valid ToolDef with all methods | unit | `bun vitest run packages/ai/src/tools/base.test.ts -x` | Wave 0 |
| TOOL-02 | assembleToolPool registers tools and exports declarations | unit | `bun vitest run packages/ai/src/tools/registry.test.ts -x` | Wave 0 |
| TOOL-03 | dispatchToolCalls resolves to correct tool, validates input, handles timeout | unit | `bun vitest run packages/ai/src/tools/dispatcher.test.ts -x` | Wave 0 |
| TOOL-04 | lookupErrorCode returns correct data for Daikin/Mitsubishi/Fujitsu codes | unit | `bun vitest run packages/ai/src/tools/lookupErrorCode/lookupErrorCode.test.ts -x` | Wave 0 |
| TOOL-06 | logFinding stores finding with correct category, severity, optional equipment | unit | `bun vitest run packages/ai/src/tools/logFinding/logFinding.test.ts -x` | Wave 0 |
| TOOL-07 | Token endpoint creates ephemeral token with locked prompt + tools | unit | `bun vitest run packages/api/src/routers/session.router.test.ts -x` | Wave 0 |
| TOOL-08 | buildEffectiveSystemPrompt assembles layers in correct order | unit | `bun vitest run packages/ai/src/prompts/builder.test.ts -x` | Wave 0 |
| COMP-03 | Safety disclaimers present in assembled system prompt | unit | `bun vitest run packages/ai/src/prompts/builder.test.ts -x` | Wave 0 |
| COMP-04 | System prompt contains competence boundary refusal rules | unit | `bun vitest run packages/ai/src/prompts/builder.test.ts -x` | Wave 0 |
| COMP-05 | F-Gas EU 2024/573 references present in system prompt | unit | `bun vitest run packages/ai/src/prompts/builder.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun vitest run --filter ai`
- **Per wave merge:** `bun run test` (full Turborepo test suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/ai/vitest.config.ts` -- Vitest project config (defineProject, name: "ai")
- [ ] `packages/ai/tsconfig.json` -- TypeScript config extending config/tsconfig.library.json
- [ ] `packages/ai/package.json` -- Package manifest with dependencies (@google/genai, zod, @aucta/shared)
- [ ] `packages/ai/src/tools/base.test.ts` -- buildTool() factory tests
- [ ] `packages/ai/src/tools/registry.test.ts` -- assembleToolPool() tests
- [ ] `packages/ai/src/tools/dispatcher.test.ts` -- dispatchToolCalls() tests
- [ ] `packages/ai/src/prompts/builder.test.ts` -- buildEffectiveSystemPrompt() tests including COMP-03/04/05

## Project Constraints (from CLAUDE.md)

These directives from CLAUDE.md and agents/rules/ must be honored in all plans:

- **Repository pattern:** All database access through Repository classes. Drizzle never appears in services or AI tools. (data-repository-pattern.md)
- **DTO boundaries:** Zod-validated DTOs at every architectural boundary. Never leak Drizzle types. (data-dto-boundaries.md)
- **Constructor injection:** Services and tools receive dependencies through constructor injection. Use deps interface for 2+ dependencies. (patterns-dependency-injection.md)
- **ErrorWithCode in services/packages/ai:** TRPCError only in tRPC routers. (quality-error-handling.md)
- **Vertical slices:** Organize by domain, not by technical layer. Each tool is a self-contained directory. (architecture-vertical-slices.md)
- **Feature boundaries:** packages/ai/ is framework-agnostic (no React, no tRPC client). Import direction: shared <- db <- ai <- api. (architecture-feature-boundaries.md)
- **Comment policy:** Only comment why, never what. (quality-code-comments.md)
- **Test coverage:** 80%+ for new code. Co-located tests (tool.test.ts next to tool/index.ts). (testing-coverage-requirements.md)
- **Conventional commits:** feat(ai): prefix for new AI tools, test(ai): for tests. (ci-git-workflow.md)
- **PR size:** Under 500 LOC, under 10 files. Split by layer. (quality-pr-creation.md)
- **No force push, no skipping hooks.** (ci-git-workflow.md)
- **Simplicity over cleverness:** Linear sequences in tool call(), flat state, no nested promise chains. (quality-simplicity.md)

## Sources

### Primary (HIGH confidence)
- Gemini ephemeral tokens documentation: https://ai.google.dev/gemini-api/docs/ephemeral-tokens -- authTokens.create() API, liveConnectConstraints, TTL defaults, single-use semantics
- Gemini function calling documentation: https://ai.google.dev/gemini-api/docs/function-calling -- functionDeclarations format, toolCall/toolResponse protocol, id matching
- Gemini Live API tools documentation: https://ai.google.dev/gemini-api/docs/live-tools -- session.sendToolResponse(), Behavior.NON_BLOCKING, FunctionResponseScheduling
- Gemini system instructions: https://ai.google.dev/gemini-api/docs/system-instructions -- systemInstruction config property
- Existing codebase: packages/shared/src/utils/errors.ts, packages/api/src/middleware/, packages/api/src/routers/org.router.ts -- established patterns
- @google/genai npm registry: v1.48.0 confirmed (2026-04-04)

### Secondary (MEDIUM confidence)
- F-Gas EU 2024/573 regulation details from LEGAL-ADMIN.md -- low-GWP requirements, leak-check thresholds, 7-year certification refresher
- TECH-SPEC.md system prompt layers and tool system architecture -- project-specific design decisions

### Tertiary (LOW confidence)
- z.toJSONSchema() compatibility with Gemini function declarations -- not verified against live API, needs testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- @google/genai v1.48.0 confirmed, Zod 4.3.6 confirmed, all from npm registry
- Architecture: HIGH -- buildTool/registry/dispatcher patterns derived from TECH-SPEC.md and CONTEXT.md locked decisions, validated against Gemini SDK documentation
- Pitfalls: MEDIUM -- API version requirement and id matching confirmed from docs; z.toJSONSchema() compatibility not tested live

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days -- Gemini Live API is Preview, may change)
