export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  TECHNICIAN: "technician",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 3,
  manager: 2,
  technician: 1,
};
