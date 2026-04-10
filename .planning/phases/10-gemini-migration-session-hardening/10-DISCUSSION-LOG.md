# Phase 10: Discussion Log

**Phase:** 10 — Gemini Migration & Session Hardening
**Date:** 2026-04-10
**Duration:** ~90 minutes

## Areas Discussed

### 1. Tool Execution Architecture

**Q: How should tool calls reach the server?**
- Options presented: Server proxy, Mobile-direct + Edge relay, Optimize current relay
- Initial selection: Server proxy
- **User correction:** Vercel serverless has a 300-second function timeout. Persistent WebSocket proxy is impossible. `apps/server` is a placeholder that won't exist in production — everything must be serverless.
- Revised options: Mobile-direct + Edge relay, Optimize current relay
- **Decision: Mobile-direct + Edge relay** — Mobile keeps direct Gemini WebSocket via ephemeral tokens. Tool calls relay through Vercel Edge Functions. ~100-200ms latency. Pure serverless.

**Q: Where does apps/server functionality migrate to?**
- Options: All into apps/web, Separate edge API package
- **Decision: All into apps/web** — Token endpoint, tool dispatch, session CRUD, Inngest handlers become Next.js API routes. apps/server gets deleted.

**Q: Should dispatchToolCalls run as a Vercel Edge Function?**
- Options: Edge for tool dispatch, Standard serverless for everything, You decide
- **Decision: Edge for tool dispatch** — dispatchToolCalls runs as Edge Function (~0ms cold start). Other tRPC routes stay standard Node.js serverless.

### 2. Pricing Enforcement

**Q: What happens when an org hits their session cap?**
- Options: Block new sessions only, Block + warn approaching, Hard cutoff all sessions
- **Decision: Block new sessions only** — Never interrupt in-progress sessions.

**Q: What pricing structure for free/validation period?**
- Options: Validation plan (unlimited), Time-limited trial (30 days), Freemium (5 free sessions/month)
- **Decision: Validation plan** — Unlimited sessions during validation. No cap until org moves to paid tier.

**Q: When does a session count against the cap?**
- Options: Count on start, Count on end, Count on minimum duration (>1 min)
- **Decision: Count on start** — Prevents abuse via never-ending sessions.

### 3. Cost Optimization Tuning

**Q: How aggressive should VAD silence detection be?**
- Options: Conservative (0.3 threshold, 500ms silence, 300ms padding), Aggressive (0.5 threshold, 300ms silence, 100ms padding), Ultra-conservative (0.2 threshold, 800ms silence, 500ms padding)
- **Decision: Conservative** — Prioritizes never cutting off technician mid-sentence.

**Q: Which scene-change detection approach?**
- Options: Pixel diff threshold (128x128 grayscale, 15%), Perceptual hash (pHash), ML-based scene detection
- **Decision: Pixel diff threshold** — Simple, fast, no ML dependency. 128x128 downscale, mean absolute diff, 15% threshold.

### 4. Concise Output Prompting

**Q: How should response length adapt to context?**
- Options: Context-adaptive (1-2 simple, 3-4 complex, max 4), Fixed short (always 1-2 sentences), User-configurable verbosity
- **Decision: Context-adaptive** — 1-2 sentences for simple confirmations, 3-4 for complex guidance. Hard cap of 4 sentences.

**Q: Language detection approach?**
- Options: Auto-detect (keep current), Explicit selection, Hybrid (auto-detect + override)
- **Decision: Auto-detect (keep current)** — Gemini auto-detects technician's language. No UI change needed.

## Key Insights

1. **apps/server is a placeholder** — This was not in the roadmap. User clarified it will be deleted; all functionality must run serverless on Vercel.
2. **300s timeout kills WebSocket proxy** — Fundamental constraint that shapes the entire tool execution architecture.
3. **Gemini 3.1 dropped async function calling** — Tool calls now block the response stream. Mobile must handle this behavioral change.
4. **AI-02 latency target adjustment** — Roadmap says <100ms but Edge relay architecture realistically adds 100-200ms. Target adjusted to <200ms.

---

*Phase: 10-gemini-migration-session-hardening*
*Log created: 2026-04-10*
