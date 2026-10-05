"use client"

import { useEffect, useSyncExternalStore } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

// Shared guards for the /auth/* forms (sign-in, sign-up, forgot/reset
// password). They exist so credentials can never land in a URL:
//
//  - Every auth form is `method="post"` and keeps its submit button disabled
//    until React has hydrated. Before hydration there's no onSubmit handler,
//    so a click/Enter would otherwise trigger a *native* form submission —
//    which, with the browser's default GET method, serialises named fields
//    into the query string (found live 2026-10: /auth/signin?identifier=…).
//    A disabled default button also blocks implicit (Enter-key) submission.
//  - Any credential-shaped query params that do arrive (an old bookmark, a
//    past leak, a link that carried the email) are stripped from the URL on
//    load with router.replace, so they don't stay in the address bar/history.

const subscribeNoop = () => () => {}

/** `false` during SSR and the hydration pass, `true` once running on the client. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )
}

/** Query params that must never be left sitting in an /auth/* URL. */
export const SENSITIVE_AUTH_PARAMS = [
  "identifier",
  "password",
  "newPassword",
  "confirmPassword",
  "email",
  "username",
] as const

/**
 * Removes the given query params from the current URL (router.replace, no
 * new history entry). Values are never read or logged — only presence is
 * checked. Other params (callbackUrl, token, …) are left as they are.
 */
export function useStripSensitiveParams(
  keys: readonly string[] = SENSITIVE_AUTH_PARAMS
): void {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const keysSig = keys.join(",")

  useEffect(() => {
    const present = keysSig.split(",").filter((k) => searchParams.has(k))
    if (!present.length) return
    const next = new URLSearchParams(searchParams.toString())
    for (const key of present) next.delete(key)
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    })
  }, [keysSig, pathname, router, searchParams])
}

/** sessionStorage key used to hand the just-registered email to sign-in without putting it in the URL. */
export const SIGNIN_PREFILL_KEY = "auth:signin-prefill"

/** `?reason=` value the session-expiry flow appends to /auth/signin. */
export const SESSION_EXPIRED_REASON = "session-expired"
