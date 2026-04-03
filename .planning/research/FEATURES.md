# Feature Landscape

**Domain:** HVAC AI Copilot / Connected Worker Platform
**Researched:** 2026-04-03
**Overall Confidence:** MEDIUM-HIGH (competitor features verified via WebFetch of XOi, Aquant, BrightAI homepages and platform pages; Augmentir and Intelligent Technician based on LEGAL-ADMIN.md competitive analysis + training data)

---

## Table Stakes

Features users expect from an HVAC AI copilot / connected worker product. Missing any of these and the product feels incomplete or unserious to HVAC business owners evaluating it.

| # | Feature | Why Expected | Complexity | Competitor Precedent | M1 Scope? |
|---|---------|--------------|------------|---------------------|-----------|
| TS-1 | **Voice-first interaction** | Technicians have hands occupied holding tools, flashlights, panels. Typing is impossible during active work. Every competitor is voice/audio-first. | Medium | Aquant (Roger voice AI), XOi (voice summaries), Intelligent Technician | YES |
| TS-2 | **Error code lookup** | Most common technician question: "What does error code X mean on this unit?" Immediate, accurate answers here are the #1 proof of value. Every HVAC AI tool starts here. | Low | XOi (knowledge base), Aquant (Troubleshooting Agent), FieldMind | YES |
| TS-3 | **Knowledge base / document search** | Technicians need access to manuals, procedures, and troubleshooting guides. XOi delivers answers in <60 seconds. Aquant's Knowledge Agent searches curated knowledge bases and documentation. This is foundational. | High | XOi (<60s answers), Aquant (Knowledge Agent, Document Retrieval Agent), Augmentir (digital work instructions) | YES (backend) |
| TS-4 | **Equipment identification** | Knowing what equipment you are working on determines every subsequent decision. XOi's core value: "Make, model, serial identification in seconds" via dataplate OCR. | Medium | XOi (dataplate OCR, asset intelligence), Aquant (asset context) | NO (Phase 2 tool: identifyPart) |
| TS-5 | **Session/work summary generation** | Auto-generating documentation of what was done, what was found, and what was recommended. XOi: "Create work summaries in minutes." Aquant: Summary Agent. Technicians hate paperwork; auto-summaries are expected. | Medium | XOi (work summaries), Aquant (Summary Agent), BrightAI (automatic capture of field actions) | YES (post-session Inngest job) |
| TS-6 | **Safety disclaimers and scope limitation** | Product liability (EU Directive 2024/2853) and professional liability demand aggressive disclaimers. The AI must never position itself as a substitute for certification or training. Must refuse out-of-scope work. | Low | All competitors include disclaimers. Regulatory table stakes in EU market. | YES |
| TS-7 | **Org-scoped multi-tenancy with roles** | B2B SaaS fundamental. Every org's data must be isolated. Owners/managers/technicians need different access levels. | Medium | All competitors (enterprise multi-tenancy is universal) | YES |
| TS-8 | **Offline reference / cached data** | Basements, rooftops, rural areas have poor connectivity. Aquant: "Access from any device, on or offline." Intelligent Technician: 7+ days offline. Cached recent summaries and knowledge articles are non-negotiable. | Low | Aquant (offline mobile), Intelligent Technician (7+ days offline), BrightAI (edge AI) | YES (MMKV cache for summaries + articles) |
| TS-9 | **Mobile-first design for field conditions** | Glove-friendly targets, sunlight-readable contrast, portrait + landscape, screen wake lock. Field workers use phones in harsh conditions. | Medium | All competitors are mobile-first. BrightAI also supports wearables. | YES |
| TS-10 | **Reconnection / session resilience** | WebSocket drops are inevitable on job sites. Graceful reconnection without losing session context is expected. | Medium | Aquant (offline), BrightAI (edge resilience), Intelligent Technician (edge-native) | YES (Gemini sessionResumption) |
| TS-11 | **Non-dismissible AI indicator** | EU AI Act Art. 50 transparency obligation. Deadline: August 2, 2026. Non-negotiable for EU market entry. | Low | No US competitors do this yet. First-mover advantage in compliance. | YES |
| TS-12 | **Invite / onboarding flow** | Business owner needs to get technicians on the platform with minimal friction. Invite codes, QR scanning, or link-based joining. | Low | All B2B SaaS platforms have team invite flows | YES |
| TS-13 | **Finding / observation logging** | Technicians need to record what they observe (e.g., "compressor showing wear", "filter needs replacement"). Creates a structured record for handoff. | Low | XOi (jobsite documentation), Aquant (case creation), BrightAI (field action capture) | YES (logFinding tool) |

