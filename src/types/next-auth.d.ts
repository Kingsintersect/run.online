import { DefaultSession } from "next-auth"
import { UserRole } from "@/config/nav.config"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      username: string
      role: UserRole
      availableRoles: UserRole[]
      roles: UserRole[]
      accessToken: string
      refreshToken: string
      firstName: string | null
      lastName: string | null
      avatar?: string | null
      permissions: string[]
    }
    error?: string
  }

  interface User {
    id: string
    username: string
    role: UserRole
    availableRoles: UserRole[]
    roles: UserRole[]
    accessToken: string
    refreshToken: string
    firstName: string | null
    lastName: string | null
    permissions: string[]
    avatar?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    username?: string
    role?: UserRole
    availableRoles?: UserRole[]
    roles?: UserRole[]
    accessToken?: string
    refreshToken?: string
    firstName?: string | null
    lastName?: string | null
    avatar?: string | null
    permissions?: string[]
  }
}
