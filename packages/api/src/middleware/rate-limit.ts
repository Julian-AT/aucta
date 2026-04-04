import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { middleware } from "../trpc.js";

const redis = Redis.fromEnv();

export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "60 s"),
  prefix: "rl:auth",
});

export const tokenLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "60 s"),
  prefix: "rl:token",
});

export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(100, "60 s", 100),
  prefix: "rl:general",
});

export function createRateLimitMiddleware(limiter: Ratelimit) {
  return middleware(async (opts) => {
    // Unauthenticated endpoints use IP as identifier to prevent enumeration attacks
    const identifier =
      opts.ctx.session?.userId ?? opts.ctx.ip ?? "anonymous";
    const { success } = await limiter.limit(identifier);

    if (!success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded. Try again later.",
      });
    }

    return opts.next();
  });
}