---

## Differentiators

Features that set Aucta apart from competitors. Not expected by users evaluating generic connected worker platforms, but create significant competitive advantage when present.

| # | Feature | Value Proposition | Complexity | Competitive Gap | M1 Scope? |
|---|---------|-------------------|------------|----------------|-----------|
| DF-1 | **Real-time multimodal reasoning (camera + voice simultaneously)** | The AI sees what the technician sees AND hears what they say, reasoning over both in real time. No competitor does continuous live video + audio AI reasoning. XOi captures photos/video for documentation but does not reason over them in real time. Aquant is voice/text only. This is the core magic. | High | XOi: photo capture, not real-time reasoning. Aquant: voice/text, no video. Augmentir: pre-authored SOPs with optional AR overlay. BrightAI: edge AI on sensors, not real-time multimodal conversation. **No competitor offers this.** | YES |
| DF-2 | **Automatic multilingual support (24+ languages, zero config)** | Gemini auto-detects language and responds in kind. 30 HD voices. Vienna's HVAC workforce speaks Turkish, Serbian, Croatian, Polish, Romanian -- a daily reality no competitor addresses. Eliminates the language barrier without any setup or configuration. | Low (Gemini-native) | No competitor specifically addresses European multilingual workforces. US-centric competitors (XOi, Aquant) are English-only or English-primary. | YES |
| DF-3 | **Self-learning knowledge base with 4-tier verification** | Every session makes the AI smarter. Knowledge is extracted, compiled into wiki articles, and verified by senior technicians. The 4-tier confidence system (unverified / technician_reviewed / expert_approved / manufacturer_sourced) is unique. Aquant captures knowledge but lacks a systematic compile-verify-retrieve-health flywheel. | High | Aquant: captures knowledge but no systematic verification tiers. XOi: curated content, not self-learning. FieldMind: aggregates tribal knowledge but no verification workflow. Augmentir: pre-authored SOPs, not learning from sessions. | YES (full backend) |
| DF-4 | **Real-time tool calling mid-conversation** | Gemini's async function calling executes tools (error lookup, KB search, logging) while audio continues streaming -- non-blocking UX. The technician never waits. Competitors require separate interactions: stop talking, search manually, then resume. | High | No competitor offers mid-conversation tool execution without interrupting the interaction flow. | YES |
| DF-5 | **Zero hardware requirement (smartphone only)** | No smart glasses, no wearables, no edge devices, no IT department approval. Download app, scan QR, start using. BrightAI requires wearables and edge infrastructure. Augmentir supports smart glasses. Intelligent Technician needs edge hardware. | N/A (architecture) | BrightAI: wearables + edge. Augmentir: optional smart glasses + tablets. Intelligent Technician: dedicated edge hardware. | YES |
| DF-6 | **30-second onboarding (scan QR / enter code)** | Most connected worker platforms require IT setup, admin configuration, content authoring, and training. Aucta: scan code, join org, tap "Start Session." No content pre-authoring needed because the AI reasons in real time. | Low | Augmentir: requires SOP authoring. BrightAI: requires infrastructure deployment. Aquant: enterprise onboarding. XOi: integration setup. | YES |
| DF-7 | **Knowledge base health monitoring** | Coverage gap detection ("no articles for Mitsubishi PUMY series"), stale article detection, consistency checking, and article utility tracking. Proactive rather than reactive knowledge management. | Medium | No competitor offers systematic KB health management with gap analysis. | YES (backend) |
| DF-8 | **Source attribution with confidence levels** | AI explicitly states "Based on unverified observation..." vs "Per manufacturer documentation..." depending on the knowledge source. Users know how much to trust each piece of guidance. Aquant notes outputs are "auditable and explainable" but does not expose granular confidence tiers to the end user. | Low | Aquant: auditable outputs but no user-facing confidence tiers. No competitor surfaces source reliability to the technician in real time. | YES |
| DF-9 | **Cross-organization learning (network effect)** | Anonymized patterns from all customers improve the AI for everyone. A Daikin VRV error code solved in Vienna helps a technician in Munich -- but only on Aucta's platform. Creates a defensible network moat. | Medium | Aquant has aggregate benchmarking. XOi builds an asset intelligence database. Neither has explicit cross-org knowledge sharing with privacy controls. | PARTIAL (architecture supports it; active cross-org learning is Phase 2+) |
| DF-10 | **EU regulatory compliance as product feature** | GDPR privacy-by-design (stream-and-discard), EU AI Act transparency, F-Gas 2024/573 integration, Product Liability Directive awareness. Positioned as a feature ("we help you comply"), not a burden. US competitors would need years to replicate EU regulatory expertise. | Medium | No US competitor (XOi, Aquant) has EU regulatory compliance built in. This is a genuine moat in the European market. | YES |
| DF-11 | **Expert escalation with context packaging** | When AI confidence is low, it proactively packages session context and escalates to a designated senior technician. Hybrid AI + human model. Augmentir has "remote expert assist" but it is manually triggered and requires the expert to understand the situation from scratch. | Medium | Augmentir: manual remote assist. Aquant: hand-off to humans via Roger voice AI, but text-based context. No competitor auto-packages visual + audio + tool call context for expert handoff. | NO (Phase 1 later or Phase 2: escalateToExpert tool) |
| DF-12 | **Proactive safety warnings from visual context** | AI detects electrical panels, refrigerant lines, height scenarios in the camera feed and proactively mentions safety precautions without being asked. Goes beyond static disclaimers to context-aware safety guidance. | Medium | No competitor offers vision-based proactive safety warnings. Augmentir has safety checklists (pre-authored). BrightAI monitors for anomalies but in infrastructure, not human safety. | YES (system prompt safety layer) |

