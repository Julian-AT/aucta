import { TRPCError } from "@trpc/server";
import { middleware } from "../trpc.js";
import { protectedProcedure } from "./auth.js";

export const withOrgScope = middleware(async (opts) => {
  const { ctx } = opts;

  // Defensive guard -- protectedProcedure guarantees session, but TS can't infer across middleware boundaries
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  // orgId always from session (D-15), never from client input
  if (!ctx.session.activeOrganizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No active organization selected",
    });
  }

  return opts.next({
    ctx: {
      orgId: ctx.session.activeOrganizationId,
      userId: ctx.session.userId,
    },
  });
});

export const orgProcedure = protectedProcedure.use(withOrgScope);
