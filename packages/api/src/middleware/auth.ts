import { TRPCError } from "@trpc/server";
import { middleware, publicProcedure } from "../trpc.js";

export const isAuthed = middleware(async (opts) => {
  if (!opts.ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  return opts.next({
    ctx: {
      session: opts.ctx.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(isAuthed);
