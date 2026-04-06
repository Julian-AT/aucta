import { z } from "zod";

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof LoginInput>;

export const SignUpInput = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export type SignUpInput = z.infer<typeof SignUpInput>;

export const SessionDTO = z.object({
  userId: z.string(),
  activeOrganizationId: z.string().nullable(),
});

export type SessionDTO = z.infer<typeof SessionDTO>;
