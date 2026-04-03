import { z } from "zod";

export const InviteCodeDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  code: z.string().length(6),
  createdBy: z.string(),
  role: z.enum(["technician", "manager"]),
  maxUses: z.number(),
  usedCount: z.number(),
  expiresAt: z.date(),
  createdAt: z.date(),
});

export type InviteCodeDTO = z.infer<typeof InviteCodeDTO>;

export const CreateInviteInput = z.object({
  role: z.enum(["technician", "manager"]),
  maxUses: z.number().int().positive().optional().default(1),
  expiresInDays: z.number().int().positive().optional().default(7),
});

export type CreateInviteInput = z.infer<typeof CreateInviteInput>;

export const LookupInviteResult = z.object({
  code: z.string(),
  orgName: z.string(),
  role: z.enum(["technician", "manager"]),
  memberCount: z.number(),
});

export type LookupInviteResult = z.infer<typeof LookupInviteResult>;
