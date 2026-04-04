import { initTRPC } from "@trpc/server";
import { auth } from "@aucta/auth";

export interface TRPCContext {
  session: {
    userId: string;
    activeOrganizationId: string | null;
  } | null;
  headers: Headers;
  ip: string | null;
}

export const createTRPCContext = async (opts: {
  headers: Headers;
}): Promise<TRPCContext> => {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  // x-forwarded-for may contain multiple IPs from proxy chain; use the first (client IP)
  const ip =
    opts.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  return {
    session: session
      ? {
          userId: session.user.id,
          activeOrganizationId:
            session.session.activeOrganizationId ?? null,
        }
      : null,
    headers: opts.headers,
    ip,
  };
};

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
