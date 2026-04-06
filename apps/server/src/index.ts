import { config } from "dotenv";
import { resolve } from "node:path";

// Load env vars from monorepo root before any other imports
config({ path: resolve(import.meta.dir, "../../../.env.local") });

const { fetchRequestHandler } = await import("@trpc/server/adapters/fetch");
const { appRouter } = await import("@aucta/api");
const { createTRPCContext } = await import("@aucta/api/trpc");
const { auth } = await import("@aucta/auth");
const { serve: inngestServe } = await import("inngest/bun");
const { inngest, sessionSummarize, knowledgeIngest, knowledgeCompile } = await import("@aucta/api/jobs");

const PORT = Number(process.env.PORT) || 3000;

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Cookie, Authorization, X-Requested-With",
  "Access-Control-Allow-Credentials": "true",
};

function withCors(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin || "*");
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const origin = req.headers.get("origin");
    const method = req.method;

    console.log(`[Server] ${method} ${url.pathname} (origin: ${origin ?? "none"})`);

    if (req.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin);
    }

    let response: Response;

    try {
      if (url.pathname.startsWith("/api/auth")) {
        response = await auth.handler(req);
      } else if (url.pathname.startsWith("/api/trpc")) {
        response = await fetchRequestHandler({
          endpoint: "/api/trpc",
          req,
          router: appRouter,
          createContext: () => createTRPCContext({ headers: req.headers }),
        });
      } else if (url.pathname.startsWith("/api/inngest")) {
        const inngestHandler = inngestServe({
          client: inngest,
          functions: [sessionSummarize, knowledgeIngest, knowledgeCompile],
        });
        response = await inngestHandler(req);
      } else {
        response = new Response("Not Found", { status: 404 });
      }

      console.log(
        `[Server] ${method} ${url.pathname} -> ${response.status}`,
      );
    } catch (err) {
      console.error(`[Server] ${method} ${url.pathname} threw:`, err);
      response = new Response("Internal Server Error", { status: 500 });
    }

    return withCors(response, origin);
  },
});

console.log(`Aucta API server running on http://localhost:${PORT}`);
