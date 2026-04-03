# Aucta

## Legal, Regulatory & Business Strategy — Business Case, Compliance & Investor Readiness

**Product:** Aucta — HVAC AI Copilot for technicians and field teams.

**Version:** 3.0
**Date:** April 3, 2026
**Status:** Foundation / Pre-Development
**Audience:** Founding team, legal counsel, investors, business development

---

## 1. Executive Summary

**Aucta** is an AI copilot for HVAC technicians that provides real-time visual and voice guidance through a smartphone camera. The AI watches what the technician sees, listens to their questions in any language, and speaks back expert-level guidance — like having a master HVAC technician looking over their shoulder on every job.

This is a new category: **AI-powered skill augmentation for physical work** — or, in investor terminology, **Physical AI**. It complements existing field service management tools by making every technician — regardless of experience level or native language — perform like a 10-year veteran. A self-learning knowledge base compounds organizational expertise with every session: the AI extracts learnings, compiles them into a verifiable wiki, and becomes smarter over time. Gemini function calling enables mid-conversation tool use — error code lookup, equipment identification, knowledge base search — without interrupting the audio stream.

**Initial market:** HVAC businesses in and around Vienna, Austria (7,650 WKO SHL member businesses; 5,393+ enterprises in the Vienna metro area).

**Business model:** B2B SaaS. The business owner buys the product, technicians use the app. Free distribution during validation phase, transitioning to per-seat subscription pricing.

**Core USP:** Multilingual real-time AI guidance with self-learning knowledge. Vienna's HVAC workforce includes native speakers of Turkish, Serbian, Croatian, Polish, Romanian, and other languages. No competitor addresses the language barrier that is a daily reality on European job sites.

---

## 2. Stakeholder Map

### 2.1 Internal to the HVAC Business

| Role | Surface | What They Need | Key Metrics They Care About |
|------|---------|----------------|---------------------------|
| **Business Owner** | Dashboard | ROI justification, cost control, competitive advantage, compliance | Revenue per technician, callback rate, training cost reduction, AI cost per session |
| **Operations Manager** | Dashboard | Workforce oversight, scheduling efficiency, quality assurance | Active sessions, session quality scores, technician utilization, error rates |
| **Dispatcher** | Dashboard (future) | Job assignment context, technician skill matching | Technician availability, skill-job matching, first-time fix rate |
| **Technician (experienced)** | Mobile App | Quick reference, validation of decisions, documentation | Session speed, parts identified, confidence in unfamiliar equipment |
| **Technician (new hire)** | Mobile App | Step-by-step guidance, language support, safety reminders | Learning curve reduction, time to first solo job, safety compliance |
| **Apprentice** | Mobile App | Training mode, supervised learning, skill assessment | Skills verified, training hours logged, supervisor sign-off |

### 2.2 External

| Role | Interaction | What They Need |
|------|-------------|----------------|
| **End Customer** (homeowner/building manager) | Indirect — sees technician using the app | Faster, more accurate service; confidence in the technician |
| **Equipment Manufacturer** | Integration partner (future) | Product manuals and diagnostics surfaced through AI; brand visibility |
| **Regulatory Body** | Compliance verification | Proof that safety procedures were followed; audit trail |
| **Insurance Provider** | Risk assessment | Evidence of standardized procedures; reduced incident rates |

### 2.3 Internal to Our Company

| Role | Surface | What They Need |
|------|---------|----------------|
| **Sales/BD** | CRM + landing page analytics | Lead tracking, conversion metrics, demo scheduling |
| **Customer Success** | Dashboard admin view | Onboarding progress, usage trends, churn signals |
| **Product/Engineering** | Internal analytics | Feature adoption, session quality, error rates, model performance |

---

## 3. Competitive Positioning

### 3.1 Category Definition

This product occupies a new category — **AI Skill Augmentation** — that sits alongside existing FSM software, not in competition with it.

