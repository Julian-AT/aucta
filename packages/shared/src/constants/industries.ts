export const INDUSTRY_TYPES = [
  "hvac",
  "plumbing",
  "electrical",
  "refrigeration",
  "building_maintenance",
  "general_contractor",
  "other",
] as const;

export type IndustryType = (typeof INDUSTRY_TYPES)[number];
