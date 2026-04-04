import { router } from "./trpc.js";
import { orgRouter } from "./routers/org.router.js";
import { inviteRouter } from "./routers/invite.router.js";

export const appRouter = router({
  org: orgRouter,
  invite: inviteRouter,
});

export type AppRouter = typeof appRouter;
