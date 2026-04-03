import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@aucta/db/client";
import { ac, manager, owner, technician } from "./permissions.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: ["aucta://"],
  plugins: [
    organization({
      ac,
      roles: { owner, manager, technician },
      membershipLimit: 100,
      organizationLimit: 1,
      creatorRole: "owner",
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
});

export type Auth = typeof auth;
