import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { organizationClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./api-url";

console.log("[Auth] Client baseURL:", API_URL);

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: "aucta",
      storagePrefix: "aucta",
      storage: SecureStore,
    }),
    organizationClient(),
  ],
});

export const { useSession, signIn, signUp, signOut } = authClient;
