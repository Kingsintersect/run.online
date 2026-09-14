"use client"

import { useEffect, useRef } from "react"
import { signOut, useSession } from "next-auth/react"
import { toast } from "sonner"
import { UserRole } from "@/config/nav.config"
import { useAppStore } from "@/store"
import { resolvePermissionsByKeys } from "@/store/appStore"
import apiClient from "@/lib/clients/apiClient"
import {
  clearStoredAuthTokens,
  getStoredRefreshToken,
  storeAccessToken,
  storeRefreshToken,
} from "@/lib/auth/backendAuth"

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

      if (storedAccessToken) {
        apiClient.setAccessToken(storedAccessToken, "local")
      } else if (session.user.accessToken) {
        storeAccessToken(session.user.accessToken)
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
      return
    }

    if (status === "unauthenticated" && isAuthenticated) {
      appliedSessionSig.current = null
      clearStoredAuthTokens()
      logout()
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
      onUnauthorized: async () => {
        if (sessionExpiredRef.current) return
        // Nothing to log out of — e.g. a stray 401 before the session ever
        // hydrated, or this firing again after the flow below already ran.
        if (!useAppStore.getState().isAuthenticated) return
        sessionExpiredRef.current = true

        clearStoredAuthTokens()
        logout()
        toast.error("Your session has expired. Please log in again.")

        const returnTo =
          typeof window === "undefined"
            ? "/"
            : window.location.pathname + window.location.search
        // Full browser navigation (next-auth's default redirect) — resets
        // every bit of in-memory app/query state along with the session,
        // rather than leaving stale authenticated-view data behind.
        await signOut({
          callbackUrl: `/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`,
        })
      },
    })
  }, [logout, update])

  return <>{children}</>
}
