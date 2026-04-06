import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

export function createBaseAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient()],
  });
}

export type AuthClient = ReturnType<typeof createBaseAuthClient>;