---

## Anti-Features

Features to explicitly NOT build. These represent strategic traps, competitor patterns that don't fit Aucta's model, or regulatory minefields.

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|--------------|-----------|-------------------|
| AF-1 | **Pre-authored SOPs / rigid workflow builder** | Augmentir's core model: requires massive content creation investment before delivering value. Months of authoring before a single technician benefits. Aucta's value is INSTANT because the AI reasons in real time from what it sees. Building an SOP authoring tool dilutes the core value proposition and shifts burden to the customer. | Rely on real-time AI reasoning + knowledge base. The system prompt overlay (org custom instructions) handles org-specific procedures without a full SOP builder. |
| AF-2 | **Hardware dependency (smart glasses, wearables, edge devices)** | BrightAI's model. Adds adoption friction, cost, IT requirements, and support burden. HVAC SMBs (5-20 techs) cannot justify hardware investment. Smartphone-only eliminates all hardware barriers. | Support smartphones only. The architecture abstracts camera input so smart glasses can be added later (when Meta Orion ships) without changing the core product. |
| AF-3 | **Full FSM replacement (scheduling, dispatch, invoicing)** | ServiceTitan ($250-400/tech/mo), Housecall Pro, and Jobber are entrenched. Competing head-on is a losing battle. HVAC businesses already have FSM tools and will not switch. | Position as complementary. Build FSM integrations (Phase 3) that push session summaries into existing job records. "We make your existing tools better." |
| AF-4 | **Emotion recognition / sentiment analysis on technicians** | EU AI Act explicitly prohibits workplace emotion recognition. Even if legal, surveilling technician emotional state destroys trust and adoption. | Measure quality through explicit feedback (1-5 stars), objective metrics (session duration, reconnection rate), and knowledge base contributions. Never infer emotional state. |
| AF-5 | **Autonomous decision-making for safety-critical work** | Product Liability Directive 2024/2853 makes AI providers strictly liable for defects. If the AI autonomously decides "this wire is safe to touch" and is wrong, liability is catastrophic. | The AI GUIDES, the technician DECIDES. Every safety-critical recommendation includes "verify before proceeding" language. AI scope limitation refuses out-of-competence work. |
| AF-6 | **Complex admin portal for initial setup** | Enterprise connected worker platforms (Augmentir, BrightAI) require weeks of IT setup, admin configuration, content migration, and user training. HVAC SMBs don't have IT departments. | 30-second onboarding. Owner creates account, generates invite codes, technicians scan and start. AI custom instructions (free text) are the only "configuration" needed. |
| AF-7 | **General-purpose chatbot / text-based Q&A interface** | ChatGPT and Claude already serve this use case. A text-based chat UI for HVAC questions is a commodity. Users can already get this for free. | Purpose-built for physical work: live camera + voice + domain-specific tools. The UX is fundamentally different from a chatbot -- it is a copilot that watches what you are working on. |
| AF-8 | **Gamification / leaderboards for technician performance** | Gamifying performance metrics (sessions completed, ratings) creates perverse incentives. Technicians may rush through sessions to game metrics, or avoid difficult jobs that might lower their score. Ruins trust and culture. | Track operational metrics for managers (time-to-competency, session volume) but do NOT gamify or create competitive leaderboards visible to technicians. |
| AF-9 | **In-app payments / per-session billing** | Microtransactions frustrate technicians and create friction at the moment of highest value (starting a session). Per-session billing discourages usage. | Flat per-seat monthly subscription. Unlimited sessions on Professional tier. Usage metering for business analytics only, not for billing gatekeeping. |
| AF-10 | **Audio/video recording and storage by default** | Stream-and-discard is a deliberate GDPR architectural decision. Storing audio/video creates massive GDPR surface area (voice biometrics, potential face capture), storage costs, and liability concerns. | Opt-in session recording (Phase 2) with explicit per-session GDPR consent. Framed as "training mode" for quality review. Default is always stream-and-discard. |

