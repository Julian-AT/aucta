import { z } from "zod";

export const LinkType = z.enum(["reference", "prerequisite", "related"]);

export type LinkType = z.infer<typeof LinkType>;

export const KnowledgeLinkDTO = z.object({
  id: z.string(),
  sourceArticleId: z.string(),
  targetArticleId: z.string(),
  linkType: LinkType,
  createdAt: z.coerce.date(),
});

export type KnowledgeLinkDTO = z.infer<typeof KnowledgeLinkDTO>;

export const CreateKnowledgeLinkDTO = z.object({
  sourceArticleId: z.string(),
  targetArticleId: z.string(),
  linkType: LinkType,
});

export type CreateKnowledgeLinkDTO = z.infer<typeof CreateKnowledgeLinkDTO>;