| Category | Examples | What They Do | Our Relationship |
|----------|----------|-------------|-----------------|
| Field Service Management | ServiceTitan ($250-400/tech/mo), Housecall Pro, Jobber | Scheduling, dispatch, invoicing, CRM | **Complement** — we make their technicians better, not replace their workflows |
| Connected Worker Platforms | Augmentir, Atheer, ScopeAR | Digitized checklists, remote expert assist | **Compete** — they require pre-authored SOPs; we reason in real time |
| General AI Assistants | ChatGPT, Gemini app, Claude | General knowledge, text-based | **Differentiate** — we are purpose-built for physical work with live video |
| HVAC-Specific AI | XOi Technologies, Aquant | Asset intelligence, voice troubleshooting | **Differentiate** — real-time multimodal, multilingual, self-learning knowledge base |

### 3.2 Competitive Landscape

| Competitor | Approach | Funding | Key Feature We Lack | Our Advantage |
|------------|----------|---------|---------------------|---------------|
| **XOi Technologies** | Dataplate OCR, asset intelligence, "Advisor" product | $230M | Revenue opportunity analytics (24% revenue uplift per request) | Real-time multimodal reasoning, multilingual, lower price point |
| **Augmentir** | Connected worker platform, AR overlays, pre-authored SOPs | Enterprise-scale | AR overlays, no-code workflow builder | No pre-authored SOPs needed; AI reasons in real time from what it sees |
| **Aquant / Comfort Systems "Mark"** | Voice-first troubleshooting for 3,600 techs, 700+ OEM manuals | $8B parent (Comfort Systems) | Human expert handoff, full offline AI | Multimodal (video + audio), automatic multilingual, self-learning KB |
| **Intelligent Technician** | Edge-native AI copilot, <100ms on-device inference | Undisclosed | 7+ days offline, GraphRAG over 10K+ manual pages | Lower barrier to entry (smartphone only), no edge hardware needed |
| **BrightAI** | Physical AI platform, workforce wearables, autonomous inspection | $66M ($15M seed + $51M Series A) | Scale (250K+ active AI endpoints, 25K+ locations) | HVAC specialization, EU regulatory moat, lower infrastructure cost |
| **FieldMind** | AI repair guidance from docs + tribal knowledge + Slack threads | Undisclosed (Very Technology) | Active tribal knowledge structuring from multiple sources | Self-learning KB with 4-tier verification system, real-time video |

### 3.3 Why We Win

1. **Real-time visual reasoning.** Not pre-authored SOPs. The AI sees the actual equipment and adapts.
2. **Automatic multilingual support.** No configuration needed. The technician speaks; the AI responds in their language. 30 HD voices, 24 languages.
3. **Real-time tool calling.** The AI calls domain-specific tools mid-conversation — error code lookup, knowledge base search, part identification — without interrupting audio.
4. **Self-learning knowledge base.** Every session makes the AI smarter. Knowledge is extracted, compiled into wiki articles, and verified by senior technicians. The data flywheel compounds.
5. **Zero hardware requirement.** Smartphone only. No smart glasses, no headsets, no IT department approval.
6. **30-second onboarding.** Scan QR code → join org → start using. No training required.
7. **Human expert handoff.** When the AI is uncertain, it packages context and escalates to a senior technician — hybrid AI + human model.
8. **Complementary pricing.** At a fraction of ServiceTitan's per-tech cost, we are an easy add-on decision.

### 3.4 Integration Strategy

The product must integrate with, not replace, the tools HVAC businesses already use.

**Phase 1 (MVP):** Standalone. No integrations. Pure AI copilot.

**Phase 2:** Webhook/API system allowing third-party tools to push job context into AI sessions (equipment type, customer history, past service notes) and receive session summaries back.

**Phase 3:** Native integrations with ServiceTitan, Housecall Pro, and Jobber — the three most common FSM tools in the DACH region. Session summaries auto-attach to job records.

**Architecture implication:** The API layer is designed from day one with a public API in mind. tRPC handles internal app-to-app communication; OpenAPI specs are auto-generated from existing Zod schemas via `zod-to-openapi`. A versioned, key-authenticated REST API gateway will serve third-party integrations in Phase 2.

---

## 4. Safety & Compliance Features

HVAC work involves real physical risks. The product must actively support safety, not just avoid liability.

### 4.1 AI Safety Behaviors

