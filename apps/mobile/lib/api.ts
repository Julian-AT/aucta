import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@aucta/api";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();
