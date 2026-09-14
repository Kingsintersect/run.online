import { DefaultSession } from "next-auth"
import { UserRole } from "@/config/nav.config"
import type { MajorProgramScope } from "@/types/school"

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
      majorProgramScope?: MajorProgramScope
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
    majorProgramScope?: MajorProgramScope
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
    majorProgramScope?: MajorProgramScope
  }
}
