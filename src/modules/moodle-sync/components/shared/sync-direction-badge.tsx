"use client"

import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { SyncDirection } from "../../types"

const DIRECTION_META: Record<
  SyncDirection,
  { icon: LucideIcon; label: string; classes: string }
> = {
  PUSH: {
    icon: ArrowUpRight,
    label: "Push",
    classes: "bg-primary/10 text-primary border-primary/20",
  },
  PULL: {
    icon: ArrowDownLeft,
    label: "Pull",
    classes: "bg-success/10 text-success border-success/20",
  },
  BIDIRECTIONAL: {
    icon: ArrowLeftRight,
    label: "Bidirectional",
    classes:
      "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
}

interface SyncDirectionBadgeProps {
  direction: SyncDirection
  className?: string
}

export function SyncDirectionBadge({
  direction,
  className,
}: SyncDirectionBadgeProps) {
  const meta = DIRECTION_META[direction]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        meta.classes,
        className
      )}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  )
}
