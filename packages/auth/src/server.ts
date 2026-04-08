import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db } from "@aucta/db/client";
import { ac, manager, owner, technician } from "./permissions.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [
    "aucta://",
    ...(process.env.NODE_ENV !== "production"
      ? [
          "exp://",
          "exp://**",
          "exp://192.168.*.*:*/**",
          "http://localhost:*",
          "http://127.0.0.1:*",
          "http://192.168.*.*:*",
          "http://10.0.2.2:*",
        ]
      : []),
  ],
  plugins: [
    expo(),
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