---

## Feature Dependencies

```
TS-7  Auth/Org/Roles ──┬──> TS-3  Knowledge Base Search (org-scoped)
                       ├──> TS-5  Session Summaries (org-scoped)
                       ├──> TS-13 Finding Logging (org-scoped)
                       └──> DF-3  Self-Learning KB (org-scoped)

TS-1  Voice Interaction ──> DF-1  Real-time Multimodal (adds camera to voice)
                       ──> DF-4  Real-time Tool Calling (tools called during voice)

TS-2  Error Code Lookup ──> TS-3  Knowledge Base (error codes stored in KB)

DF-1  Real-time Multimodal ──> DF-12 Proactive Safety Warnings (needs vision)
                           ──> TS-4  Equipment Identification (dataplate from camera)

DF-3  Self-Learning KB ──┬──> TS-5  Session Summaries (summaries feed KB ingestion)
                        ├──> DF-7  KB Health Monitoring (monitors what KB compiled)
                        ├──> DF-8  Source Attribution (confidence levels from verification)
                        └──> DF-9  Cross-Org Learning (aggregates verified knowledge)

TS-12 Invite/Onboarding ──> TS-7  Auth/Org/Roles (invite joins org)

DF-11 Expert Escalation ──> DF-1  Real-time Multimodal (packages visual context)
                        ──> TS-7  Auth/Org/Roles (escalation contacts per org)
```

**Critical path for M1:** Auth (TS-7) --> Voice + Camera session (TS-1, DF-1) --> Tool system (TS-2, DF-4) --> KB backend (TS-3, DF-3) --> Session summaries (TS-5)

---

## Competitor Feature Matrix

Detailed comparison of what each competitor offers across key feature categories.

| Feature | **Aucta (planned)** | **XOi** | **Aquant** | **Augmentir** | **Intelligent Technician** | **BrightAI** |
|---------|-------------------|---------|-----------|--------------|--------------------------|-------------|
| Real-time video + voice AI | YES (core) | No (photo capture only) | No (voice/text) | No (pre-authored + AR overlay) | Unclear | No (sensor AI) |
| Multilingual auto-detect | YES (24+ lang) | No | No | Limited | No | No |
| Voice-first interaction | YES | Partial | YES (Roger) | No | Unclear | YES (wearable) |
| Error code lookup | YES | YES | YES | Via SOPs | YES (GraphRAG) | No |
| Dataplate OCR | Phase 2 | YES (core) | Partial | No | Unclear | No |
| Knowledge base search | YES | YES (<60s) | YES (Knowledge Agent) | YES (authored SOPs) | YES (GraphRAG) | No |
| Self-learning KB | YES (4-tier) | No (curated) | Partial | No (pre-authored) | No | Partial (learns from repairs) |
| Work summaries | YES (auto) | YES | YES (Summary Agent) | Via checklists | Unclear | YES (auto-capture) |
| Offline support | Cached articles | Unknown | YES | YES | YES (7+ days) | YES (edge) |
| On-device AI fallback | Phase 2 (Gemma) | No | No | No | YES (<100ms edge) | YES (edge AI) |
| Safety warnings (proactive) | YES (vision-based) | Photo documentation | Checklist-based | Pre-authored checklists | Unknown | Anomaly detection |
| Expert escalation | Phase 2 | Unknown | YES (hand-off) | YES (remote assist) | Unknown | Unknown |
| FSM integrations | Phase 3 | YES (deep) | YES (CRM/ERP) | YES (enterprise) | Unknown | YES (enterprise) |
| Workforce analytics | Phase 2 (dashboard) | YES | YES (scorecards) | YES (AI-powered) | Unknown | YES |
| Parts identification | Phase 2 | Partial | YES (Parts Agent) | No | Unknown | Partial |
| Compliance checklists | Phase 2 | Via documentation | YES (Checklist Agent) | YES (core feature) | Unknown | Unknown |
| Hardware requirement | Smartphone | Smartphone | Web/mobile | Tablet/glasses optional | Edge device | Wearables + edge |
| Pricing model | EUR 29/tech/mo | ~$99/user/mo | Enterprise | Enterprise | Unknown | Enterprise |
| EU regulatory compliance | YES (built-in) | No | No | No | No | No |

