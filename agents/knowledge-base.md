# Knowledge Base — Domain & Product-Specific Information

This file contains domain knowledge about the Aucta product and codebase. For coding rules, see [`rules/`](rules/).

## Session Lifecycle

An AI session goes through these states:

```
IDLE → CONNECTING → ACTIVE → DISCONNECTED → RECONNECTING → ACTIVE
                      │                                       │
                      └──────────→ COMPLETED ←───────────────┘
                      └──────────→ FAILED
                      └──────────→ TIMEOUT
```

- **IDLE:** No session in progress
- **CONNECTING:** WebSocket handshake with Gemini Live API
- **ACTIVE:** Streaming audio/video to Gemini, receiving responses
- **DISCONNECTED:** Connection lost (poor connectivity on job site)
- **RECONNECTING:** Attempting reconnection with `sessionResumption` token (max 2 min window)
- **COMPLETED:** Session ended normally (user tap or voice command)
- **FAILED:** Unrecoverable error (auth failure, token expired, server error)
- **TIMEOUT:** No activity for configured duration

After COMPLETED or FAILED, an Inngest job (`session.summarize`) fires to generate the session summary and extract knowledge.

## Gemini WebSocket Protocol

The mobile app connects directly to Google's Gemini 2.5 Flash Live API via WebSocket. No audio or video touches Aucta servers.

**Connection flow:**
1. Mobile calls tRPC `session.createToken` → API verifies auth + org → builds system prompt + tool declarations → requests ephemeral token from Gemini → returns token + config to mobile
2. Mobile opens WSS to Gemini using the ephemeral token
3. Mobile sends `setup` message (model, voice, systemInstruction, tools)
4. Bidirectional streaming begins: JPEG frames (1 FPS, 768px) + PCM audio (16kHz/16-bit/mono) → Gemini → PCM audio (24kHz) + text + toolCalls

**Ephemeral tokens:**
- Short-lived, constrained to specific system prompt + tools
- Never stored in client state beyond the session
- Never logged or exposed in error messages
- Issued per-session, not reusable

**Session resumption:**
- Gemini provides a `sessionResumption` opaque token on connection
- On disconnect, the mobile app can reconnect using this token within ~2 minutes
- Beyond the 2-minute window, a fresh session must be created

**Tool calling:**
- Tools are declared in the `setup` message as `tools[].functionDeclarations`
- Gemini sends `toolCall` events; the `toolDispatcher` resolves them to registered tools
- Tool calls execute while audio continues streaming (async function calling)
- Results are sent back as `toolResponse` messages
- Timeout: 10 seconds per tool call (configurable)

## AI Tool System

10 HVAC-specific tools registered in `packages/ai/src/tools/registry.ts`:

| Tool | What it does | Safety-critical? |
|------|-------------|-----------------|
| `lookupErrorCode` | Finds error code meaning + repair steps | No |
| `getEquipmentSpecs` | Retrieves specs for a model number | No |
| `getWiringDiagram` | Finds relevant manual section/diagram | No |
| `calculateRefrigerantCharge` | Computes target charge in kg | **Yes** — F-Gas |
| `checkSafetyRecall` | Checks for active safety recalls | **Yes** |
| `getOrgProcedure` | Fetches org-specific custom procedures | No |
| `logFinding` | Records a finding during session | No |
| `identifyPart` | Identifies part from description/visual | No |
| `searchKnowledgeBase` | RAG search over knowledge articles | No |
| `escalateToExpert` | Triggers human expert handoff | **Yes** |

Each tool is a self-contained directory with `index.ts` (call + validate), `prompt.ts` (Gemini function declaration), `types.ts` (Zod schemas), and a co-located test file.

## Knowledge Base Confidence Levels

Articles have one of four confidence levels:

