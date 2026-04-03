# Requirements: Aucta

**Defined:** 2026-04-03
**Core Value:** A technician points their phone camera at HVAC equipment, speaks naturally in any language, and receives expert-level spoken guidance in real time.

## v1 Requirements

Requirements for the first milestone. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Turborepo monorepo with Bun, TypeScript 6 strict, Biome linting/formatting
- [x] **INFRA-02**: Shared packages structure: ai, api, db, auth, shared, config with correct import boundaries
- [ ] **INFRA-03**: EAS development builds configured for physical device testing (audio/camera require dev builds, not Expo Go)
- [ ] **INFRA-04**: CI pipeline: Biome lint, TypeScript typecheck, Vitest tests, Turborepo build with remote caching
- [ ] **INFRA-05**: Neon Postgres (EU Frankfurt) with Drizzle ORM schema, migrations, and repository pattern
- [ ] **INFRA-06**: Upstash Redis (EU) configured for rate limiting and ephemeral token caching
- [ ] **INFRA-07**: Qdrant vector DB (EU) configured for knowledge base embeddings and hybrid search
- [ ] **INFRA-08**: Inngest background job handler on Next.js API route

### Authentication & Organization

- [ ] **AUTH-01**: User can create account with email and password via Better Auth
- [ ] **AUTH-02**: User can log in and session persists across app restarts (expo-secure-store on mobile)
- [ ] **AUTH-03**: User can create an organization and become its owner
- [ ] **AUTH-04**: Owner can generate invite codes with role assignment (technician/manager) and expiry
- [ ] **AUTH-05**: Technician can join an organization by entering invite code or scanning QR
- [ ] **AUTH-06**: Role-based access control enforced: owner, manager, technician with distinct permissions
- [ ] **AUTH-07**: Org-scoped tRPC middleware enforces org_id on every query — no cross-org data access possible
- [ ] **AUTH-08**: Rate limiting on auth endpoints (10/min), token creation (5/min), and general API (100/min)

### AI Pipeline & Tools

- [ ] **TOOL-01**: buildTool() factory that enforces consistent tool structure: call(), prompt(), validateInput(), isReadOnly(), Zod schemas
- [ ] **TOOL-02**: Tool registry (assembleToolPool) that registers all tools and exports Gemini function declarations
- [ ] **TOOL-03**: Tool dispatcher that resolves Gemini toolCall events to matching tools, validates input, returns toolResponse
- [ ] **TOOL-04**: lookupErrorCode tool: given manufacturer + error code, returns meaning, repair steps, severity
- [ ] **TOOL-05**: searchKnowledgeBase tool: hybrid search (BM25 + vector) with confidence-weighted retrieval and source attribution
- [ ] **TOOL-06**: logFinding tool: logs structured observations (category, description, severity) to session metadata
- [ ] **TOOL-07**: Ephemeral token endpoint: authenticates user, builds layered system prompt, registers tool declarations, issues short-lived Gemini token with locked constraints
- [ ] **TOOL-08**: Layered system prompt assembly: core role, HVAC expertise, safety rules, org overlay, knowledge base context, session history, AI Act transparency

### Live Session

- [ ] **SESS-01**: Technician can start a live AI session within two taps from app launch
- [ ] **SESS-02**: Camera streams JPEG frames (1 FPS, 768px, base64) to Gemini Live via WebSocket
- [ ] **SESS-03**: Microphone streams PCM audio (16kHz, 16-bit, mono) to Gemini Live via WebSocket
- [ ] **SESS-04**: AI spoken guidance streams back as PCM audio (24kHz) and plays through device speaker in real time
- [ ] **SESS-05**: Gemini auto-detects technician's language and responds in the same language (24+ languages, 30 HD voices)
- [ ] **SESS-06**: Tool calls execute mid-conversation without interrupting audio stream (async function calling)
- [ ] **SESS-07**: Context window compression (SlidingWindow) configured in setup message to support sessions >10 minutes
- [ ] **SESS-08**: Reconnection with exponential backoff (1s → 2s → 4s → max 30s) using Gemini sessionResumption handle
- [ ] **SESS-09**: Technician can end session by tapping stop button or saying "end session"
- [ ] **SESS-10**: Post-session feedback prompt: 1-5 stars + optional text note
- [ ] **SESS-11**: Session data persisted: start/end time, duration, language detected, tools used, feedback, token count
- [ ] **SESS-12**: Post-session summary generated via Inngest background job (AI summarizes session events)

