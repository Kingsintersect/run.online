import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { UserRole } from "@/config/nav.config"
import { loginWithBackend } from "@/lib/auth/backendAuth"

const normalizeRoles = (roles: string[] | undefined): UserRole[] => {
  if (!roles?.length) return []

  return roles
    .map((role) => role.trim().toUpperCase())
    .filter((role): role is UserRole =>
      (Object.values(UserRole) as string[]).includes(role)
    )
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const password = String(credentials?.password ?? "")
        const identifier = String(credentials?.identifier ?? "").trim()
        if (!identifier || !password) {
          return null
        }

        try {
          const user = await loginWithBackend({ identifier, password })
          // console.log("user", user)
          //  const updatedUser = elevateToSuperAdmin(user)
          //  console.log(updatedUser)
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            availableRoles: user.availableRoles,
            roles: user.roles,
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            permissions: user.permissions,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.availableRoles = user.availableRoles
        token.username = user.username
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.roles = normalizeRoles(user.roles ?? [user.role])
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.avatar = user.avatar
        token.permissions = user.permissions
        return token
      }

      // pushed from client after apiClient silently refreshed
      if (trigger === "update" && session) {
        if (session.accessToken) token.accessToken = session.accessToken
        if (session.refreshToken) token.refreshToken = session.refreshToken
        // Pushed from client after a backend action changed this account's
        // roles/permissions without a fresh login (see
        // fetchRefreshedSessionRoles in backendAuth.ts) — e.g. tuition
        // payment promoting an APPLICANT to STUDENT.
        if (session.role) token.role = session.role
        if (session.availableRoles)
          token.availableRoles = session.availableRoles
        if (session.roles) token.roles = session.roles
        if (session.permissions) token.permissions = session.permissions
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? ""
        session.user.role =
          (token.role as UserRole | undefined) ?? UserRole.STUDENT
        session.user.availableRoles = (token.availableRoles as
          | UserRole[]
          | undefined) ?? [session.user.role]
        session.user.username = (token.username as string | undefined) ?? ""
        session.user.accessToken =
          (token.accessToken as string | undefined) ?? ""
        session.user.refreshToken =
          (token.refreshToken as string | undefined) ?? ""
        session.user.roles = (token.roles as UserRole[] | undefined)?.length
          ? (token.roles as UserRole[])
          : [session.user.role]
        session.user.firstName =
          (token.firstName as string | null | undefined) ?? null
        session.user.lastName =
          (token.lastName as string | null | undefined) ?? null
        session.user.avatar =
          (token.avatar as string | null | undefined) ?? null
        session.user.permissions =
          (token.permissions as string[] | undefined) ?? []
      }

      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? "qhub-portal-dev-secret-change-me",
}
