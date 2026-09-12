"use client"

import { cn } from "@/lib/utils"
import type { FeeCategory } from "../../types"

interface Config {
  label: string
  className: string
}

const CATEGORY_CONFIG: Record<FeeCategory, Config> = {
  APPLICATION: {
    label: "Application",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  ACCEPTANCE: {
    label: "Acceptance",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  TUITION: {
    label: "Tuition",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  HOSTEL: {
    label: "Hostel",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  CLEARANCE: {
    label: "Clearance",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  OTHER: {
    label: "Other",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
}

interface FeeCategoryBadgeProps {
  category: FeeCategory
  className?: string
}

export function FeeCategoryBadge({
  category,
  className,
}: FeeCategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