---

## MVP Feature Recommendation (Milestone 1)

### Must Build (Table Stakes + Core Differentiators)

1. **TS-7: Full auth with org/roles/invites** -- Foundation everything depends on. Cannot defer.
2. **DF-1: Real-time multimodal AI session (camera + voice)** -- THE core product magic. This is what makes Aucta different from every competitor. Without this, there is no product.
3. **TS-1: Voice-first interaction** -- Included in DF-1. Audio-primary, hands-free UX.
4. **DF-2: Automatic multilingual support** -- Free from Gemini. Zero implementation cost beyond system prompt tuning. Core European USP.
5. **TS-2: Error code lookup tool** -- First proof of tool-calling value. Immediate, tangible utility.
6. **TS-3: Knowledge base search tool** -- Second proof of tool-calling value. Demonstrates KB pipeline.
7. **TS-13: Finding logging tool** -- Third tool. Creates structured data that feeds the knowledge flywheel.
8. **DF-3: Self-learning KB backend (full pipeline)** -- The key differentiator. Ingest, compile, verify, retrieve, health -- all backend. No dashboard UI yet.
9. **TS-5: Session summary generation** -- Post-session Inngest job. Feeds knowledge ingestion. Creates tangible artifact from each session.
10. **TS-6: Safety disclaimers and scope limitation** -- Non-negotiable for EU launch. System prompt layer + UI disclaimers.
11. **TS-11: Non-dismissible AI indicator** -- EU AI Act compliance. August 2, 2026 deadline. Must ship with this from day one.
12. **TS-9: Mobile-first glove-friendly UI** -- 56x56dp targets, WCAG AAA contrast, portrait + landscape.
13. **TS-10: Reconnection / session resilience** -- Gemini sessionResumption + exponential backoff. Essential for field reliability.
14. **TS-8: Offline cached references** -- MMKV cache for recent summaries and frequent KB articles. Low effort, high value.
15. **TS-12: Invite/onboarding flow** -- QR code / invite code join. Enables the 30-second onboarding promise.
16. **DF-10: EU regulatory compliance** -- GDPR privacy-by-design, AI Act indicator, F-Gas references in system prompt. Built-in, not bolted-on.

### Defer to Phase 2+

- **TS-4: Equipment identification (dataplate OCR)** -- Requires the identifyPart tool and vision model tuning. XOi's core feature but not required for initial value.
- **DF-11: Expert escalation with context packaging** -- Valuable but requires push notification infrastructure and escalation contact management. Can be manual (call/text) initially.
- **DF-7: KB health monitoring dashboard** -- Backend analytics can run without a UI. Health reports are Phase 2 dashboard content.
- **DF-9: Cross-org learning** -- Architecture supports it from day one (nullable org_id on knowledge articles). Active cross-org aggregation is Phase 2.
- **Workforce analytics** -- Requires dashboard. Phase 2.
- **Compliance checklists** -- Structured digital sign-off with PDF export. Phase 2.
- **Parts identification** -- Requires parts database. Phase 2.
- **FSM integrations** -- Phase 3. Let the standalone product prove value first.
- **On-device AI fallback (Gemma)** -- Phase 2. Cloud-first for M1.

