"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"

interface AuditTrailLinkProps {
  /** Audit entity type exactly as the backend writes it, e.g. "ResultSheet". */
  entityType: string
  entityId: number
  className?: string
}

/**
 * "Audit trail" button that opens the audit viewer's history for one record.
 * Shared by the result sheet (student-grades) and the promotion run workspace
 * (progression). Shown only with `audit-logs.view`, and only on /admin
 * routes, because the audit pages exist only under /admin.
 */
export function AuditTrailLink({
  entityType,
  entityId,
  className,
}: AuditTrailLinkProps) {
  const pathname = usePathname()
  if (!pathname?.startsWith("/admin/") || entityId <= 0) return null

  return (
    <PermissionGate require={{ resource: "audit-logs", action: "view" }}>
      <Button variant="outline" size="sm" asChild className={className}>
        <Link
          href={`/admin/audit/entity/${encodeURIComponent(entityType)}/${entityId}`}
        >
          <History className="size-3.5" aria-hidden />
          Audit trail
        </Link>
      </Button>
    </PermissionGate>
  )
}
