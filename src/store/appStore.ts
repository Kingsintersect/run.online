"use client"

import { useSyncExternalStore } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { UserRole } from "@/config/nav.config"
import type { Permission } from "@/types/roles"

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  availableRoles: UserRole[]
  permissions: Permission[]
  firstName?: string
  lastName?: string
  department?: string
  faculty?: string
  matricNo?: string
  staffId?: string
  level?: string
  avatar?: string
}

const ts = "2024-09-01T00:00:00Z"

// Builds Permission objects straight from the backend's flattened "resource.action"
// keys (returned by /auth/login — via a follow-up /auth/me call, since /auth/login
// itself only returns roles — and by /auth/me directly; see bruno/auth/Me.bru). The
// real backend is the single source of truth for permissions: there is no local
// fallback catalog, so an authenticated user's permissions are always exactly what
// this resolves from their real session, including an empty array if the backend
// genuinely granted them none.
export const resolvePermissionsByKeys = (
  permissionKeys: string[]
): Permission[] => {
  if (!permissionKeys.length) return []

  return permissionKeys
    .map((key, index): Permission | null => {
      const [resource, ...actionParts] = key.split(".")
      const action = actionParts.join(".")

      if (!resource || !action) return null

      return {
        id: index + 1,
        resource,
        action,
        module: resource,
        description: null,
        created_at: ts,
      }
    })
    .filter((permission): permission is Permission => Boolean(permission))
}

const clonePermissions = (permissions: Permission[]) =>
  permissions.map((entry) => ({ ...entry }))

const normalizeRole = (role: string): UserRole | null => {
  if ((Object.values(UserRole) as string[]).includes(role))
    return role as UserRole
  return null
}

const APP_ROLE_ORDER: UserRole[] = [
  UserRole.STUDENT,
  UserRole.TUTOR,
  UserRole.STAFF,
  UserRole.HOD,
  UserRole.DEAN,
  UserRole.BURSARY,
  UserRole.DIRECTOR,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
]

const normalizeRoles = (roles: UserRole[]) => {
  const mapped = (roles as string[])
    .map((r) => normalizeRole(r))
    .filter(Boolean) as UserRole[]
  const nextRoles = mapped.filter(
    (role, index) =>
      APP_ROLE_ORDER.includes(role) && mapped.indexOf(role) === index
  )

  return nextRoles
}

export interface AppState {
  user: AppUser | null
  isAuthenticated: boolean
  activeRole: UserRole | null
  availableRoles: UserRole[]
  setUser: (user: AppUser | null) => void
  updateUser: (updates: Partial<AppUser>) => void
  setAvailableRoles: (roles: UserRole[]) => void
  switchRole: (role: UserRole) => void
  logout: () => void
  reset: () => void
}

const initialState = {
  user: null,
  isAuthenticated: false,
  activeRole: null,
  availableRoles: [],
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      setUser: (user) => {
        if (!user) {
          set({
            user: null,
            isAuthenticated: false,
            activeRole: null,
            availableRoles: [],
          })
          return
        }

        const activeRole = normalizeRole(user.role as string)

        if (!activeRole) {
          console.warn(
            `[appStore] Unknown role "${user.role}" — clearing session.`
          )
          set({
            user: null,
            isAuthenticated: false,
            activeRole: null,
            availableRoles: [],
          })
          return
        }

        const normalizedUser =
          activeRole !== user.role ? { ...user, role: activeRole } : user
        const availableRoles = normalizeRoles(
          normalizedUser.availableRoles?.length
            ? normalizedUser.availableRoles
            : [activeRole]
        )

        set({
          user: {
            ...normalizedUser,
            availableRoles,
            permissions: clonePermissions(normalizedUser.permissions ?? []),
          },
          isAuthenticated: true,
          activeRole,
          availableRoles,
        })
      },
      updateUser: (updates) =>
        set((state) => {
          if (!state.user) {
            return state
          }

          const nextRole = updates.role ?? state.user.role
          const nextAvailableRoles = normalizeRoles(
            updates.availableRoles ?? state.availableRoles
          )

          return {
            user: {
              ...state.user,
              ...updates,
              role: nextRole,
              availableRoles: nextAvailableRoles,
              permissions: updates.permissions?.length
                ? clonePermissions(updates.permissions)
                : state.user.permissions,
            },
            activeRole: nextRole,
            availableRoles: nextAvailableRoles,
          }
        }),
      setAvailableRoles: (roles) =>
        set((state) => {
          const nextAvailableRoles = normalizeRoles(roles)

          if (!state.user || nextAvailableRoles.length === 0) {
            return { availableRoles: nextAvailableRoles }
          }

          const nextActiveRole = nextAvailableRoles.includes(state.user.role)
            ? state.user.role
            : nextAvailableRoles[0]

          return {
            availableRoles: nextAvailableRoles,
            activeRole: nextActiveRole,
            user: {
              ...state.user,
              role: nextActiveRole,
              availableRoles: nextAvailableRoles,
            },
          }
        }),
      // Switches which of the user's real assigned roles is "active" (e.g. for
      // someone who is both TUTOR and HOD). Permissions come from the backend as
      // one flat list for the whole account, so they don't change on switch.
      switchRole: (role) =>
        set((state) => {
          if (
            !state.isAuthenticated ||
            !state.user ||
            !state.availableRoles.includes(role)
          ) {
            return state
          }

          return {
            user: { ...state.user, role },
            activeRole: role,
          }
        }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          activeRole: null,
          availableRoles: [],
        }),
      reset: () => set(initialState),
    }),
    {
      name: "qhub-portal-app-store",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        activeRole: state.activeRole,
        availableRoles: state.availableRoles,
      }),
    }
  )
)

export function useAppHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useAppStore.persist.onFinishHydration(onStoreChange),
    () => useAppStore.persist.hasHydrated(),
    () => false
  )
}

export { APP_ROLE_ORDER }
