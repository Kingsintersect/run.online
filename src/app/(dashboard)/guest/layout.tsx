"use client"

import { UserRole } from "@/config/nav.config"
import RoleGuard from "@/components/dashboard/RoleGuard"

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RoleGuard role={UserRole.GUEST}>{children}</RoleGuard>
}