- **Proactive safety warnings:** When the AI sees electrical panels, refrigerant lines, or height-related scenarios, it mentions relevant safety precautions without being asked
- **Lockout/tagout reminders:** For electrical work, the AI reminds technicians about isolation procedures
- **Refrigerant handling:** The AI references F-Gas regulation (EU 2024/573) requirements when relevant — including new low-GWP refrigerant requirements (R-290, CO2, R-32), enhanced leak-check thresholds (>= 5 tonnes CO2eq), and 7-year certification refresher intervals
- **Certification gating (Phase 2):** When F-Gas certification tracking is enabled in the dashboard, the AI refuses to provide refrigerant-handling guidance for technicians without a valid certification on record
- **Scope limitation:** The AI clearly states when a situation requires a licensed electrician, plumber, or specialist — and refuses to guide work outside its competence boundaries
- **Emergency response:** If a technician describes an emergency (gas leak, electrical shock, injury), the AI provides immediate first-response guidance and advises calling emergency services
- **Human expert handoff:** When the AI's confidence is low or the situation exceeds its competence, it proactively suggests escalation to a senior technician and packages the full session context for handoff

### 4.2 Compliance Documentation

Session logs serve as a lightweight compliance trail:
- Timestamp of every AI session
- Equipment identified (when detectable)
- Safety warnings issued
- Tools called and results returned
- Duration and outcome
- Knowledge base articles referenced (with confidence level)
- Exportable as PDF per session or in bulk

Additionally:
- Knowledge base articles tagged with compliance relevance are surfaced during relevant sessions
- Structured compliance checklists (Phase 2) with digital sign-off, timestamps, and exportable records for regulatory/insurance audits

---

## 5. Regulatory Architecture

### 5.1 GDPR (DSGVO) — Mandatory, Austria-Based

As an Austria-based SaaS processing personal data of EU residents, GDPR compliance is non-negotiable and affects every architectural decision.

**Data Classification:**

| Data Type | Classification | Legal Basis | Retention |
|-----------|---------------|-------------|-----------|
| User account data (name, email) | Personal data | Contract necessity (Art. 6(1)(b)) | Duration of account + 30 days |
| Audio recordings (AI sessions) | Personal data (voice biometric potential) | Legitimate interest (Art. 6(1)(f)) | Not stored — streamed and discarded |
| Video frames (AI sessions) | Personal data (may contain faces) | Legitimate interest (Art. 6(1)(f)) | Not stored — streamed and discarded |
| Session metadata (timestamps, duration, tokens) | Personal data (linked to user) | Contract necessity | Per org data retention setting, default 12 months |
| Knowledge base articles | Organizational data (may contain personal references) | Legitimate interest | Per org retention setting |
| Analytics aggregates | Anonymized/pseudonymized | Legitimate interest | Indefinite |

**Critical architectural decision:** Audio and video frames are streamed directly from the mobile app to Gemini's API via WebSocket. They are NOT stored on our servers. This eliminates the largest GDPR surface area.

**Required implementations:**
- **Datenschutzerklarung (Privacy Policy):** German-language, DSGVO-compliant, listing every processing activity with legal basis, retention period, and sub-processor
- **Impressum:** Required by Austrian law (Mediengesetz, E-Commerce-Gesetz), accessible within 2 clicks from every page
- **Data Processing Agreements (AVV/AV-Vertrag):** Signed DPAs with all sub-processors (Neon, Upstash, Qdrant, Vercel, Google/Gemini, Resend, Sentry, PostHog)
- **Sub-processor register:** Public list of all sub-processors with data categories and transfer safeguards
- **Data subject rights:** Automated workflows for access (Art. 15), rectification (Art. 16), erasure (Art. 17), portability (Art. 20) — must respond within 30 days
- **Data export:** Organization owners can export all their org data (JSON/CSV) at any time
- **Account deletion:** Full deletion workflow that removes all personal data and anonymizes session metadata
- **Cookie consent:** Not applicable on mobile app; required on dashboard (GDPR-compliant consent banner)
- **Double opt-in:** Required in Austria for marketing emails