### Knowledge Base

- [ ] **KB-01**: Knowledge article schema with 4-tier confidence levels (unverified, technician_reviewed, expert_approved, manufacturer_sourced)
- [ ] **KB-02**: Hybrid search via Qdrant: BM25-like sparse vectors + dense semantic vectors + metadata filters (org_id, equipment_model), combined with Reciprocal Rank Fusion
- [ ] **KB-03**: Retrieval weights confidence level: verified articles rank above unverified by default
- [ ] **KB-04**: Session ingestion pipeline: extract learnings from completed sessions, generate candidate articles (Inngest job)
- [ ] **KB-05**: Article compilation: LLM generates/updates structured wiki articles (markdown + metadata) from raw session data
- [ ] **KB-06**: Article categorization: organize by equipment brand → model → procedure type with auto-generated backlinks
- [ ] **KB-07**: Verification queue: pending articles await review, status transitions (pending → approved/rejected/needs_revision)
- [ ] **KB-08**: Health monitoring: coverage gap detection (which equipment models lack documentation), stale article detection, consistency checking
- [ ] **KB-09**: Source attribution in AI responses: "Based on unverified observation..." vs "Per manufacturer documentation..." depending on confidence level
- [ ] **KB-10**: Manual text knowledge input: org owners can add custom procedures/tips as structured articles via API

### Mobile UX

- [ ] **UX-01**: Glove-friendly touch targets (minimum 56x56dp) for all interactive elements during session
- [ ] **UX-02**: High-contrast UI readable in direct sunlight (WCAG AAA contrast ratios)
- [ ] **UX-03**: Audio-first interaction: no typing required during active session
- [ ] **UX-04**: Works in portrait and landscape orientation
- [ ] **UX-05**: Screen stays awake during active session (expo-keep-awake)
- [ ] **UX-06**: Offline cached references: recent session summaries and frequently used KB articles cached via MMKV
- [ ] **UX-07**: Clear connection status indicator: "Connected", "Reconnecting...", "Connection lost" with last AI response visible
- [ ] **UX-08**: Visual feedback during AI processing (animated indicator showing AI is thinking/speaking)

### EU Compliance

- [ ] **COMP-01**: Non-dismissible AI indicator visible throughout entire session (EU AI Act Art. 50) — cannot be covered by modals, keyboard, or rotation
- [ ] **COMP-02**: AI disclosure at session start: "You are interacting with an AI system, not a human expert"
- [ ] **COMP-03**: Safety disclaimers in system prompt: "AI guidance does not replace professional training or certification"
- [ ] **COMP-04**: AI scope limitation: refuses to guide work outside competence boundaries (electrical requiring licensed electrician, gas work without F-Gas cert)
- [ ] **COMP-05**: F-Gas EU 2024/573 references in AI guidance when handling refrigerants (leak-check thresholds, low-GWP alternatives)
- [ ] **COMP-06**: Stream-and-discard architecture verified: no audio/video stored on our servers, only session metadata
- [ ] **COMP-07**: AI-generated content labels on session summaries and knowledge base articles
- [ ] **COMP-08**: No emotion recognition: session quality measured only by explicit feedback and objective metrics

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Dashboard UI

- **DASH-01**: Overview page with live activity, key numbers, trends, alerts
- **DASH-02**: Session explorer with search, filter, detail view, transcript viewer
- **DASH-03**: Team management: technician roster, invite flow, roles, profiles
- **DASH-04**: Analytics: usage trends, cost analysis, quality metrics, language breakdown
- **DASH-05**: Knowledge base management UI: article browser, verification queue, manual upload, health dashboard
- **DASH-06**: Organization settings: company profile, AI configuration, escalation contacts, data retention

### Additional AI Tools

- **TOOL-09**: getEquipmentSpecs: model number → specs, installation date, warranty status
- **TOOL-10**: getWiringDiagram: model number → relevant manual section/diagram reference
- **TOOL-11**: calculateRefrigerantCharge: model + line length → target charge, refrigerant type
- **TOOL-12**: checkSafetyRecall: model number → active recalls, safety notices
- **TOOL-13**: getOrgProcedure: procedure type → org-specific custom procedure text
- **TOOL-14**: identifyPart: description + visual context → part number, supplier, cost
- **TOOL-15**: escalateToExpert: context summary + urgency → push notification to senior tech

