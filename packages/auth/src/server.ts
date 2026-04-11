import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db } from "@aucta/db/client";
import { ac, manager, owner, technician } from "./permissions.js";

/**
 * Must match the URL the mobile app uses (see EXPO_PUBLIC_API_URL). If this stays
 * localhost while the client calls http://172.x.x.x:3000, sign-in can fail (redirects /
 * cookies). Set BETTER_AUTH_URL to that LAN URL when testing on a device.
 * Also set explicitly so it does not rely only on inference.
 */
const baseURL = process.env.BETTER_AUTH_URL;

export const auth = betterAuth({
  ...(baseURL ? { baseURL } : {}),
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [
    "aucta://",
    "aucta://*",
    ...(process.env.NODE_ENV !== "production"
      ? [
          "exp://",
          "exp://**",
          "exp://192.168.*.*:*/**",
          "exp://172.*.*.*:*/**",
          "exp://10.*.*.*:*/**",
          "http://localhost:*",
          "http://127.0.0.1:*",
          "http://192.168.*.*:*",
          "http://172.*.*.*:*",
          "http://10.*.*.*:*",
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
