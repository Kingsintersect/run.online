"use client"

import { useCallback, useEffect, useRef } from "react"
import { signOut, useSession } from "next-auth/react"
import { toast } from "sonner"
import { UserRole } from "@/config/nav.config"
import { useAppStore } from "@/store"
import { resolvePermissionsByKeys } from "@/store/appStore"
import apiClient, { ApiClientError } from "@/lib/clients/apiClient"
import {
  clearStoredAuthTokens,
  getStoredRefreshToken,
  storeAccessToken,
  storeRefreshToken,
} from "@/lib/auth/backendAuth"
import { SESSION_EXPIRED_REASON } from "@/lib/auth/use-auth-form-guard"

const SIGN_IN_PATH = "/auth/signin"

const onAuthPage = (): boolean =>
  typeof window !== "undefined" && window.location.pathname.startsWith("/auth/")

// Asks the backend directly whether the current access token is still
// accepted. Sent with an explicit header (not `access_token: true`), so a
// failure here can't re-enter apiClient's refresh/onUnauthorized flow. Only
// a 401 means "expired"; a network error or 5xx can't prove the session is
// dead, so it counts as still valid (the user isn't logged out on a guess).
async function sessionStillValid(): Promise<boolean> {
  const token = apiClient.getAccessToken()
  if (!token) return false
  try {
    await apiClient.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return true
  } catch (error) {
    return !(error instanceof ApiClientError && error.status === 401)
  }
}

