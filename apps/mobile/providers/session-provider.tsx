import { createContext, useContext, useEffect, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

interface SessionContextValue {
  session: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    activeOrganizationId: string | null;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasOrganization: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  isLoading: true,
  isAuthenticated: false,
  hasOrganization: false,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data: sessionData, isPending } = authClient.useSession();

  const session =
    sessionData?.user && sessionData?.session
      ? {
          user: {
            id: sessionData.user.id,
            name: sessionData.user.name,
            email: sessionData.user.email,
          },
          activeOrganizationId:
            sessionData.session.activeOrganizationId ?? null,
        }
      : null;

  const isAuthenticated = !!session;
  const hasOrganization = !!session?.activeOrganizationId;

  useEffect(() => {
    console.log("[Session] State changed:", {
      isAuthenticated,
      hasOrganization,
      activeOrgId: session?.activeOrganizationId ?? null,
      userId: session?.user?.id ?? null,
      isPending,
      rawActiveOrgId: sessionData?.session?.activeOrganizationId,
    });
  }, [isAuthenticated, hasOrganization, isPending, session, sessionData]);

  return (
    <SessionContext.Provider
      value={{
        session,
        isLoading: isPending,
        isAuthenticated,
        hasOrganization,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
