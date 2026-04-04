import { TRPCError } from "@trpc/server";
import { auth } from "@aucta/auth";
import { OrgSettingsRepository } from "@aucta/db/repositories/org-settings.repository";
import { AuditRepository } from "@aucta/db/repositories/audit.repository";
import { db } from "@aucta/db/client";
import { CreateOrgInput } from "@aucta/shared/schemas/org.schema";
import { router } from "../trpc.js";
import { protectedProcedure } from "../middleware/auth.js";
import { orgProcedure } from "../middleware/org-scope.js";
import { errorConverter } from "../middleware/error-converter.js";
import {
  createRateLimitMiddleware,
  generalLimiter,
} from "../middleware/rate-limit.js";

const orgSettingsRepo = new OrgSettingsRepository(db);
const auditRepo = new AuditRepository(db);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const orgRouter = router({
  create: protectedProcedure
    .use(errorConverter)
    .use(createRateLimitMiddleware(generalLimiter))
    .input(CreateOrgInput)
    .mutation(async ({ ctx, input }) => {
      const org = await auth.api.createOrganization({
        body: { name: input.name, slug: slugify(input.name) },
        headers: ctx.headers,
      });

      // Pitfall 2: creating an org doesn't auto-set it as active
      await auth.api.setActiveOrganization({
        body: { organizationId: org.id },
        headers: ctx.headers,
      });

      await orgSettingsRepo.upsert({
        orgId: org.id,
        industryType: input.industryType,
        location: input.location,
      });

      await auditRepo.log({
        orgId: org.id,
        userId: ctx.session.userId,
        action: "org.created",
        resource: "organization",
        resourceId: org.id,
      });

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
      };
    }),

  getCurrent: orgProcedure.query(async ({ ctx }) => {
    const org = await auth.api.getFullOrganization({
      query: { organizationId: ctx.orgId },
      headers: ctx.headers,
    });

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Organization ${ctx.orgId} not found`,
      });
    }

    const settings = await orgSettingsRepo.findByOrgId(ctx.orgId);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: org.createdAt,
      settings: settings
        ? {
            industryType: settings.industryType,
            location: settings.location,
          }
        : null,
    };
  }),

  getMembers: orgProcedure.query(async ({ ctx }) => {
    const org = await auth.api.getFullOrganization({
      query: { organizationId: ctx.orgId },
      headers: ctx.headers,
    });

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Organization ${ctx.orgId} not found`,
      });
    }

    return (org.members ?? []).map(
      (m: { id: string; user: { name: string; email: string }; role: string }) => ({
        id: m.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      }),
    );
  }),
});
