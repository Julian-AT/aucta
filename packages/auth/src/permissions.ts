import { createAccessControl } from "better-auth/plugins";

const statement = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  invite: ["create", "revoke", "view"],
  settings: ["view", "update"],
  team: ["view"],
} as const;

export const ac = createAccessControl(statement);

// Technician -- can use the app and view team only
export const technician = ac.newRole({
  team: ["view"],
});

// Manager -- invite technicians, view team, create members
export const manager = ac.newRole({
  invite: ["create", "view"],
  team: ["view"],
  member: ["create"],
});

// Owner -- full control over org, invites, members, settings
export const owner = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  invite: ["create", "revoke", "view"],
  settings: ["view", "update"],
  team: ["view"],
});
