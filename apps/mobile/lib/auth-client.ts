import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { organizationClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL!,
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