**Enforcement preparation (DSB 2026 Schwerpunktprufung):**
- Prepare **Verzeichnis der Verarbeitungstatigkeiten** (Art. 30 records of processing) before the DSB's 2026 audit wave
- Document **Interessenabwagung** (balancing test) for legitimate interest basis (Art. 6(1)(f)) used for audio/video streaming
- The DSB's 2026 priority audit focuses on Art. 32 (processing security), Art. 30 (records), and Art. 12-14 (transparency) — with particular scrutiny of AI and automated decision-making
- Knowledge base data constitutes a new processing activity (per-org, derived from sessions) that must be documented

**Sub-processor data residency:** Neon Postgres (Frankfurt), Upstash Redis (EU), Qdrant Cloud (EU), Vercel (EU edge nodes). Verify all sub-processors guarantee EU data residency or have adequate Standard Contractual Clauses (SCCs).

### 5.2 EU AI Act — Transparency Obligations (August 2, 2026)

Aucta is a **deployer** of a general-purpose AI model (Gemini), not a provider of an AI system.

**Risk classification:** **Limited risk (transparency obligations)**. The product does not involve biometric identification, critical infrastructure control, employment decisions, or any Annex III category. It provides guidance and recommendations; it does not make autonomous decisions affecting individuals' rights.

**Required transparency measures (by August 2, 2026):**
- **AI interaction disclosure:** Non-dismissible indicator at session start and throughout the session informing technicians they are interacting with an AI system
- **AI-generated content marking:** Session summaries, reports, and knowledge base articles generated by AI carry an "AI-generated" label
- **No emotion recognition:** The AI must not assess, infer, or report technicians' emotional states to their employers. Session quality is measured by explicit feedback and objective metrics only

**Formal documentation required:**
- Written risk classification rationale explaining why the product is limited-risk, not high-risk
- Paper trail for the DSB, which is becoming a sectoral market surveillance authority for AI systems

**Penalties:** Up to EUR 35M or 7% of global annual turnover, whichever is higher. Extraterritorial reach — if output is consumed by anyone in the EU, you're in scope.

### 5.3 F-Gas Regulation (EU 2024/573)

**Correction from PRD v2:** EU 517/2014 has been replaced by **EU 2024/573** (entered into force March 11, 2024).

Key changes impacting our product:

| Change | Timeline | Product Implication |
|--------|----------|-------------------|
| Accelerated HFC phase-down (80% by 2030, full by 2050) | Ongoing, quotas tightening annually | AI guidance must reflect new refrigerant alternatives |
| Mandatory low-GWP refrigerants (GWP < 150) for new equipment | Now | AI references R-290, CO2, R-32 procedures, not just R-410A |
| Enhanced leak-check thresholds (>= 5 tonnes CO2eq) | Now | AI prompts leak-check procedures for qualifying equipment |
| 7-year certification refresher intervals | By March 11, 2027 | Phase 2: dashboard tracks certification status and expiry |

The product should:
- Not replace or substitute certification requirements
- Include a disclaimer that AI guidance does not replace certified training
- Reference current F-Gas procedures (EU 2024/573) when relevant
- Track certification expiry dates (Phase 2) and alert about refresher requirements

### 5.4 Product Liability Directive 2024/2853

**New regulation.** The revised Product Liability Directive (2024/2853) must be transposed by **December 9, 2026**. It explicitly classifies **software and AI as "products"** subject to strict liability.

**Key implications:**
- Injured parties only need to show **defect + damage + causation** — not negligence
- **Presumption of defect** arises if the AI breaches mandatory requirements (e.g., AI Act transparency rules)
- Compensation now covers **digital data damage** (not just physical injury/property damage)

**The stream-and-discard architecture creates a double-edged sword:** It protects privacy but may eliminate evidence to defend against liability claims (no session recording to prove the AI gave correct guidance).

**Recommendations:**
- Implement **opt-in session logging** with explicit per-session GDPR consent, specifically for liability protection
- Display aggressive **disclaimers** at every session start: "This AI provides guidance only. It does not replace professional training, certification, or judgment."
- The AI's **scope limitation** behavior (refusing to guide work outside its competence) is critical liability mitigation — make this aggressive and well-documented
- Ensure **Terms of Service** include a clear liability limitation clause; verify it holds under Austrian consumer protection law (KSchG)
- **Legal counsel review required before launch**

### 5.5 EU Data Act

The EU Data Act became applicable on **September 12, 2025** and is **regulatory tailwind** for this product.

