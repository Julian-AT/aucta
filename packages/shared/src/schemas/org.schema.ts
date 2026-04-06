import { z } from "zod";
import { INDUSTRY_TYPES } from "../constants/industries.js";

export const OrgDTO = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  createdAt: z.date(),
});

export type OrgDTO = z.infer<typeof OrgDTO>;

export const CreateOrgInput = z.object({
  name: z.string().min(2).max(100),
  industryType: z.enum(INDUSTRY_TYPES),
  location: z.string().min(2).max(200),
});

export type CreateOrgInput = z.infer<typeof CreateOrgInput>;
