import { z } from "zod";

export const UserDTO = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserDTO = z.infer<typeof UserDTO>;
