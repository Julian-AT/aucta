agents.md

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Aucta**

Aucta is a real-time AI copilot for HVAC technicians. The mobile app streams camera video and microphone audio directly to Google's Gemini 2.5 Flash Live API via WebSocket. Gemini reasons over the multimodal input, calls domain-specific tools (error code lookup, knowledge base search), and streams spoken guidance back in the technician's language. A self-learning knowledge base compounds organizational expertise with every session. A Next.js dashboard (later milestone) gives business owners visibility into team activity, session analytics, and knowledge base management.

**Core Value:** A technician points their phone camera at HVAC equipment, speaks naturally in any language, and receives expert-level spoken guidance in real time — like having a master technician looking over their shoulder on every job.

### Constraints

- **Tech stack:** Pinned to April 2026 latest stable versions as specified in TECH-SPEC.md (Expo SDK 55, Next.js 16, TypeScript 6, Bun 1.3.x, etc.)
- **Data residency:** All data must remain in EU (Neon Frankfurt, Upstash EU, Qdrant EU)
- **AI model:** Gemini 2.5 Flash Live API for real-time multimodal; ephemeral tokens for API key security
- **Architecture:** Repository pattern (Drizzle stays in repositories), DTO boundaries (Zod-validated), constructor injection, vertical slices, ErrorWithCode in services / TRPCError only in routers
- **Mobile UX:** Two taps max to start session, 56x56dp touch targets, audio-first, works in portrait + landscape, WCAG AAA contrast
- **Compliance:** Non-dismissible AI indicator (EU AI Act), no emotion recognition, AI-generated content labels, aggressive safety disclaimers
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework / Runtime
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Turborepo** | 2.9.x | Build orchestrator | Vercel-native, 96% perf improvement in 2.9, stable `turbo query` for repo analysis, auto-detects Bun workspaces. Deprecations in 2.9 prep for 3.0 -- pin to 2.9.x and track. | HIGH |
| **Bun** | 1.3.x | Package manager + runtime | 25-30x faster installs, transparent `node_modules` for Metro compatibility. Promoted to stable package manager in Turborepo 2.6. Use Bun for package management and server-side runtime; Metro still runs on Node.js. | HIGH |
| **TypeScript** | 6.0.x | Language | Last release on the JavaScript codebase before the Go rewrite (TS 7). Stable, well-tested. The Go port promises 10x speedup but ships in TS 7 -- no need to wait. TS 6 strict mode is the right call. | HIGH |
### Mobile
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Expo SDK** | 55 | Mobile framework | Released. Uses React Native 0.83 (zero user-facing breaking changes) and React 19.2. New Architecture is default (Legacy Architecture support removed). Expo packages now share the SDK major version (e.g., `expo-camera@^55.0.0`). | HIGH |
| **Expo Router** | 55.x | Navigation | File-based routing, typed routes, deep linking. Comes with SDK 55. New features: Colors API, Apple Zoom transition, SplitView. | HIGH |
| **NativeWind** | **4.2.3 (stable) or 5.0.0-preview.3 (preview)** | Mobile styling | **CRITICAL GOTCHA: v5 is NOT stable.** v5.0.0-preview.3 is a pre-release with active bug fixes (broken export conditions, CI fixes). v4.2.3 is the latest stable. See Gotchas section for recommendation. | MEDIUM |
| **Tailwind CSS** | 4.2.x | Design system | New Oxide engine, CSS-first config, text-shadow and mask utilities in 4.1. Shared design tokens across web + mobile. | HIGH |
| **React Native Reusables** | Latest | Mobile components | shadcn philosophy for React Native, NativeWind-based. Community-maintained, less mature than shadcn/ui for web. | MEDIUM |
| **Zustand** | 5.0.x | Client state (live sessions) | v5.0.12 confirmed released. `getState()`/`setState()` outside React -- essential for WebSocket and native audio callbacks that fire outside the React render cycle. | HIGH |
| **react-native-audio-api** | 0.11.7 | Audio playback | Software Mansion library, Web Audio API-like interface. Supports streaming generated audio. Pre-1.0 but actively maintained with frequent releases. **AudioBufferQueueSourceNode support is undocumented** -- verify before committing. | MEDIUM |
| **MMKV** | 4.3.x | Local storage | 30x faster than AsyncStorage, synchronous. Required for offline caching of session summaries and knowledge articles. | HIGH |
| **expo-camera** | ^55.0.0 | Video capture | 1 FPS JPEG capture. Ships with SDK 55. | HIGH |
| **expo-av** | **REMOVED from Expo Go** | Audio recording | **GOTCHA: expo-av removed from Expo Go in SDK 55.** Replaced by `expo-video` and `expo-audio`. Must use development builds for audio recording testing. Evaluate whether `expo-audio` (new) or `expo-av` (via dev build) is the right choice for PCM 16kHz recording. | HIGH |
### Web Dashboard
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Next.js** | 16.2.x | Dashboard framework | Cache Components (`"use cache"`), Turbopack stable (default bundler), React Compiler stable, 400% faster dev startup. Breaking changes: async params semantics changed, image defaults changed. | HIGH |
| **shadcn/ui** | CLI v4 | Dashboard components | Copy-paste ownership, Radix primitives, accessible. Mature ecosystem. | HIGH |
| **TanStack Query** | 5.x | Server state | Required by tRPC 11. `isPending` replaces `isLoading`. | HIGH |
### API & Data
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **tRPC** | 11.16.x | Internal API | End-to-end type safety. v11 breaking changes: transformers moved to links, React Query v5 required, TS >= 5.7.2 required. SSE subscriptions built-in. | HIGH |
| **Zod** | 4.3.x | Validation | Stable. Major rewrite: faster parsing, smaller bundle, tree-shakable `zod/mini`. Breaking changes in error customization APIs (unified `error` parameter replaces `errorMap`/`message`/`invalid_type_error`). New: `z.toJSONSchema()`, `z.email()` top-level, metadata registries, file schemas. | HIGH |
| **Drizzle ORM** | 0.45.x | ORM | 7.4KB footprint, sub-500ms serverless cold starts. v0.45.2 has a critical security fix for `sql.identifier()` escaping. **Do NOT accidentally install v1.0.0-beta.x** -- the migration system was redesigned in beta and is not stable. Pin to `^0.45.0`. | HIGH |
| **Neon Postgres** | Latest (EU Frankfurt) | Database | Serverless, branching for PR previews, EU data residency, copy-on-write for CI. | HIGH |
| **Upstash Redis** | Latest (EU) | Cache + rate limiting | HTTP-based (works in serverless), ephemeral token caching, `@upstash/ratelimit` for tRPC middleware. | HIGH |
| **Qdrant** | 1.17.x | Vector DB | Multivector support since v1.10 with `max_sim` comparator -- native ColBERT-style late interaction retrieval. Named vectors for multiple embedding types per point. v1.17.1 adds relevance feedback, audit access logging, and unlimited update queue. EU deployment available on Qdrant Cloud. | HIGH |
| **Inngest** | 4.1.x | Background jobs | v4.1.2 confirmed. Built-in realtime support (replaces deprecated `@inngest/realtime`). Serverless-native step functions with independent retries. Free tier: 25K-50K runs/month. Watch for: Connect worker shutdown fixes were recent -- ensure v4.1.2+. | HIGH |
### Authentication
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Better Auth** | 1.5.x | Auth framework | v1.5.6 confirmed. Open-source, self-hosted, organization plugin with RBAC, Expo plugin. Multi-role user handling in org invites. Data lives in your Postgres. Zero vendor lock-in. New: agent auth plugin, experimental OpenTelemetry. | HIGH |
### AI / Real-Time
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Gemini 2.5 Flash** | Latest | AI model (standard) | GA. Best price-performance for reasoning tasks. Standard pricing: $0.30/1M input tokens (text/image), $2.50/1M output tokens. | HIGH |
| **Gemini 2.5 Flash Live** | Preview | AI model (real-time) | **GOTCHA: "Live Preview" -- not GA.** Sub-second native audio streaming, bidirectional voice/video, ~70 languages, barge-in support, async function calling. API surface may change. | MEDIUM |
| **@google/genai** | 1.48.x | Gemini SDK | v1.48.0 confirmed. Unified SDK replacing legacy `@google/generative-ai`. Supports Live API, ephemeral tokens, streaming, function calling. Use `apiVersion: 'v1alpha'` for Live API and ephemeral tokens. | HIGH |
| **Ephemeral tokens** | N/A | API key security | 1 use per token, 1-minute window to start session, 30-minute message window. Locked to specific model/config via `liveConnectConstraints`. Only compatible with Live API. | HIGH |
| **ColPali** | Latest | Multimodal RAG | Vision-language model for document retrieval (captures text + diagrams as images). ColBERT-style late interaction. **CRITICAL GOTCHA: Python-only library.** No JavaScript SDK. Requires a Python sidecar service for embedding generation. See Architecture section. | MEDIUM |
### Infrastructure & Deployment
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Vercel** | Latest | Dashboard hosting | Native Turborepo support, preview deploys, edge functions, Inngest integration. | HIGH |
| **EAS Build + Workflows** | Latest | Mobile CI/CD | M4 Pro builds, OTA updates via expo-updates. | HIGH |
| **GitHub Actions** | Latest | CI pipeline | Turborepo remote caching. | HIGH |
### Observability & Quality
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Biome** | 2.4.x | Linting + formatting | Single tool replacing ESLint + Prettier, 35x faster. v2.4 adds embedded CSS/GraphQL formatting, 15 new HTML accessibility rules. | HIGH |
| **Vitest** | 4.1.x | Testing | v4.1.2 confirmed. New: `aroundEach`/`aroundAll` hooks, tags/filtering, browser testing improvements. Deprecation of some `vitest/*` entry points -- audit imports. | HIGH |
| **Playwright** | 1.59.x | Web E2E | WebSocket mocking support for Gemini protocol testing. | HIGH |
| **Maestro** | 2.4.x | Mobile E2E | Expo-recommended, YAML-based. | HIGH |
| **MSW** | 2.12.x | API/WS mocking | `ws.link()` for WebSocket interception -- critical for testing Gemini protocol. | HIGH |
| **Sentry** | Next.js 10.47.x / RN 8.7.x | Error tracking | First-class Expo + Next.js SDKs. Free tier. | HIGH |
| **PostHog** | Web 1.364.x / RN 4.2.x | Analytics + feature flags | Self-hostable. PostHog RN SDK at v4.2.2 -- verify Expo SDK 55 compatibility (expo-filesystem web/macOS fix was recent). | MEDIUM |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **react-i18next + expo-localization** | Latest | i18n | From day one -- 7 languages (en, de, tr, sr, hr, pl, ro) are core to the value proposition |
| **@react-native-community/netinfo** | Latest | Connectivity detection | Essential for offline resilience and reconnection logic |
| **expo-keep-awake** | ^55.0.0 | Screen wake lock | Prevents dimming during active AI sessions |
| **@notifee/react-native** | Latest | Android background audio | Foreground service notification for sustained audio recording on Android |
| **expo-notifications** | ^55.0.0 | Push notifications | Expert escalation alerts, session summaries |
| **expo-secure-store** | ^55.0.0 | Secure credential storage | Better Auth session tokens stored in iOS Keychain / Android Keystore |
| **react-email + Resend** | RE 5.2.x / Resend 6.10.x | Transactional email | Session summaries to managers, invite notifications. 3,000 free emails/month |
## Version-Specific Gotchas
### CRITICAL: NativeWind v5 is Preview, Not Stable
### CRITICAL: Gemini 2.5 Flash Live is "Preview"
- Ephemeral tokens: 1 use, 1-minute new-session window, 30-minute message window
- Session reconnection via `sessionResumption` has a ~2-minute disconnection window (per TECH-SPEC)
- Audio input must be raw 16-bit PCM, 16kHz, little-endian
- Audio output is raw 16-bit PCM, 24kHz, little-endian
- Images: JPEG at 1 FPS max
- Requires `apiVersion: 'v1alpha'` for both Live API and ephemeral tokens
- Standard 2.5 Flash: $0.30/1M input, $2.50/1M output
- Live API (3.1 Flash Live Preview reference): audio input $3.00/1M or $0.005/min, audio output $12.00/1M or $0.018/min
- A 15-minute session could cost ~$0.35-$0.50 in API fees alone
### CRITICAL: ColPali is Python-Only
### HIGH: Expo SDK 55 Removes expo-av from Expo Go
- Cannot test audio recording in Expo Go -- must use development builds
- Evaluate `expo-audio` (the new replacement) for PCM 16kHz recording capability
- If `expo-audio` doesn't support raw PCM output, fall back to `expo-av` via development builds
- Push notifications in Expo Go on Android now throw errors -- use dev builds
### HIGH: Expo SDK 55 Requires Xcode 26
### HIGH: Zod 4 Error API Breaking Changes
- `z.toJSONSchema()` -- built-in JSON Schema conversion (replaces `zod-to-openapi` for some use cases)
- `z.email()`, `z.url()` as top-level constructors
- `z.file()` for file upload validation
- Metadata registries for OpenAPI generation
- `zod/mini` for tree-shakable minimal builds (consider for mobile bundle)
### HIGH: tRPC 11 Breaking Changes
### MEDIUM: Drizzle ORM v1.0 Beta Trap
### MEDIUM: react-native-audio-api Pre-1.0
- Direct native module (Swift/Kotlin) using AVAudioEngine / Android AudioTrack
- `expo-audio` (new in SDK 55, evaluate capabilities)
- `react-native-oboe` (Android-only, very low latency)
### MEDIUM: Bun + Metro Compatibility
### LOW: PostHog RN SDK + Expo SDK 55 Compatibility
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Mobile framework | Expo SDK 55 | React Native CLI (bare) | Managed workflow + EAS Build + OTA updates are critical for field-deployed B2B app. Bare workflow adds infrastructure burden with no benefit. |
| Mobile styling | NativeWind v4/v5 | StyleSheet + custom tokens | Tailwind unifies web and mobile design language. StyleSheet works but fragments the design system. |
| Navigation | Expo Router | React Navigation (standalone) | Expo Router wraps React Navigation with file-based routing, typed routes, and deep linking. No reason to go lower-level. |
| Auth | Better Auth | Clerk / Auth0 / Supabase Auth | Better Auth is self-hosted (EU data residency), open-source (no vendor lock-in), has an Expo plugin, and org/RBAC support. Clerk is excellent but adds a vendor dependency and data leaves EU. Auth0 is expensive at scale. |
| ORM | Drizzle | Prisma / Kysely | Drizzle: 7.4KB bundle, SQL-like API, sub-500ms serverless cold starts. Prisma: 2.8MB engine binary, 5-10s cold starts in serverless. Kysely: great but less ecosystem/tooling. |
| Background jobs | Inngest | BullMQ / Trigger.dev | Inngest is serverless-native (runs on Vercel, no Redis infra needed). BullMQ requires a Redis instance and a worker process. Trigger.dev is good but less mature. |
| Vector DB | Qdrant | Pinecone / Weaviate / pgvector | Qdrant: multivector support (ColBERT native), EU hosting, generous free tier, open-source. Pinecone: no EU region until recently, proprietary. Weaviate: heavier, more complex. pgvector: no multivector, limited hybrid search. |
| AI model | Gemini 2.5 Flash Live | OpenAI Realtime API / GPT-4o | Gemini Live: native multimodal (video + audio simultaneously), async function calling (non-blocking), auto language detection for ~70 languages, 30 HD voices, ephemeral tokens for client-direct connection. OpenAI Realtime: audio-only (no video input), higher latency for tool calls, no ephemeral token equivalent for client-direct WebSocket. |
| Linting | Biome | ESLint + Prettier | Biome 2.4: single tool, 35x faster, CSS/GraphQL support. ESLint flat config is improving but still two tools. |
| Testing | Vitest | Jest | Vitest: Vite-native, faster, shared config with build tooling. Jest: slower, more config overhead. |
| Package manager | Bun | pnpm / yarn | Bun: 25-30x faster installs, runs TypeScript directly, native test runner (though we use Vitest). pnpm: solid but slower. |
| State management | Zustand | Redux Toolkit / Jotai | Zustand: `getState()`/`setState()` outside React is essential for WebSocket callbacks. Jotai: atom-based, harder to use outside React. Redux: too much boilerplate. |
| Real-time dashboard | tRPC SSE subscriptions | WebSocket (socket.io) | tRPC SSE: built into tRPC 11, no additional server infrastructure. socket.io: requires a persistent server process, doesn't work well in serverless. |
| Email | React Email + Resend | SendGrid / AWS SES | React Email: React components for templates, type-safe. Resend: 3,000 free/month, simple API. SendGrid: more complex, overkill at this stage. |
| Mobile payments | RevenueCat | Expo IAP / direct StoreKit | RevenueCat: handles receipt validation, cross-platform, free under $2,500/month MTR. Direct StoreKit: significant implementation effort for both platforms. |
## What NOT to Use
| Technology | Why Avoid |
|------------|-----------|
| **Prisma** | 2.8MB engine binary, 5-10s serverless cold starts, heavy migration system. Drizzle is 350x smaller and purpose-built for serverless. |
| **Firebase Auth** | Vendor lock-in, data in US by default, limited RBAC, no organization concept. Better Auth gives full control. |
| **Supabase** | Tempting all-in-one but locks you into their Postgres instance, auth, and storage. Hard to extract later. Individual best-of-breed tools (Neon + Better Auth + Qdrant) are more flexible. |
| **pgvector** | No multivector support for ColBERT-style retrieval. Qdrant handles this natively. pgvector is fine for simple embedding search but insufficient for the knowledge base architecture. |
| **socket.io** | Requires persistent server process. Incompatible with Vercel serverless. tRPC SSE subscriptions work in serverless. |
| **Redux Toolkit** | Excessive boilerplate for this use case. Zustand is simpler and supports external state access needed for WebSocket callbacks. |
| **Expo Go for development** | SDK 55 removed expo-av from Expo Go. Audio and camera testing require development builds. Set up EAS dev builds from day one. |
| **AsyncStorage** | 30x slower than MMKV. No synchronous API. MMKV is the standard for React Native local storage. |
| **zod-to-openapi** | Zod 4 has built-in `z.toJSONSchema()` and metadata registries. Evaluate whether the built-in covers your OpenAPI needs before adding a third-party converter. |
| **@google/generative-ai** | Legacy SDK. Replaced by `@google/genai` which is the unified SDK supporting Live API, ephemeral tokens, and all current features. |
| **NativeWind v5 (for now)** | v5.0.0-preview.3 is not stable. Start with v4.2.3. Upgrade when v5 reaches RC or stable. |
## Installation
# Root dev dependencies
# Mobile app (apps/mobile)
# NativeWind (start with v4 stable, upgrade to v5 when stable)
# react-native-audio-api (verify AudioBufferQueueSourceNode before committing)
# Android background audio
# Dashboard (apps/web) -- Phase 2 milestone
# AI package (packages/ai)
# Database package (packages/db) -- PIN to 0.45.x, avoid beta
# Auth package (packages/auth)
# API package (packages/api)
# Email package (packages/email)
# Shared package (packages/shared)
# E2E testing
## Key Version Pins (package.json root)
## Confidence Assessment
| Area | Confidence | Reason |
|------|------------|--------|
| Core runtime (Turborepo, Bun, TS 6) | HIGH | All GA, well-documented, verified versions |
| Mobile (Expo SDK 55, RN 0.83) | HIGH | Released, RN 0.83 has zero breaking changes |
| NativeWind v5 | LOW | Preview only. Recommend v4.2.3 stable. |
| API layer (tRPC 11, Zod 4, Drizzle) | HIGH | All GA/stable, breaking changes documented |
| Auth (Better Auth) | HIGH | v1.5.6 stable, org plugin mature |
| AI model (Gemini 2.5 Flash Live) | MEDIUM | "Preview" label, pricing/limits unclear, API may change |
| Gemini SDK (@google/genai) | HIGH | v1.48.0 GA, well-documented |
| Ephemeral tokens | MEDIUM | Works but v1alpha API, single-use constraint needs careful session management |
| ColPali | MEDIUM | Python-only, requires sidecar service architecture |
| Audio playback (react-native-audio-api) | MEDIUM | Pre-1.0, AudioBufferQueueSourceNode unverified |
| Vector DB (Qdrant) | HIGH | v1.17.1, multivector support confirmed, EU hosting available |
| Background jobs (Inngest) | HIGH | v4.1.2, recent reliability fixes, serverless-native |
| Observability (Sentry, PostHog, Biome) | HIGH | Mature, well-integrated with Expo + Next.js |
## Sources
- Expo SDK 55 changelog: https://expo.dev/changelog/sdk-55
- NativeWind releases: https://github.com/nativewind/nativewind/releases (v5.0.0-preview.3 pre-release, v4.2.3 latest stable)
- TypeScript 6.0 announcement: https://devblogs.microsoft.com/typescript/ (March 23, 2026)
- Zod 4 release: https://zod.dev/v4 (stable)
- tRPC v11 migration: https://trpc.io/docs/migrate-from-v10-to-v11
- Better Auth releases: https://github.com/better-auth/better-auth/releases (v1.5.6)
- Gemini Live API docs: https://ai.google.dev/gemini-api/docs/live (updated 2026-03-31)
- Gemini ephemeral tokens: https://ai.google.dev/gemini-api/docs/ephemeral-tokens
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- @google/genai releases: https://github.com/googleapis/js-genai/releases (v1.48.0)
- Drizzle ORM releases: https://github.com/drizzle-team/drizzle-orm/releases (v0.45.2 stable, v1.0.0-beta.20 pre-release)
- Inngest releases: https://github.com/inngest/inngest-js/releases (v4.1.2)
- ColPali: https://github.com/illuin-tech/colpali (Python, pip install colpali-engine)
- Qdrant multivector docs: https://qdrant.tech/documentation/concepts/vectors/ (multivector since v1.10, max_sim comparator)
- Qdrant releases: https://github.com/qdrant/qdrant/releases (v1.17.1)
- Next.js blog: https://nextjs.org/blog (16.2.x, March 2026)
- Biome blog: https://biomejs.dev/blog/ (v2.4, Feb 2026)
- Tailwind CSS blog: https://tailwindcss.com/blog (v4.2)
- Zustand releases: https://github.com/pmndrs/zustand/releases (v5.0.12)
- Vitest releases: https://github.com/vitest-dev/vitest/releases (v4.1.2)
- Turborepo blog: https://turborepo.dev/blog (v2.9, March 2026)
- react-native-audio-api: https://github.com/software-mansion/react-native-audio-api (v0.11.7)
- PostHog RN SDK: https://github.com/PostHog/posthog-js-lite/releases (v4.2.2)
- React Native 0.83: https://reactnative.dev/blog (zero user-facing breaking changes)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
