import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { GatewayLinkStatus, SettlementAccount } from "../types"

const STATUS_CLASS: Record<GatewayLinkStatus, string> = {
  LINKED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  // FAILED is an expected state today (no confirmed subaccount API for most
  // providers) and payments still go through unsplit — amber, not red.
  FAILED:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
}

const STATUS_LABEL: Record<GatewayLinkStatus, string> = {
  LINKED: "Linked",
  PENDING: "Linking…",
  FAILED: "Not linked",
}

/**
 * Per-gateway subaccount status (bruno: Settlement Accounts - List). A Credo
 * link is LINKED automatically and its `subaccountCode` is just bankCode +
 * accountNumber (synthetic), so it isn't printed: that would leak the masked
 * account number. Other providers stay FAILED with the server's own reason.
 */
export function GatewayLinkBadges({ account }: { account: SettlementAccount }) {
  const links = account.gatewayLinks
  if (links.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Not linked to any gateway yet.
      </p>
    )
  }

  const directCode = `${account.bankCode}${account.accountNumber}`
  const anyFailed = links.some((l) => l.status === "FAILED")

  return (
    <div className="space-y-1.5">
      <ul className="space-y-1" aria-label="Gateway links">
        {links.map((link) => {
          const isDirect = link.subaccountCode === directCode
          return (
            <li
              key={`${link.gatewayId}-${link.provider}`}
              className="flex flex-wrap items-center gap-1.5 text-xs"
            >
              <span className="font-medium text-foreground capitalize">
                {link.provider}
              </span>
              <Badge className={cn(STATUS_CLASS[link.status])}>
                {STATUS_LABEL[link.status]}
              </Badge>
              {link.status === "LINKED" && isDirect ? (
                <span className="text-muted-foreground">
                  settles straight to this account (no subaccount needed)
                </span>
              ) : (
                link.subaccountCode && (
                  <span className="font-mono text-muted-foreground">
                    {link.subaccountCode}
                  </span>
                )
              )}
              {link.message && (
                <span className="text-muted-foreground">— {link.message}</span>
              )}
            </li>
          )
        })}
      </ul>
      {anyFailed && (
        <p className="text-xs text-muted-foreground">
          Where a gateway isn&apos;t linked, payments through it still go
          through normally; they just aren&apos;t split, and settle into that
          gateway&apos;s main account.
        </p>
      )}
    </div>
  )
}
