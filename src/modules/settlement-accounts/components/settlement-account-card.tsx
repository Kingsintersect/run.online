"use client"

import { Landmark, Pencil, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { SettlementAccount } from "../types"
import { GatewayLinkBadges } from "./gateway-link-badges"
import { MaskedAccountNumber } from "./masked-account-number"

interface SettlementAccountCardProps {
  account: SettlementAccount
  onEdit: () => void
  onDelete: () => void
  onToggleActive: (isActive: boolean) => void
  isToggling: boolean
  /** Why the last Active toggle failed — the switch has already reverted. */
  toggleError?: string | null
  onDismissToggleError?: () => void
}

export function SettlementAccountCard({
  account,
  onEdit,
  onDelete,
  onToggleActive,
  isToggling,
  toggleError,
  onDismissToggleError,
}: SettlementAccountCardProps) {
  const switchId = `sa-active-${account.id}`

  return (
    <article
      aria-label={account.label}
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-xs transition-colors dark:bg-card/60",
        !account.isActive && "opacity-75"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
            <Landmark size={16} aria-hidden />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {account.label}
              </h3>
              <Badge variant={account.isActive ? "secondary" : "outline"}>
                {account.isActive ? "Active" : "Inactive"}
              </Badge>
              {account.majorProgramId === null && (
                <Badge variant="outline">Institution-wide</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{account.bankName}</p>
            <MaskedAccountNumber value={account.accountNumber} />
            <p className="text-xs text-muted-foreground">
              {account.accountName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <label
            htmlFor={switchId}
            className="mr-1 text-xs text-muted-foreground"
          >
            Active
          </label>
          <Switch
            id={switchId}
            checked={account.isActive}
            disabled={isToggling}
            onCheckedChange={onToggleActive}
            aria-label={`${account.isActive ? "Deactivate" : "Activate"} ${account.label}`}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label={`Edit ${account.label}`}
          >
            <Pencil size={14} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label={`Delete ${account.label}`}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 size={14} aria-hidden />
          </Button>
        </div>
      </div>

      {toggleError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive dark:bg-destructive/10"
        >
          <p className="flex-1">{toggleError}</p>
          {onDismissToggleError && (
            <button
              type="button"
              onClick={onDismissToggleError}
              aria-label="Dismiss"
              className="rounded p-0.5 hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X size={12} aria-hidden />
            </button>
          )}
        </div>
      )}

      <div className="mt-3 border-t border-border/60 pt-3">
        <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Gateway links
        </p>
        <GatewayLinkBadges account={account} />
      </div>
    </article>
  )
}
