import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { auth } from "@aucta/auth";
import { InviteRepository } from "@aucta/db/repositories/invite.repository";
import { AuditRepository } from "@aucta/db/repositories/audit.repository";
import { db } from "@aucta/db/client";
import { CreateInviteInput } from "@aucta/shared/schemas/invite.schema";
import { ErrorWithCode } from "@aucta/shared/utils/errors";
import { generateInviteCode, normalizeInviteCode } from "@aucta/shared/utils/invite-code";
import { generateId } from "@aucta/shared/utils/id";
import { INVITE_DEFAULTS } from "@aucta/shared/constants/limits";
import { router } from "../trpc.js";
import { publicProcedure } from "../trpc.js";
import { protectedProcedure } from "../middleware/auth.js";
import { orgProcedure } from "../middleware/org-scope.js";
import { errorConverter } from "../middleware/error-converter.js";
import {
  createRateLimitMiddleware,
  generalLimiter,
} from "../middleware/rate-limit.js";

const inviteRepo = new InviteRepository(db);
const auditRepo = new AuditRepository(db);

export const inviteRouter = router({
  create: orgProcedure
    .use(errorConverter)
    .input(CreateInviteInput)
    .mutation(async ({ ctx, input }) => {
      // D-14: managers can only invite technicians; owners can invite any role
      const member = await auth.api.getFullOrganization({
        query: { organizationId: ctx.orgId },
        headers: ctx.headers,
      });

      const currentMember = (member?.members ?? []).find(
        (m: { userId: string }) => m.userId === ctx.userId,
      );
      const userRole = currentMember?.role ?? "technician";

      if (userRole === "technician") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Technicians cannot create invite codes",
        });
      }

      if (userRole === "manager" && input.role !== "technician") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Managers can only invite technicians",
        });
      }

      const code = generateInviteCode();
      const id = generateId("inv");
      const expiresAt = new Date();
      expiresAt.setDate(
        expiresAt.getDate() + (input.expiresInDays ?? INVITE_DEFAULTS.EXPIRY_DAYS),
      );

      const invite = await inviteRepo.create({
        id,
        orgId: ctx.orgId,
        code,
        createdBy: ctx.userId,
        role: input.role,
        maxUses: input.maxUses ?? INVITE_DEFAULTS.MAX_USES,
        expiresAt,
      });

      await auditRepo.log({
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: "invite.created",
        resource: "invite_code",
        resourceId: id,
        metadata: { role: input.role, code },
      });

      return invite;
    }),

  lookup: publicProcedure
    .use(createRateLimitMiddleware(generalLimiter))
    .use(errorConverter)
    .input(z.object({ code: z.string().length(6) }))
    .query(async ({ input, ctx }) => {
      const normalized = normalizeInviteCode(input.code);
      const invite = await inviteRepo.findByCode(normalized);

      if (!invite) {
        throw ErrorWithCode.NotFound(
          "This invite code is not valid or has been revoked",
        );
      }

      if (invite.expiresAt < new Date()) {
        throw ErrorWithCode.BadRequest("This invite code has expired");
      }

      if (invite.usedCount >= invite.maxUses) {
        throw ErrorWithCode.BadRequest(
          "This invite code has reached its usage limit",
        );
      }

      // D-05: show org preview before confirming join
      const org = await auth.api.getFullOrganization({
        query: { organizationId: invite.orgId },
        headers: ctx.headers,
      });

      return {
        code: invite.code,
        orgName: org?.name ?? "Unknown Organization",
        role: invite.role,
        memberCount: org?.members?.length ?? 0,
      };
    }),

  join: protectedProcedure
    .use(errorConverter)
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const normalized = normalizeInviteCode(input.code);
      const invite = await inviteRepo.findByCode(normalized);

      if (!invite) {
        throw ErrorWithCode.NotFound(
          "This invite code is not valid or has been revoked",
        );
      }

      if (invite.expiresAt < new Date()) {
        throw ErrorWithCode.BadRequest("This invite code has expired");
      }

      if (invite.usedCount >= invite.maxUses) {
        throw ErrorWithCode.BadRequest(
          "This invite code has reached its usage limit",
        );
      }

      // D-12: single org per user -- check existing membership
      const userOrgs = await auth.api.listOrganizations({
        headers: ctx.headers,
      });

      if (userOrgs && userOrgs.length > 0) {
        throw ErrorWithCode.Conflict(
          "You already belong to an organization",
        );
      }

      await auth.api.addMember({
        body: {
          organizationId: invite.orgId,
          userId: ctx.session.userId,
          role: invite.role,
        },
        headers: ctx.headers,
      });

      // Pitfall 2: set active org after joining
      await auth.api.setActiveOrganization({
        body: { organizationId: invite.orgId },
        headers: ctx.headers,
      });

      await inviteRepo.incrementUsage(invite.id);

      await auditRepo.log({
        orgId: invite.orgId,
        userId: ctx.session.userId,
        action: "invite.joined",
        resource: "invite_code",
        resourceId: invite.id,
        metadata: { role: invite.role, code: normalized },
      });

      const org = await auth.api.getFullOrganization({
        query: { organizationId: invite.orgId },
        headers: ctx.headers,
      });

      return {
        orgId: invite.orgId,
        orgName: org?.name ?? "Unknown Organization",
        role: invite.role,
      };
    }),

  list: orgProcedure.query(async ({ ctx }) => {
    return inviteRepo.findByOrg(ctx.orgId);
  }),

  revoke: orgProcedure
    .use(errorConverter)
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only owners can revoke invite codes
      const org = await auth.api.getFullOrganization({
        query: { organizationId: ctx.orgId },
        headers: ctx.headers,
      });

      const currentMember = (org?.members ?? []).find(
        (m: { userId: string }) => m.userId === ctx.userId,
      );

      if (currentMember?.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners can revoke invite codes",
        });
      }

      await inviteRepo.delete(input.inviteId);

      await auditRepo.log({
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: "invite.revoked",
        resource: "invite_code",
        resourceId: input.inviteId,
      });

      return { success: true };
    }),
});
