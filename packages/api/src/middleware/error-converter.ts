import { TRPCError } from "@trpc/server";
import { ErrorWithCode } from "@aucta/shared/utils/errors";
import { middleware } from "../trpc.js";

const ERROR_CODE_MAP: Record<string, TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  BAD_REQUEST: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
  UNAUTHORIZED: "UNAUTHORIZED",
};

export const errorConverter = middleware(async (opts) => {
  try {
    return await opts.next();
  } catch (error) {
    if (error instanceof ErrorWithCode) {
      throw new TRPCError({
        code: ERROR_CODE_MAP[error.code] ?? "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }
    throw error;
  }
});
