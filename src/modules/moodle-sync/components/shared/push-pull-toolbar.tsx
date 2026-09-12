"use client"

import { ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"

interface PushPullToolbarProps {
  title?: string
  subtitle?: string
  onPush?: () => void
  pushLabel?: string
  pushPending?: boolean
  onPull?: () => void
  pullLabel?: string
  pullPending?: boolean
}

export function PushPullToolbar({
  title,
  subtitle,
  onPush,
  pushLabel = "Push",
  pushPending,
  onPull,
  pullLabel = "Pull",
  pullPending,
}: PushPullToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/4 px-4 py-3">
      <div>
        {title && (
          <p className="text-sm font-semibold text-foreground">{title}</p>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onPull && (
          <PermissionGate require={{ resource: "moodle-sync", action: "pull" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={onPull}
              disabled={pullPending}
              className="h-8 gap-1.5 text-xs"
            >
              {pullPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ArrowDownLeft size={13} />
              )}
              {pullLabel}
            </Button>
          </PermissionGate>
        )}
        {onPush && (
          <PermissionGate require={{ resource: "moodle-sync", action: "push" }}>
            <Button
              size="sm"
              onClick={onPush}
              disabled={pushPending}
              className="h-8 gap-1.5 text-xs"
            >
              {pushPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ArrowUpRight size={13} />
              )}
              {pushLabel}
            </Button>
          </PermissionGate>
        )}
      </div>
    </div>
  )
}
