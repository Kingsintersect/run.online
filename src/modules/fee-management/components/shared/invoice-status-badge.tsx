"use client"

import { cn } from "@/lib/utils"
import type { InvoiceStatus } from "../../types"

interface Config {
  label: string
  className: string
}

const STATUS_CONFIG: Record<InvoiceStatus, Config> = {
  PENDING: {
    label: "Pending",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  PARTIALLY_PAID: {
    label: "Partial",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  PAID: {
    label: "Paid",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  OVERDUE: {
    label: "Overdue",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",
  },
  WAIVED: {
    label: "Waived",
    className:
      "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
}

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export function InvoiceStatusBadge({
  status,
  className,
}: InvoiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
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
