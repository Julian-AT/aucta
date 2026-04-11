import { config } from "dotenv";
import { resolve } from "node:path";

// Load env vars from monorepo root before any other imports
config({ path: resolve(import.meta.dir, "../../../.env.local") });

import { z } from "zod";
import { validateEnv, envSchemas } from "@aucta/shared/utils/env";
import { logger } from "@aucta/shared/utils/logger";

// ── Env validation (fail fast at startup) ──────────────────────────
const serverEnv = validateEnv(
  envSchemas.server.extend({
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(16),
    BETTER_AUTH_URL: z.string().url(),
    GEMINI_API_KEY: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  }),
);

// ── Lazy imports (after env validated) ─────────────────────────────
const { fetchRequestHandler } = await import("@trpc/server/adapters/fetch");
const { appRouter } = await import("@aucta/api");
const { createTRPCContext } = await import("@aucta/api/trpc");
const { auth } = await import("@aucta/auth");
const { serve: inngestServe } = await import("inngest/bun");
const {
  inngest,
  sessionSummarize,
  knowledgeIngest,
  knowledgeCompile,
  knowledgeHealth,
} = await import("@aucta/api/jobs");

// ── CORS (explicit allowlist, no wildcards) ────────────────────────
const allowedOrigins = new Set(serverEnv.ALLOWED_ORIGINS);

function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (allowedOrigins.has(origin)) return origin;
  return null;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Cookie, Authorization, X-Requested-With",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
} as const;

function withCors(response: Response, origin: string | null): Response {
  const allowedOrigin = getAllowedOrigin(origin);
  if (!allowedOrigin) return response;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── Inngest handler (created once, not per request) ────────────────
const inngestHandler = inngestServe({
  client: inngest,
  functions: [
    sessionSummarize,
    knowledgeIngest,
    knowledgeCompile,
    knowledgeHealth,
  ],
});

// ── Request ID ─────────────────────────────────────────────────────
let requestCounter = 0;
function nextRequestId(): string {
  return `req_${Date.now()}_${++requestCounter}`;
}

// ── Server ─────────────────────────────────────────────────────────
const server = Bun.serve({
  port: serverEnv.PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const origin = req.headers.get("origin");
    const method = req.method;
    const requestId = nextRequestId();
    const start = performance.now();

    // Preflight
    if (method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin);
    }

    let response: Response;

    try {
      if (url.pathname === "/health") {
        response = Response.json({ status: "ok", uptime: process.uptime() });
      } else if (url.pathname === "/ready") {
        response = Response.json({ status: "ready" });
      } else if (url.pathname.startsWith("/api/auth")) {
        response = await auth.handler(req);
      } else if (url.pathname.startsWith("/api/trpc")) {
        response = await fetchRequestHandler({
          endpoint: "/api/trpc",
          req,
          router: appRouter,
          createContext: () => createTRPCContext({ headers: req.headers }),
        });
      } else if (url.pathname.startsWith("/api/inngest")) {
        response = await inngestHandler(req);
      } else {
        response = new Response("Not Found", { status: 404 });
      }

      const durationMs = Math.round(performance.now() - start);
      logger.info("request", {
        requestId,
        method,
        path: url.pathname,
        status: response.status,
        durationMs,
      });
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      logger.error("request_error", {
        requestId,
        method,
        path: url.pathname,
        durationMs,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      response = new Response("Internal Server Error", { status: 500 });
    }

    return withCors(response, origin);
  },
});

// ── Graceful shutdown ──────────────────────────────────────────────
function shutdown(signal: string) {
  logger.info("shutdown", { signal });
  server.stop();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

logger.info("server_started", { port: serverEnv.PORT });