### Advanced Features

- **ADV-01**: Equipment identification via dataplate OCR from camera
- **ADV-02**: Expert escalation with AI-packaged context handoff
- **ADV-03**: On-device AI fallback via Gemma 4 E2B (LiteRT) for offline guidance
- **ADV-04**: Session recording with opt-in GDPR consent
- **ADV-05**: PDF manual upload with ColPali multimodal RAG processing
- **ADV-06**: Public REST API auto-generated from Zod schemas via zod-to-openapi
- **ADV-07**: Stripe billing integration for web dashboard
- **ADV-08**: RevenueCat mobile subscription management
- **ADV-09**: Cross-organization learning with anonymized pattern sharing

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Pre-authored SOP/workflow builder | Augmentir's model — requires massive content investment before value. Our AI reasons in real time. |
| Hardware dependency (smart glasses, wearables) | BrightAI's model — adds adoption friction. Smartphone-only eliminates barriers. |
| FSM replacement (scheduling, dispatch, invoicing) | ServiceTitan's territory — we complement, not compete |
| Emotion recognition / sentiment analysis | EU AI Act explicitly prohibits workplace emotion recognition |
| Autonomous safety decisions | Product Liability Directive — AI guides, technician decides |
| Gamification / leaderboards | Creates perverse incentives, ruins trust |
| In-app per-session billing | Discourages usage — flat subscription instead |
| Real-time chat between technicians | High complexity, not core to copilot value |
| Video call / screen sharing | Not core to AI copilot — technicians can use existing tools |
| Landing page | Separate Framer project, not in this codebase |
| White-labeling | Enterprise tier, future consideration |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 1 | Pending |
| INFRA-06 | Phase 1 | Pending |
| INFRA-07 | Phase 5 | Pending |
| INFRA-08 | Phase 4 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| AUTH-07 | Phase 1 | Pending |
| AUTH-08 | Phase 1 | Pending |
| TOOL-01 | Phase 2 | Pending |
| TOOL-02 | Phase 2 | Pending |
| TOOL-03 | Phase 2 | Pending |
| TOOL-04 | Phase 2 | Pending |
| TOOL-05 | Phase 5 | Pending |
| TOOL-06 | Phase 2 | Pending |
| TOOL-07 | Phase 2 | Pending |
| TOOL-08 | Phase 2 | Pending |
| SESS-01 | Phase 3 | Pending |
| SESS-02 | Phase 3 | Pending |
| SESS-03 | Phase 3 | Pending |
| SESS-04 | Phase 3 | Pending |
| SESS-05 | Phase 3 | Pending |
| SESS-06 | Phase 3 | Pending |
| SESS-07 | Phase 3 | Pending |
| SESS-08 | Phase 3 | Pending |
| SESS-09 | Phase 3 | Pending |
| SESS-10 | Phase 4 | Pending |
| SESS-11 | Phase 4 | Pending |
| SESS-12 | Phase 4 | Pending |
| KB-01 | Phase 5 | Pending |
| KB-02 | Phase 5 | Pending |
| KB-03 | Phase 5 | Pending |
| KB-04 | Phase 5 | Pending |
| KB-05 | Phase 5 | Pending |
| KB-06 | Phase 5 | Pending |
| KB-07 | Phase 5 | Pending |
| KB-08 | Phase 5 | Pending |
| KB-09 | Phase 5 | Pending |
| KB-10 | Phase 5 | Pending |
| UX-01 | Phase 3 | Pending |
| UX-02 | Phase 3 | Pending |
| UX-03 | Phase 3 | Pending |
| UX-04 | Phase 3 | Pending |
| UX-05 | Phase 3 | Pending |
| UX-06 | Phase 4 | Pending |
| UX-07 | Phase 3 | Pending |
| UX-08 | Phase 3 | Pending |
| COMP-01 | Phase 3 | Pending |
| COMP-02 | Phase 3 | Pending |
| COMP-03 | Phase 2 | Pending |
| COMP-04 | Phase 2 | Pending |
| COMP-05 | Phase 2 | Pending |
| COMP-06 | Phase 3 | Pending |
| COMP-07 | Phase 4 | Pending |
| COMP-08 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 62 total
- Mapped to phases: 62
- Unmapped: 0

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 after roadmap creation*
