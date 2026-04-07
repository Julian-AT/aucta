---
phase: 01-foundation-and-auth
plan: 05
subsystem: mobile
tags: [expo, react-native, nativewind, tailwind, better-auth, trpc, expo-router, expo-secure-store]

requires:
  - phase: 01-foundation-and-auth
    plan: 03
    provides: tRPC appRouter type and middleware stack (auth, org-scope, rate-limit)

provides:
  - Expo SDK 55 mobile app skeleton at apps/mobile/
  - NativeWind v4.2.3 + Tailwind CSS v3 styling infrastructure
  - Light/dark theme color tokens matching UI-SPEC contract
  - Better Auth Expo client with SecureStore session persistence
  - tRPC v11 client with cookie forwarding from SecureStore
  - SessionProvider with isAuthenticated and hasOrganization state
  - Stack.Protected auth guards in root layout
  - Bottom tab navigator with Home and Settings tabs
  - ScreenContainer and LoadingSpinner common components

affects: [01-06, mobile-screens, session-ui]

tech-stack:
  added: [expo@55, expo-router@55, nativewind@4.2.3, tailwindcss@3.4, expo-secure-store, @better-auth/expo, @trpc/client@11, @trpc/tanstack-react-query@11, @tanstack/react-query@5, zustand@5, lucide-react-native, react-native-reanimated, react-native-safe-area-context, react-native-screens]
  patterns: [expo-router-stack-protected, session-provider-context, trpc-cookie-forwarding, nativewind-metro-monorepo]

key-files:
  created:
    - apps/mobile/package.json
    - apps/mobile/app.json
    - apps/mobile/babel.config.js
    - apps/mobile/metro.config.js
    - apps/mobile/tailwind.config.js
    - apps/mobile/constants/colors.ts
    - apps/mobile/constants/theme.ts
    - apps/mobile/lib/auth-client.ts
    - apps/mobile/lib/api.ts
    - apps/mobile/lib/storage.ts
    - apps/mobile/providers/session-provider.tsx
    - apps/mobile/providers/trpc-provider.tsx
    - apps/mobile/app/_layout.tsx
    - apps/mobile/app/(auth)/_layout.tsx
    - apps/mobile/app/(app)/_layout.tsx
    - apps/mobile/app/(app)/(tabs)/_layout.tsx
    - apps/mobile/components/common/ScreenContainer.tsx
    - apps/mobile/components/common/LoadingSpinner.tsx
  modified: []

key-decisions:
  - "NativeWind v4.2.3 exact pin with Tailwind CSS v3 (not v4/v5) for mobile compatibility"
  - "tRPC v11 createTRPCContext pattern (not deprecated createTRPCReact)"
  - "Cookie forwarding via authClient.getCookie() with credentials:omit to prevent native cookie interference"
  - "Stack.Protected guards route by both isAuthenticated AND hasOrganization state"

patterns-established:
  - "NativeWind v4 metro config: withNativeWind + monorepo watchFolders"
  - "Auth-based routing: Stack.Protected with dual guards (auth + org)"
  - "tRPC v11 client: createTRPCContext + createTRPCClient with httpBatchLink"
  - "SecureStore cookie forwarding in tRPC headers"
  - "Theme tokens: constants/colors.ts (values) + constants/theme.ts (structure)"

requirements-completed: [AUTH-02]

duration: 3min
completed: 2026-04-04
---

# Phase 01 Plan 05: Mobile App Shell Summary

**Expo SDK 55 mobile app with NativeWind v4 styling, Better Auth session persistence via SecureStore, tRPC v11 cookie-forwarding client, and Stack.Protected auth-gated navigation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-04T08:43:42Z
- **Completed:** 2026-04-04T08:47:19Z
- **Tasks:** 2
- **Files created:** 21

## Accomplishments
- Initialized Expo SDK 55 app with NativeWind v4.2.3 (exact pin) and Tailwind CSS v3
- Light/dark theme color tokens matching UI-SPEC contract exactly (WCAG AAA verified colors)
- Better Auth Expo client with expo-secure-store for session persistence across app restarts (AUTH-02)
- tRPC v11 client using createTRPCContext pattern with cookie forwarding from SecureStore
- Root layout with Stack.Protected guards routing users based on auth + org state
- Bottom tab navigator with Home and Settings tabs using lucide-react-native icons