| Level | Source | Dashboard Badge | AI Attribution |
|-------|--------|----------------|---------------|
| `unverified` | AI-extracted from session | Yellow | "Based on unverified observation..." |
| `technician_reviewed` | Experienced tech confirmed | Blue | "Based on technician-confirmed procedure..." |
| `expert_approved` | Manager/senior tech signed off | Green | "Based on verified procedure..." |
| `manufacturer_sourced` | From uploaded manual/API | Purple | "Per manufacturer documentation..." |

Confidence level must be accurate. Marking AI-generated content as `manufacturer_sourced` is a compliance violation.

## Organization and Tenant Isolation

Both organizations and users are stored in Better Auth's managed tables.

**Critical rule:** Every database query that returns user-facing data MUST include `org_id` filtering. This is enforced in tRPC middleware — individual router procedures should not need to add it themselves.

**Roles:**
- `owner` — full access, billing, settings, data export
- `manager` — team management, knowledge verification, analytics
- `technician` — own sessions, cached knowledge, personal stats

**Key permissions:** `org:sessions:view`, `org:sessions:manage`, `org:team:invite`, `org:team:manage`, `org:settings:edit`, `org:billing:manage`, `org:analytics:view`, `org:knowledge:verify`

## Knowledge Base Architecture

The knowledge base follows a 5-phase flywheel: Ingest → Compile → Verify → Retrieve → Health.

- **Ingest:** Session data, technician feedback, manual uploads (PDF via ColPali), manufacturer data
- **Compile:** LLM generates/updates wiki articles from raw data (markdown + frontmatter)
- **Verify:** Humans review AI-generated content via dashboard verification queue
- **Retrieve:** Hybrid search (BM25 + vector via Qdrant) with cross-encoder reranking
- **Health:** LLM audits for inconsistencies, coverage gaps, stale articles

Per-org knowledge is isolated. Global knowledge (manufacturer specs, regulatory info) is shared.

## Inngest Job Naming

All Inngest jobs follow the pattern `domain.action`:

- `session.summarize` — post-session summary generation
- `knowledge.ingest` — extract learnings from completed session
- `knowledge.compile` — process uploaded PDF manuals
- `analytics.aggregate` — daily rollup (cron: 02:00 UTC)
- `billing.meter` — hourly usage tracking
- `gdpr.export` / `gdpr.delete` — GDPR data requests
- `email.sessionSummary` — send summary to manager
- `invite.expire` — mark expired invite codes (cron: 00:00 UTC)
- `audit.archive` — archive old audit logs (cron: monthly)

All jobs must be idempotent — they may be retried by Inngest.

## System Prompt Layers

The system prompt is assembled from layers via `buildEffectiveSystemPrompt()`:

1. Core role + AI Act transparency disclosure
2. HVAC expertise + safety rules (F-Gas EU 2024/573, lockout/tagout)
3. Organization overlay (free text from dashboard settings)
4. Knowledge base context (retrieved articles with confidence tags)
5. Session history (aggregated technician experience)

Modifying layers 1-2 requires careful review (safety implications). Layer 3 is user-controlled. Layer 4-5 are dynamic per-session.

## NativeWind v5 on Mobile

NativeWind v5 with Tailwind CSS v4 requires:
- React Native 0.83.x+ (Expo SDK 55 provides this)
- Reanimated v4+ (4.3.x)
- New Architecture (Fabric) enabled — default in Expo SDK 55
- `nativewind/babel` plugin in `babel.config.js`
- Tailwind v4 CSS-first config

Use `className` prop on all React Native components. Never use inline `style` objects on mobile.

## Regulatory Context

- **EU AI Act Art. 50:** Non-dismissible AI indicator during sessions. AI must identify itself.
- **F-Gas EU 2024/573:** Refrigerant calculations above 5 tonnes CO2eq must be logged. Certification tracking.
- **GDPR:** Art. 12-14 (transparency), Art. 30 (records of processing), Art. 32 (security measures). Data residency in EU (Neon Frankfurt, Upstash EU, Qdrant EU).
