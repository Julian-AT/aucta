import { router } from "./trpc.js";
import { orgRouter } from "./routers/org.router.js";
import { inviteRouter } from "./routers/invite.router.js";
import { sessionRouter } from "./routers/session.router.js";
import { knowledgeRouter } from "./routers/knowledge.router.js";

export const appRouter = router({
  org: orgRouter,
  invite: inviteRouter,
  session: sessionRouter,
  knowledge: knowledgeRouter,
});

export type AppRouter = typeof appRouter;