## Task Commits

Each task was committed atomically:

1. **Task 1: Expo SDK 55 Init, NativeWind v4, Theme System, and Common Components** - `1c3a287` (feat)
2. **Task 2: Providers, Auth Client, tRPC Client, and Expo Router Layouts** - `bc6e357` (feat)

## Files Created/Modified

- `apps/mobile/package.json` - Expo SDK 55 app config with NativeWind 4.2.3 exact, Tailwind v3, workspace deps
- `apps/mobile/tsconfig.json` - Extends expo/tsconfig.base with strict mode and @ path alias
- `apps/mobile/app.json` - Expo app config with aucta scheme, expo-router/camera/secure-store plugins
- `apps/mobile/babel.config.js` - NativeWind v4 babel config with jsxImportSource
- `apps/mobile/metro.config.js` - Monorepo-aware metro config with withNativeWind
- `apps/mobile/tailwind.config.js` - Tailwind v3 config with nativewind/preset and theme tokens
- `apps/mobile/global.css` - Tailwind base/components/utilities directives
- `apps/mobile/nativewind-env.d.ts` - NativeWind type reference
- `apps/mobile/constants/colors.ts` - Light/dark color tokens matching UI-SPEC exactly
- `apps/mobile/constants/theme.ts` - Theme structure, touch targets (56dp/44dp), spacing scale
- `apps/mobile/components/common/ScreenContainer.tsx` - SafeAreaView wrapper with consistent padding
- `apps/mobile/components/common/LoadingSpinner.tsx` - Centered ActivityIndicator with accent color
- `apps/mobile/lib/storage.ts` - SecureStore helper (get/set/remove)
- `apps/mobile/lib/auth-client.ts` - Better Auth client with expoClient + organizationClient plugins
- `apps/mobile/lib/api.ts` - tRPC v11 context with createTRPCContext and AppRouter type
- `apps/mobile/providers/session-provider.tsx` - Auth state context (session, isAuthenticated, hasOrganization)
- `apps/mobile/providers/trpc-provider.tsx` - QueryClient + tRPC client with cookie forwarding
- `apps/mobile/app/_layout.tsx` - Root layout with SessionProvider, TRPCProvider, Stack.Protected
- `apps/mobile/app/(auth)/_layout.tsx` - Auth Stack with login, sign-up, org-choice, create/join-org screens
- `apps/mobile/app/(app)/_layout.tsx` - App Stack containing tabs
- `apps/mobile/app/(app)/(tabs)/_layout.tsx` - Bottom tabs with Home and Settings (lucide icons, accent color)

## Decisions Made

- **NativeWind v4.2.3 exact + Tailwind v3:** Pinned NativeWind to exact 4.2.3 (not v5 preview) with Tailwind CSS v3 (not v4 which is CSS-first and incompatible with NativeWind v4). This follows research pitfall 3 guidance.
- **tRPC v11 createTRPCContext:** Used `createTRPCContext` from `@trpc/tanstack-react-query` (v11 pattern), not deprecated `createTRPCReact` (v10). Research pitfall 5 explicitly warns against the v10 pattern.
- **Cookie forwarding approach:** Used `authClient.getCookie()` in httpBatchLink headers with `credentials: "omit"` to prevent native cookie jar interference. This follows research open question 4 recommendation.
- **Dual auth guard:** Stack.Protected routes require BOTH `isAuthenticated` AND `hasOrganization`. Authenticated users without an org are sent to auth flow to complete onboarding (org-choice screen).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The mobile app depends on `EXPO_PUBLIC_API_URL` environment variable which will be configured when the API server is set up.

## Known Stubs

None. All files contain real implementation code. The tab screens (index.tsx, settings.tsx) are defined in the layout but their actual screen components are deferred to Plan 06 (auth screens and content screens).

## Next Phase Readiness

- Mobile app skeleton is ready for Plan 06 to add auth screen content (login, sign-up, org forms, home, settings)
- All providers (SessionProvider, TRPCProvider) are wired and ready
- Theme system is complete for both light and dark modes
- Tab navigator is configured and waiting for screen components

## Self-Check: PASSED

All 21 files verified present. Both task commits (1c3a287, bc6e357) verified in git log.

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-04-04*
