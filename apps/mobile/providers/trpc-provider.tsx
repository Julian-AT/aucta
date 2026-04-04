import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@aucta/api";
import { TRPCProvider } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 2,
      },
    },
  });
}

function makeTRPCClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${process.env.EXPO_PUBLIC_API_URL}/api/trpc`,
        async headers() {
          const cookies = await authClient.getCookie();
          if (!cookies) return {};
          return { Cookie: cookies };
        },
        // Prevent native cookie jar from interfering with SecureStore cookies
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "omit",
          });
        },
      }),
    ],
  });
}

export function TRPCProviderWrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const [trpcClient] = useState(makeTRPCClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider client={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