**Strategic opportunity:**
- Connected HVAC products placed on market after September 12, 2026 must provide **"access by design"** to equipment data
- Third-party service providers (our customers' HVAC businesses) have legal grounds to request equipment data directly from manufacturers
- Insurance companies, energy providers, and maintenance service providers can all request access

**Implication for our roadmap:** The Data Act essentially forces HVAC manufacturers to open their data, which directly supports the Phase 2/3 integration strategy. Frame in investor pitches as regulatory tailwind.

**SME exemption:** Under EUR 10M revenue — exempt from mandatory migration support obligations for now.

### 5.6 NIS2 / NISG 2026

Austria's NIS2 transposition (NISG 2026) came into force **October 1, 2026**. Registration deadline: **December 31, 2026**.

**Direct impact on us:** Almost certainly none at current scale. NIS2 targets medium-sized enterprises (250+ employees or EUR 50M revenue).

**Indirect impact:** HVAC companies serving building management for critical infrastructure (hospitals, data centers) may be NIS2-regulated. They may need to assess our cybersecurity as part of their supply chain security obligations.

**Positioning:** "Our compliance documentation supports your NIS2 obligations" — a selling point for enterprise customers.

---

## 6. Pricing Model

### 6.1 Phase 1: Free Distribution (MVP Validation)

Goal: Get 50-200 active technicians using the product weekly. Collect feedback, measure retention, prove the core loop works.

- Free for all businesses
- No feature gating
- Inference costs absorbed (Gemini 2.5 Flash estimated EUR 0.02-0.10 per session)
- Duration: 3-6 months

### 6.2 Phase 2: Paid Subscriptions

Pricing anchored against the value delivered, not against ServiceTitan ($250-400/tech/month).

| Tier | Price | Includes | Target |
|------|-------|----------|--------|
| **Starter** | Free | 3 technicians, 50 sessions/month, basic dashboard | Solo operators, trial |
| **Professional** | EUR 29/tech/month | Unlimited sessions, full analytics, priority support, custom AI instructions, knowledge base | 5-20 tech businesses |
| **Enterprise** | Custom | SSO, API access, dedicated support, SLA, custom integrations, compliance reports | 20+ tech businesses, MSPs |

**Usage metering:** Track sessions per technician per month. Overage on Starter tier triggers upgrade prompt, not a hard block.

**Key metric:** AI cost per session (estimated EUR 0.02-0.10 depending on duration). Healthy margin at EUR 29/tech/month even with heavy usage.

**Pricing validation needed:** Interview 10+ HVAC business owners before finalizing. XOi Technologies charges $99/user/month — our EUR 29 positions as accessible add-on, but validate that "cheap" isn't perceived as "less capable." Consider value-based pricing (cost savings from reduced callbacks, faster training) as an alternative to seat-based.

---

## 7. Market Analysis

### 7.1 TAM / SAM / SOM

**TAM — AI for Physical Trades in Europe:**
- European FSM market: $1.89B (2026, MarketDataForecast)
- AI-powered FSM addressable share: ~$700M (37% current adoption, 43% planned — Research Nester)
- HVAC is the wedge; the platform generalizes to plumbing, electrical, elevator maintenance

**SAM — HVAC Businesses in DACH:**
- 54,413 HVAC companies in DACH region (BoldData)
- 7,650 WKO SHL member businesses in Austria (WKO Statistik)
- Austria SHL sector revenue (2024): EUR 7.135B (WKO Statistik)
- 4,182 apprentices in Austrian SHL (January 2025, WKO Statistik)
- SAM calculation: 54,413 companies x avg 5 technicians x EUR 29/month x 12 = **~EUR 95M ARR**

**SOM — Vienna/Austria Initial Focus:**
- Conservative (5% penetration in 3 years): ~380 companies, ~EUR 660K ARR
- Aggressive (15% penetration in 3 years): ~1,150 companies, ~EUR 2M ARR
- Vienna metro area: 5,393+ SHL enterprises as initial target

**Market sizing methodology:** Sources — BoldData (company counts), WKO Statistik (Austrian SHL data), MarketDataForecast (European FSM market), Mordor Intelligence (Austrian HVAC equipment: $1.03B 2025 → $1.18B 2030), Technavio (European HVAC: $12.8B opportunity).

### 7.2 Expansion Path

Present TAM as **"AI for physical trades work in Europe"** (~EUR 700M+), not just HVAC. HVAC is the wedge; the platform generalizes to:
- Plumbing (same WKO SHL sector)
- Electrical installation
- Elevator maintenance
- Industrial equipment maintenance
- Building management systems

---

## 8. Investor Strategy

### 8.1 Target Investors

**Primary target: Speedinvest** (Vienna-based)
- 2026 thesis: **Physical AI** — "AI off the screen into factories, hospitals, logistics"
- Investment range: EUR 250K-30M
- Leads 85% of initial rounds
- Climate tech / industrial tech focus
- Vienna proximity for relationship building

**Secondary targets:**
- Creandum (growth stage, "magical product experience")
- EQT Ventures (later rounds)
- Angel investors from ServiceTitan / HVAC industry

### 8.2 Pitch Framing

1. **Lead with "Physical AI"** — Speedinvest's named thesis for 2026
2. **Present TAM as "AI for all physical trades"** (~EUR 700M+), not just HVAC
3. **Regulatory moat + EU Data Act tailwind** — EU compliance expertise is genuinely hard to replicate; the Data Act forces manufacturers to open equipment data
4. **Capital efficiency** — EUR 55-110/month to run the entire business
5. **Self-learning knowledge base** — not just a chatbot wrapper; the system compounds organizational expertise
6. **Live demo** — show a real session with tool calling, equipment identification, multilingual switching

### 8.3 Pre-Seed / Seed Benchmarks (European)

| Stage | Raise Size | Valuation | Key Metrics |
|-------|-----------|-----------|-------------|
| Pre-Seed | EUR 100K-1M (median EUR 500K) | Median cap EUR 17M | Working MVP demo, 5-10 pilot businesses, founder story |
| Seed | EUR 1M-4M (median EUR 2.5-3.2M) | Median pre-money EUR 19.8M | EUR 0.5-1M ARR or strong early traction |
| Series A | EUR 10-15M | Median pre-money EUR 40-60M | EUR 1-2M ARR, 2-3x YoY growth, NRR >110% |

**AI-native SaaS premium:** AI-native companies command ~EUR 4.6M median seed deal size — roughly EUR 1M above market average.

**At pre-seed, revenue is not required.** You need: (1) a working MVP demo, (2) 5-10 HVAC businesses who've tested it and given positive feedback, (3) a compelling founder story.

### 8.4 Comparable Funded Deals (2024-2026)

| Company | Round | Amount | Focus | Relevance |
|---------|-------|--------|-------|-----------|
| **Rebar** | Series A (2024) | $14M | AI HVAC quoting/estimating from blueprints | Direct HVAC + AI; back-office, not field |
| **WorkHero** | Seed (2025) | $5M | AI back-office for small HVAC contractors | Direct HVAC + AI; Navitas Capital + ServiceTitan angel |
| **Netic AI** | Series B (2026) | $23M | AI for plumbing & roofing contractors | Founders Fund; AI for physical trades |
| **BrightAI** | Seed + Series A | $66M total | Physical AI platform, wearables | Validates "AI for physical work" thesis |
| **mimic Robotics** | Seed (2026) | $16M | Physical AI — imitation learning for robots | Speedinvest portfolio; Physical AI thesis |

**Market signal:** Over **$300M** flowed into contractor-focused AI startups in Q1 2026.

---

## 9. Moat & Defensibility

Based on analysis of 578 AI companies that raised $50M+, moats are ranked by durability:

**Tier 1 — Hardest to Replicate:**
- **Regulatory moat:** GDPR + AI Act + F-Gas (EU 2024/573) compliance baked into the product. A US competitor needs years to replicate EU regulatory expertise. The DSB, AI Act transparency obligations, and Product Liability Directive create compliance barriers that compound over time.
- **Physical moat:** Purpose-built for real physical work — not a chat wrapper. The tool system (error codes, refrigerant calculations, safety recalls) is domain-specific and hard to replicate without HVAC expertise.

**Tier 2 — Strong but Conditional:**
- **Workflow moat:** Once the AI copilot is the first thing a technician opens on every job, switching costs are enormous because the organization's institutional knowledge lives in the system.
- **Network moat:** Cross-organization learning — a Daikin VRV error code solved in Vienna helps a technician in Munich, but only if they're on our platform. Anonymized, aggregated patterns make the AI smarter for everyone.

**Tier 3 — Fragile (do NOT lead with this):**
- **Data moat:** Every AI startup claims a data moat. Investors have heard it. Data moats are the most easily replicated — competitors can collect HVAC data too. The knowledge base is valuable, but it's the *verified* knowledge (with human review) and the *workflow embedding* that create defensibility, not the raw data.

**Recommended narrative:**

> "Every AI session generates three layers of compounding value: (1) Organization Intelligence — each session enriches the org's context; after 100 sessions, the AI knows your fleet better than any new hire could learn in a year. (2) Workforce Acceleration — new hires ramp faster because the AI carries institutional knowledge, creating measurable ROI that locks in the subscription. (3) Cross-Organization Learning — anonymized patterns across all customers make the AI smarter for everyone, but only if they're on our platform."

---

## 10. Go-to-Market Strategy

### 10.1 Phase 1: Validation (Months 1-6)

- **Direct outreach** to WKO SHL member businesses in Vienna
- Partner with 3-5 HVAC companies for pilot (target: 50-200 active technicians)
- **Channel:** WKO events, HVAC trade shows (ISH, IFH Intherm), Austrian Innungen (trade guilds)
- Free product, no commitment — just install and use
- Weekly check-ins with pilot partners for feedback

### 10.2 Phase 2: Organic Growth (Months 6-18)

- **Referral loop:** Each successful pilot generates 2-3 referrals via the tight-knit Austrian SHL community
- **Content strategy:** Case studies documenting time-to-competency reduction, callback rate changes, multilingual workforce enablement
- **Trade press:** Articles in Austrian HVAC publications (Kälte Klima Aktuell, HLK)
- Convert pilot users to paid Professional tier

### 10.3 Phase 3: DACH Expansion (Months 18+)

- Expand to Germany (35,000+ HVAC companies) and Switzerland
- i18n + multilingual AI already in place
- Leverage Austrian case studies for DACH credibility

---

## 11. Key Metrics & KPIs

### MVP Validation Phase

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Weekly Active Technicians (WAT) | 50-200 | Core adoption signal |
| Sessions per technician per week | >3 | Proves the product is part of the workflow |
| Average session duration | Decreasing over time | Indicates technicians are learning faster |
| Time from onboarding to first session | <5 minutes | Validates 30-second onboarding claim |
| NPS / feedback rating | >4.0/5.0 average | Product-market fit signal |
| Reconnection rate | <10% of sessions | Technical stability |
| Knowledge base articles generated | Growing weekly | Flywheel is spinning |

### Growth Phase

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Net Revenue Retention (NRR) | >110% | Expansion revenue from seat growth |
| Logo churn rate | <5% monthly | Subscription stickiness |
| AI cost per session | EUR 0.02-0.10 | Unit economics viability |
| Time-to-competency reduction | Measurable improvement | Core value prop for business owners |
| First-time fix rate improvement | If FSM integrated | ROI quantification |
| Knowledge base verification rate | >60% of articles reviewed | Quality of compounding knowledge |

### Investor-Facing Benchmarks (from Augmentir)

These are the numbers we need to demonstrate or exceed during validation:
- 82% onboarding time reduction
- 37% productivity improvement
- 27% downtime decrease
- 94% first-time fix rate (Intelligent Technician benchmark)

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Gemini API outage/deprecation** | Medium | Critical | Architecture abstraction layer behind `LiveSessionProvider` interface; on-device Gemma 4 E2B for connectivity loss; evaluate OpenAI Realtime API as cloud fallback post-PMF |
| **GDPR enforcement action** | Low | High | Privacy-by-design architecture (stream-and-discard); Art. 30 processing records prepared; DPAs signed with all sub-processors; Interessenabwagung documented |
| **Product liability claim** | Low | Critical | Aggressive disclaimers at session start; opt-in session logging for evidence; AI scope limitation (refuses out-of-competence work); Terms of Service with liability caps; legal counsel review before launch |
| **Technician adoption resistance** | Medium | High | Voice-first UX, 30-second onboarding, multilingual support; pilot with tech-forward companies first; demonstrate time savings in first session |
| **Competitor enters with more funding** | Medium | Medium | First-mover advantage in Austrian market; regulatory moat (EU compliance expertise); workflow embedding (switching costs after knowledge accumulates) |
| **Poor connectivity at job sites** | High | Medium | On-device Gemma 4 E2B fallback (Phase 2); Gemini sessionResumption for reconnection; cached knowledge articles via MMKV; graceful degradation UI |
| **EU AI Act non-compliance** | Low | High | Non-dismissible AI indicator implemented from day one; AI-generated labels on all outputs; no emotion recognition in any metric; formal risk classification document prepared |
| **Pricing too low for sustainability** | Medium | Medium | Validate with customer interviews; monitor AI cost per session closely; consider value-based pricing tiers; XOi charges $99/user/month as upper anchor |

---

## 13. Open Questions — Resolved

### Q1: Session Recording Consent

**Resolution:** Implement opt-in session recording with explicit per-session GDPR consent. The new Product Liability Directive (2024/2853) creates a strong argument for recording — without evidence of what the AI said, you cannot defend against liability claims. Frame as "training mode" for business owners who want to review sessions for quality and training purposes. Requires separate data retention policy and right to deletion.

### Q2: Dispatcher Integration

**Resolution:** Start with a lightweight webhook system (Phase 2). Push job context into AI sessions (equipment type, customer history) and receive session summaries back. A full dispatch board in the dashboard is Phase 3 — it requires a job/ticket data model that doesn't exist in MVP.

### Q3: AI Model Fallback

**Resolution:** Design an abstraction layer now but don't implement multi-model cloud support for MVP.
1. Abstract the Gemini WebSocket connection behind a `LiveSessionProvider` interface
2. On-device Gemma 4 E2B handles connectivity loss (covers the most common failure mode)
3. OpenAI Realtime API as a cloud fallback is architecturally feasible but doubles integration complexity — defer to post-PMF
4. Frame the dependency for investors: "Google is our AI provider today. Our architecture is model-agnostic — the session store, tool definitions, and system prompts transfer to any multimodal API."

### Q4: Pricing Validation

**Resolution:** Conduct structured interviews with 10+ HVAC business owners before finalizing EUR 29/tech/month. Key questions: What would you pay for a tool that makes every technician perform like your best technician? How much do callbacks cost you per month? How long does it take to train a new hire to work independently? Anchor against value delivered (callback reduction, training acceleration), not against competitor pricing.

### Q5: End-Customer Visibility

**Resolution:** This is a positioning question, not a technical one. Recommend transparency — position AI guidance as a quality assurance measure: "Your technician is supported by the latest diagnostic tools." The EU AI Act requires disclosure to the user (technician), but does not require disclosure to the end customer. Let each HVAC business decide their own positioning.

### Q6: Equipment Manual Uploads

**Resolution:** Phased approach:
- **Phase 1:** Allow owners to paste key information as structured text into custom system prompt settings (already designed in org_settings)
- **Phase 1.5:** PDF upload with ColPali multimodal RAG pipeline — treats each page as an image, captures both text and diagrams without OCR preprocessing. Stored in Qdrant, retrieved via `searchKnowledgeBase` tool.
- **Phase 2:** Manufacturer API integrations enabled by the EU Data Act's "access by design" mandate

### Q7: Safety Liability

**Resolution:** Legal counsel review is required before launch. In the interim:
- Aggressive disclaimers at every session start and in the app's About section
- AI scope limitation: refuses to guide work outside its competence boundaries (electrical work requiring licensed electrician, gas work without F-Gas certification)
- Opt-in session logging for liability evidence
- Terms of Service with clear liability limitation clauses
- The AI must never be positioned as a substitute for professional training or certification
- Document the AI's safety behaviors thoroughly for insurance and regulatory review

---

*This document covers business strategy, regulatory compliance, and investor readiness for **Aucta**. For the complete technical specification, see [TECH-SPEC.md](./TECH-SPEC.md).*
