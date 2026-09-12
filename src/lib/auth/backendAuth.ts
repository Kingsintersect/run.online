import { UserRole } from "@/config/nav.config"
import apiClient from "@/lib/clients/apiClient"
import { clearAllDedupeCaches } from "@/lib/utils/dedupe-async"

const REFRESH_TOKEN_KEY = "refresh_token"
let refreshInFlight: Promise<string | null> | null = null
const isDev = process.env.NODE_ENV === "development"

const logRefreshDebug = (event: string, details?: Record<string, unknown>) => {
  if (!isDev) return
  if (details) {
    console.debug("[auth:refresh]", event, details)
    return
  }
  console.debug("[auth:refresh]", event)
}

type BackendRoleValue = string | null | undefined

export type BackendAuthTokens = {
  accessToken?: string | null
  access_token?: string | null
  refreshToken?: string | null
  refresh_token?: string | null
}

export type BackendAuthUser = {
  id: string | number
  email?: string | null
  username?: string | null
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  role?: BackendRoleValue
  roles?: BackendRoleValue[]
  permissions?: string[]
  avatar?: string | null
}

export type BackendAuthResponse = BackendAuthTokens & {
  user?: BackendAuthUser
  message?: string
}

export type BackendLoginPayload = {
  identifier: string
  password: string
}

export type BackendRegisterPayload = {
  email: string
  username: string
  password: string
  firstName?: string
  middleName?: string
  lastName?: string
  phoneNumber?: string
}

export type BackendRefreshResponse = BackendAuthTokens & {
  message?: string
}

export type NormalizedBackendAuthUser = {
  id: string
  email: string
  username: string
  name: string
  firstName: string | null
  lastName: string | null
  role: UserRole
  availableRoles: UserRole[]
  roles: UserRole[]
  permissions: string[]
  avatar: string | null
}

const normalizeRole = (value: BackendRoleValue): UserRole | null => {
  if (!value) return null

  const normalized = value.trim().toUpperCase()
  return (Object.values(UserRole) as string[]).includes(normalized)
    ? (normalized as UserRole)
    : null
}

const normalizeRoleList = (
  values: BackendRoleValue[] | undefined
): UserRole[] => {
  if (!values?.length) return []

  return values
    .map((value) => normalizeRole(value))
    .filter((value): value is UserRole => Boolean(value))
}

const pickToken = (payload: BackendAuthTokens): string | null => {
  if (typeof payload.accessToken === "string" && payload.accessToken)
    return payload.accessToken
  if (typeof payload.access_token === "string" && payload.access_token)
    return payload.access_token
  return null
}

const pickRefreshToken = (payload: BackendAuthTokens): string | null => {
  if (typeof payload.refreshToken === "string" && payload.refreshToken)
    return payload.refreshToken
  if (typeof payload.refresh_token === "string" && payload.refresh_token)
    return payload.refresh_token
  return null
}

export const getStoredRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null

  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

export const storeRefreshToken = (token: string | null): void => {
  if (typeof window === "undefined") return

  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  } catch {
    // Ignore storage failures.
  }
}

export const storeAccessToken = (token: string | null): void => {
  apiClient.setAccessToken(token, "local")
}

export const storeAuthTokens = (payload: BackendAuthTokens): void => {
  const accessToken = pickToken(payload)
  const refreshToken = pickRefreshToken(payload)

  storeAccessToken(accessToken)
  storeRefreshToken(refreshToken)
}

