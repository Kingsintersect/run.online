"use client";

import { UserRole } from "@/config/nav.config";
import RoleGuard from "@/components/dashboard/RoleGuard";

export default function AdminLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return <RoleGuard role={[UserRole.SUPER_ADMIN, UserRole.BURSARY]}>{children}</RoleGuard>;
}