export default function AuthSessionBridge({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status, update } = useSession()
  // Selectors, not a bare `useAppStore()` — otherwise this component
  // re-renders on every store change (including its own `setUser` below).
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)
  const logout = useAppStore((s) => s.logout)
  const setUser = useAppStore((s) => s.setUser)

  // `setUser` always builds a fresh user object and notifies every store
  // subscriber (RoleGuard, Sidebar, dashboard widgets, …), which re-runs
  // `refetchOnMount` queries. next-auth can hand back a new `session` object
  // on ticks where nothing actually changed, so without this guard the effect
  // would call `setUser` on every one of those, thrashing the whole tree.
  const appliedSessionSig = useRef<string | null>(null)
  // Guards the forced-logout-on-expired-session flow below from running more
  // than once — several requests can 401 within the same tick (e.g. a page
  // that fires 2-3 queries on mount), and each would otherwise independently
  // clear tokens and call signOut().
  const sessionExpiredRef = useRef(false)
  // In-flight (or just-finished, cached ~5 s) "is the session still valid?"
  // check, shared by every 401 that arrives in the same burst.
  const verifyingRef = useRef<Promise<boolean> | null>(null)
  // Latest next-auth status, readable from apiClient's hook callbacks (which
  // are registered from an effect and would otherwise see a stale value).
  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])
  // A 401 that arrived while next-auth was still "loading" (before the
  // session -> store sync had run). Re-checked once the session resolves
  // instead of being silently dropped.
  const pendingUnauthorizedRef = useRef(false)
  // One startup probe per page load (see the session effect below).
  const probedRef = useRef(false)

  // Ends a dead session cleanly: tokens, next-auth cookie, then app state,
  // then a hard navigation to sign-in with a "session expired" notice.
  //
  // Order matters. The next-auth cookie is cleared *before* the zustand
  // store is logged out. The old flow logged the store out first, so
  // DashboardLayoutTemplate did router.replace("/auth/signin") while
  // next-auth still said "authenticated", and the sign-in page bounced
  // straight back to the dashboard — a client-side ping-pong that, if
  // signOut() never completed, left a page that never rendered.
  //
  // Loop prevention: on an /auth/* page this never navigates (it only
  // clears state and shows a toast), so the sign-in page can't reload
  // itself forever if the cookie refuses to clear. And the sign-in page
  // never auto-redirects a session it was sent to because of expiry.
  const endSession = useCallback(async () => {
    if (sessionExpiredRef.current) return
    sessionExpiredRef.current = true
    pendingUnauthorizedRef.current = false

    clearStoredAuthTokens()
    appliedSessionSig.current = null
    try {
      await signOut({ redirect: false })
    } catch {
      // The cookie may survive a network failure; the sign-in page retries
      // clearing it when it sees ?reason=session-expired.
    }
    logout()

    if (onAuthPage()) {
      toast.error("Your session expired. Please sign in again.")
      // The same page load can sign in again; let a later expiry be handled.
      sessionExpiredRef.current = false
      probedRef.current = false
      return
    }

    const params = new URLSearchParams({
      reason: SESSION_EXPIRED_REASON,
      callbackUrl: window.location.pathname + window.location.search,
    })
    // Full navigation (not router.replace): resets every bit of in-memory
    // app/query state along with the session, so no stale authenticated
    // view data is left behind.
    window.location.replace(`${SIGN_IN_PATH}?${params.toString()}`)
  }, [logout])

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      const role = session.user.role as UserRole
      const availableRoles = session.user.availableRoles?.length
        ? session.user.availableRoles
        : [role]
      const storedAccessToken =
        typeof window === "undefined"
          ? null
          : localStorage.getItem("access_token")
      const storedRefreshToken =
        typeof window === "undefined"
          ? null
          : localStorage.getItem("refresh_token")

      // Re-seeding from the session cookie is how a stale session used to
      // survive: a failed refresh (POST /auth/refresh -> 401 "revoked")
      // clears localStorage, but the next-auth cookie still holds the old
      // access + revoked refresh tokens. On the next load they were copied
      // back here and the user looked signed in with dead tokens. So
      // whenever tokens come from the cookie, they're probed once (below).
      let seededFromSession = false
      if (storedAccessToken) {
        apiClient.setAccessToken(storedAccessToken, "local")
      } else if (session.user.accessToken) {
        storeAccessToken(session.user.accessToken)
        seededFromSession = true
      }

      if (!storedRefreshToken && session.user.refreshToken) {
        storeRefreshToken(session.user.refreshToken)
      }

      const sig = JSON.stringify({
        id: session.user.id,
        role,
        availableRoles,
        permissions: session.user.permissions ?? [],
        name: session.user.name,
        avatar: session.user.avatar ?? null,
        majorProgramScope: session.user.majorProgramScope ?? null,
      })
      if (sig !== appliedSessionSig.current) {
        appliedSessionSig.current = sig
        setUser({
          id: session.user.id || `session-${session.user.email ?? "user"}`,
          name:
            session.user.name ||
            [session.user.firstName, session.user.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            "Portal User",
          email: session.user.email ?? "",
          role,
          availableRoles,
          permissions: resolvePermissionsByKeys(session.user.permissions),
          avatar: session.user.avatar ?? undefined,
          firstName: session.user.firstName ?? undefined,
          lastName: session.user.lastName ?? undefined,
          majorProgramScope: session.user.majorProgramScope,
        })
      }

      // Startup probe: once per page load, when the tokens were just copied
      // from the cookie or a 401 arrived before the session resolved. Sent
      // through apiClient's normal authenticated path, so a dead access
      // token triggers a refresh attempt, and a failed refresh reaches
      // onUnauthorized -> endSession(). A valid session costs one
      // GET /auth/me.
      if (
        !probedRef.current &&
        (seededFromSession || pendingUnauthorizedRef.current)
      ) {
        probedRef.current = true
        pendingUnauthorizedRef.current = false
        void apiClient
          .get("/auth/me", { access_token: true })
          .catch(() => undefined)
      }
      return
    }

    if (status === "unauthenticated") {
      pendingUnauthorizedRef.current = false
      probedRef.current = false
      if (isAuthenticated) {
        appliedSessionSig.current = null
        clearStoredAuthTokens()
        logout()
      }
    }
  }, [isAuthenticated, logout, session, setUser, status])

  // new effect: apiClient -> session, whenever apiClient refreshes
  useEffect(() => {
    apiClient.setHooks({
      onTokenRefreshed: async (token) => {
        if (!token) return
        await update({
          accessToken: token,
          refreshToken: getStoredRefreshToken(),
        })
      },
      // Fires whenever an authenticated request comes back 401 and token
      // refresh either wasn't possible (no/expired refresh token) or ran
      // and still failed — apiClient only calls this once it's given up.
      // System-wide: any page, any request. Force a clean logout instead of
      // leaving the app stuck showing "couldn't load" on every query that
      // happens to fire next.
      onUnauthorized: async (error) => {
        if (sessionExpiredRef.current) return
        // next-auth hasn't resolved the session yet. This 401 used to be
        // dropped here (the store wasn't "authenticated" yet), leaving the
        // page stuck on failed queries with the stale cookie still in place.
        // Defer it: the session effect probes once the status settles.
        if (statusRef.current === "loading") {
          pendingUnauthorizedRef.current = true
          return
        }
        // Nothing to log out of: no next-auth session and no app session.
        if (
          statusRef.current !== "authenticated" &&
          !useAppStore.getState().isAuthenticated
        )
          return

        // One endpoint answering 401 doesn't prove the session is dead: on
        // 2026-09-26 GET /assessments/sync/status returned 401 to valid admin
        // tokens and logged every admin out on dashboard load (see
        // BACKEND_DEVIATIONS B14). Confirm with /auth/me first; only a 401
        // there too means the session really expired. Concurrent 401s share
        // one check.
        verifyingRef.current ??= sessionStillValid().finally(() => {
          setTimeout(() => {
            verifyingRef.current = null
          }, 5000)
        })
        if (await verifyingRef.current) {
          console.warn(
            "[auth] 401 from one endpoint while the session is still valid; not logging out.",
            error.message
          )
          return
        }

        await endSession()
      },
    })
  }, [endSession, update])

  return <>{children}</>
}