export const clearStoredAuthTokens = (): void => {
  apiClient.clearAccessToken()
  // Drop cross-request lookup caches so the next user in this tab can't see
  // the previous user's cached data (offering/student/tutor name tables).
  clearAllDedupeCaches()

  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export const normalizeBackendAuthUser = (
  payload: BackendAuthResponse
): NormalizedBackendAuthUser | null => {
  const user = payload.user
  if (!user) return null

  const roles = normalizeRoleList(user.roles)
  const primaryRole = normalizeRole(user.role) ?? roles[0] ?? UserRole.STUDENT
  const availableRoles = roles.length > 0 ? roles : [primaryRole]
  const email = String(user.email ?? "").trim()
  const username = String(user.username ?? "").trim()
  const firstName = user.firstName?.trim() ?? null
  const lastName = user.lastName?.trim() ?? null
  const name =
    user.name?.trim() ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    username ||
    email ||
    "Portal User"

  return {
    id: String(user.id),
    email,
    username,
    name,
    firstName,
    lastName,
    role: primaryRole,
    availableRoles,
    roles: roles.length > 0 ? roles : [primaryRole],
    permissions: user.permissions ?? [],
    avatar: user.avatar ?? null,
  }
}

// Real API: GET /auth/me — Bruno: auth/Me.bru. /auth/login's response only
// carries `roles: string[]`, not permissions (see auth_README.md), so the
// real, backend-granted permission list has to be fetched separately right
// after login. Called with an explicit bearer header (not apiClient's shared
// token state) since this runs inside NextAuth's authorize() before the
// token has been persisted anywhere. Best-effort: a failed lookup here
// degrades to zero permissions rather than failing the whole login.
//
// This is one flat list for the whole account, same as the real backend
// returns — it does not vary by which of the account's roles is currently
// active, so a multi-role user (e.g. TUTOR + HOD) sees the union of both
// regardless of which role they're switched to. That's a backend modeling
// choice, not something the frontend works around.
const fetchMyPermissions = async (accessToken: string): Promise<string[]> => {
  try {
    const me = await apiClient.get<{ permissions?: string[] }>("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return me.permissions ?? []
  } catch {
    return []
  }
}

export type RefreshedSessionRoles = {
  role: UserRole
  availableRoles: UserRole[]
  roles: UserRole[]
  permissions: string[]
}

// Real API: GET /auth/me — Bruno: auth/Me.bru. Called after a backend action
// that can change what roles/permissions this account holds *without* a
// fresh login — e.g. tuition payment verification promotes an APPLICANT to
// STUDENT and enrolls them in courses server-side. The NextAuth session is
// otherwise frozen at whatever roles/permissions it held at sign-in, so
// nothing picks that change up on its own: a role-gated route like /student
// would keep rejecting the now-promoted user until they logged out and back
// in. Callers push the result into the session via next-auth's `update()`
// (see verify-payments/page.tsx's VerifyTuition) so AuthSessionBridge's
// existing session -> zustand sync picks it up the normal way.
//
// Preserves the currently active role if the backend still grants it (so a
// multi-role user doesn't get silently switched); otherwise falls back to
// whichever role now comes first, mirroring loginWithBackend's own
// primary-role selection.
export const fetchRefreshedSessionRoles = async (
  currentActiveRole: UserRole | null
): Promise<RefreshedSessionRoles | null> => {
  try {
    const me = await apiClient.get<{
      roles?: { name?: string | null }[]
      permissions?: string[]
    }>("/auth/me", { access_token: true })

    const roles = normalizeRoleList((me.roles ?? []).map((r) => r.name))
    if (!roles.length) return null

    return {
      role:
        currentActiveRole && roles.includes(currentActiveRole)
          ? currentActiveRole
          : roles[0],
      availableRoles: roles,
      roles,
      permissions: me.permissions ?? [],
    }
  } catch {
    return null
  }
}

export const loginWithBackend = async (
  payload: BackendLoginPayload
): Promise<
  NormalizedBackendAuthUser & { accessToken: string; refreshToken: string }
> => {
  const response = await apiClient.post<BackendAuthResponse>("/auth/login", {
    emailOrUsername: payload.identifier,
    password: payload.password,
  })

  const normalizedUser = normalizeBackendAuthUser(response)
  const accessToken = pickToken(response)
  const refreshToken = pickRefreshToken(response)

  if (!normalizedUser || !accessToken || !refreshToken) {
    throw new Error("Invalid authentication response from backend.")
  }

  const permissions = await fetchMyPermissions(accessToken)

  return {
    ...normalizedUser,
    permissions,
    accessToken,
    refreshToken,
  }
}

export const registerWithBackend = async (
  payload: BackendRegisterPayload
): Promise<BackendAuthResponse> => {
  return apiClient.post<BackendAuthResponse>("/auth/register", payload)
}

const refreshWithBackend = async (): Promise<string | null> => {
  if (refreshInFlight) {
    logRefreshDebug("join-in-flight")
    return refreshInFlight
  }

  logRefreshDebug("start")
  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) {
      logRefreshDebug("missing-refresh-token")
      return null
    }

    try {
      const response = await apiClient.post<BackendRefreshResponse>(
        "/auth/refresh",
        { refreshToken },
        { skipAuthRefresh: true }
      )

      const nextAccessToken = pickToken(response)
      const nextRefreshToken = pickRefreshToken(response) ?? refreshToken

      if (!nextAccessToken) {
        logRefreshDebug("empty-access-token-in-response")
        clearStoredAuthTokens()
        return null
      }

      storeAccessToken(nextAccessToken)
      storeRefreshToken(nextRefreshToken)
      logRefreshDebug("success", {
        accessTokenLength: nextAccessToken.length,
        rotatedRefreshToken: nextRefreshToken !== refreshToken,
      })

      return nextAccessToken
    } catch (error) {
      logRefreshDebug("failed", {
        error: error instanceof Error ? error.message : "unknown",
      })
      clearStoredAuthTokens()
      return null
    }
  })()

  try {
    return await refreshInFlight
  } finally {
    logRefreshDebug("settled-clear-in-flight")
    refreshInFlight = null
  }
}

