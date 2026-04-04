import type { AppRouter } from "@aucta/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { type ReactNode, useState } from "react";
import { TRPCProvider } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { API_URL } from "@/lib/api-url";

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
  const trpcUrl = `${API_URL}/api/trpc`;
  console.log("[tRPC] Client URL:", trpcUrl);

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: trpcUrl,
        async headers() {
          const cookies = await authClient.getCookie();
          if (!cookies) {
            console.log("[tRPC] No auth cookies available");
            return {};
          }
          return { Cookie: cookies };
        },
        fetch(url, options) {
          const method = options?.method ?? "GET";
          const urlStr = typeof url === "string" ? url : url.toString();
          console.log(`[tRPC] ${method} ${urlStr}`);

          if (options?.body) {
            try {
              const bodyStr =
                typeof options.body === "string"
                  ? options.body
                  : JSON.stringify(options.body);
              console.log("[tRPC] Request body:", bodyStr.slice(0, 500));
            } catch {
              console.log("[tRPC] Request body: [not serializable]");
            }
          }

          const startTime = Date.now();

          return fetch(url, {
            ...options,
            credentials: "omit",
          }).then(
            (response) => {
              const elapsed = Date.now() - startTime;
              console.log(
                `[tRPC] Response: ${response.status} ${response.statusText} (${elapsed}ms)`,
              );
              if (!response.ok) {
                response
                  .clone()
                  .text()
                  .then((body) => {
                    console.error(
                      `[tRPC] Error response body:`,
                      body.slice(0, 1000),
                    );
                  })
                  .catch(() => {});
              }
              return response;
            },
            (error) => {
              const elapsed = Date.now() - startTime;
              console.error(`[tRPC] Network error after ${elapsed}ms:`, {
                message: error?.message,
                name: error?.name,
                url: urlStr,
                cause: error?.cause,
              });
              console.error(
                "[tRPC] Troubleshooting:\n" +
                  `  1. Is the server running? Check: ${API_URL}/api/auth/ok\n` +
                  "  2. On a physical device? EXPO_PUBLIC_API_URL must be your machine's LAN IP, not localhost\n" +
                  "  3. On Android emulator? URL should use 10.0.2.2 instead of localhost\n" +
                  "  4. Firewall blocking port 3000?",
              );
              throw error;
            },
          );
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
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
