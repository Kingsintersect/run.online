import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { GatewayLink, GatewayLinkStatus } from "../types"

const STATUS_CLASS: Record<GatewayLinkStatus, string> = {
  LINKED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}

export function GatewayLinkBadges({ links }: { links: GatewayLink[] }) {
  if (links.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Not linked to any gateway yet.
      </p>
    )
  }

  return (
    <ul className="space-y-1" aria-label="Gateway links">
      {links.map((link) => (
        <li
          key={`${link.gatewayId}-${link.provider}`}
          className="flex flex-wrap items-center gap-1.5 text-xs"
        >
          <span className="font-medium text-foreground capitalize">
            {link.provider}
          </span>
          <Badge className={cn(STATUS_CLASS[link.status])}>{link.status}</Badge>
          {link.subaccountCode && (
            <span className="font-mono text-muted-foreground">
              {link.subaccountCode}
            </span>
          )}
          {link.message && (
            <span
              className={cn(
                "text-muted-foreground",
                link.status === "FAILED" && "text-destructive"
              )}
            >
              — {link.message}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