// Real API: POST /auth/forgot-password — Bruno: auth/Forgot Password.bru.
// Public. Always resolves with the same generic message whether or not the
// email exists (the backend enforces this to prevent account enumeration).
export const requestPasswordReset = async (email: string): Promise<void> => {
  await apiClient.post("/auth/forgot-password", { email })
}

// Real API: POST /auth/change-password — Bruno: auth/Auth - Change Password.bru.
// Authenticated (self). For an already-logged-in user changing their own
// password (incl. completing a forced first-login change after a
// system-generated password). Verifies `currentPassword`; 422 if it's wrong.
// Revokes all refresh tokens server-side — the current access token keeps
// working until its 15-min expiry, so this doesn't sign the user out
// immediately, but the next refresh needs a fresh login.
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> => {
  return apiClient.post<{ message: string }>(
    "/auth/change-password",
    { currentPassword, newPassword },
    { access_token: true }
  )
}

// Real API: POST /auth/reset-password — Bruno: auth/Reset Password.bru.
// Public. Revokes all of the user's refresh tokens server-side on success —
// they must sign in again afterward.
export const resetPasswordWithToken = async (
  token: string,
  newPassword: string
): Promise<void> => {
  await apiClient.post("/auth/reset-password", { token, newPassword })
}

export type AdminCreateUserPayload = {
  email: string
  username: string
  password: string
  firstName?: string
  middleName?: string
  lastName?: string
  phoneNumber?: string
  roleIds: number[]
}

// Real API: POST /auth/users — Bruno: auth/Users - Create (Admin).bru.
// Admin only. Lets an admin create an account and assign role(s) in one
// call — the account is `isVerified: true` immediately (admin-vouched),
// unlike public Register. Needed for onboarding staff who don't
// self-register (bursary, registrar, HOD, etc.).
export const adminCreateUser = async (
  payload: AdminCreateUserPayload
): Promise<{ data: { id: number } }> => {
  return apiClient.post("/auth/users", payload, { access_token: true })
}

// Real API: POST /auth/logout — Bruno: auth/Logout.bru. Revokes the refresh
// token server-side and audit-logs the logout. Best-effort: a failed call
// here (expired token, network error) must never block the client-side
// sign-out that follows it at every call site.
export const logoutFromBackend = async (): Promise<void> => {
  const refreshToken = getStoredRefreshToken()
  try {
    await apiClient.post(
      "/auth/logout",
      refreshToken ? { refreshToken } : undefined,
      { access_token: true }
    )
  } catch {
    // Ignore — proceed with client-side logout regardless.
  } finally {
    clearStoredAuthTokens()
  }
}

apiClient.setRefreshHandler(async () => refreshWithBackend())