### Why This Order

1. **Auth first** because every feature is org-scoped. Without auth, nothing works.
2. **Live AI session second** because it is the core product experience. Everything else is supporting infrastructure.
3. **Tools third** because they prove the function-calling architecture and deliver immediate utility (error codes, KB search, logging).
4. **KB backend fourth** because it is the long-term differentiator. Starting KB ingestion from day one means the knowledge flywheel begins compounding immediately, even before the dashboard exists.
5. **Session summaries fifth** because they feed KB ingestion AND provide tangible value to business owners.
6. **Safety/compliance woven throughout** because it is not a feature -- it is a property of every feature.

---

## Feature Sizing Reference

Rough complexity estimates for planning purposes. These are implementation complexity, not user-facing complexity.

| Feature | Estimated Effort | Key Technical Challenge |
|---------|-----------------|----------------------|
| Auth with org/roles/invites (TS-7) | 2-3 weeks | Better Auth org plugin configuration, RBAC middleware, invite code flow |
| Live AI session core (DF-1) | 3-4 weeks | WebSocket protocol, audio encode/decode, JPEG capture, session state machine |
| Error code lookup tool (TS-2) | 3-5 days | buildTool() pattern, initial error code data seeding, Gemini function declaration |
| KB search tool (TS-3 tool) | 1-2 weeks | Hybrid BM25 + vector search, Qdrant setup, reranking, prompt injection |
| logFinding tool (TS-13) | 2-3 days | Simple tool, structured JSONB storage, Zod schema |
| KB backend full pipeline (DF-3) | 4-6 weeks | Ingest, compile, verify, retrieve, health -- 5 sub-systems. Most complex single feature. |
| Session summaries (TS-5) | 1 week | Inngest job, LLM summary generation, knowledge extraction trigger |
| Mobile UX shell (TS-9) | 2-3 weeks | Expo Router, NativeWind, camera/audio setup, session UI, offline cache |
| Reconnection (TS-10) | 3-5 days | Exponential backoff, sessionResumption token handling, UI state recovery |
| Invite/onboarding (TS-12) | 3-5 days | QR generation, code validation, org join flow |
| Safety system prompt (TS-6) | 2-3 days | Prompt engineering, scope limitation rules, disclaimer UI |
| AI indicator (TS-11) | 1 day | Non-dismissible overlay component, always visible during session |
| i18n foundation | 3-5 days | react-i18next setup, initial en/de translations, Expo localization |

---

## Sources

- XOi Technologies homepage (xoi.io) -- WebFetch 2026-04-03. Features: dataplate OCR, asset intelligence, knowledge base (<60s answers), work summaries, AI-backed guidance. Confidence: MEDIUM (homepage marketing copy, not technical docs).
- Aquant platform pages (aquant.ai, aquant.ai/platform) -- WebFetch 2026-04-03. Features: Service Co-Pilot with 10+ agent types, voice AI (Roger), multimodal knowledge ingestion, offline mobile, workforce analytics, parts recommendations. Confidence: HIGH (detailed feature descriptions).
- BrightAI platform page (bright.ai) -- WebFetch 2026-04-03. Features: Stateful Platform, edge AI, wearable copilots, autonomous inspection, 250K+ endpoints. Confidence: MEDIUM (marketing copy).
- Augmentir -- LEGAL-ADMIN.md competitive analysis + training data. Features: connected worker platform, AR overlays, pre-authored SOPs, no-code workflow builder, skill management. Confidence: MEDIUM (training data, not verified against current product).
- Intelligent Technician -- LEGAL-ADMIN.md competitive analysis. Features: edge-native AI, <100ms on-device inference, 7+ days offline, GraphRAG over 10K+ manual pages. Confidence: LOW (single source, unable to verify via web).
- FieldMind -- LEGAL-ADMIN.md competitive analysis. Note: fieldmind.ai is an agricultural advisory tool, not HVAC. The HVAC-focused FieldMind referenced in competitive analysis may be a different entity or early-stage product. Confidence: LOW.
- Comfort Systems "Mark" (Aquant deployment) -- LEGAL-ADMIN.md. 3,600 technicians, 700+ OEM manuals. Confidence: MEDIUM (referenced in Aquant case studies but specific page could not be fetched).
