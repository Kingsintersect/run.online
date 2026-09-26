"use client"

import {
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  BookOpen,
  CreditCard,
  RefreshCw,
  UploadCloud,
  PowerOff,
  HelpCircle,
  Power,
  Cog,
  Ban,
  Send,
  Undo2,
  Megaphone,
  FilePen,
  RotateCcw,
  Lock,
  RefreshCcw,
  CheckCheck,
  History,
  Archive,
  UserCog,
  HandCoins,
  ShieldCheck,
  ShieldOff,
  MailPlus,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AuditAction } from "../types/audit.types"

// ─── Config ───────────────────────────────────────────────────────────────────

interface ActionConfig {
  label: string
  className: string
  icon: LucideIcon
  color: string
}

export const ACTION_CONFIG: Record<AuditAction, ActionConfig> = {
  LOGIN: {
    label: "Login",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    icon: LogIn,
    color: "#10b981",
  },
  LOGOUT: {
    label: "Logout",
    className:
      "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
    icon: LogOut,
    color: "#94a3b8",
  },
  CREATE: {
    label: "Create",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    icon: Plus,
    color: "#3b82f6",
  },
  UPDATE: {
    label: "Update",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    icon: Pencil,
    color: "#f59e0b",
  },
  DELETE: {
    label: "Delete",
    className:
      "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800",
    icon: Trash2,
    color: "#ef4444",
  },
  APPROVE: {
    label: "Approve",
    className:
      "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
    icon: CheckCircle2,
    color: "#22c55e",
  },
  REJECT: {
    label: "Reject",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800",
    icon: XCircle,
    color: "#f43f5e",
  },
  ENROLL: {
    label: "Enroll",
    className:
      "bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800",
    icon: BookOpen,
    color: "#8b5cf6",
  },
  PAYMENT: {
    label: "Payment",
    className:
      "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
    icon: CreditCard,
    color: "#f97316",
  },
  SYNC: {
    label: "Sync",
    className:
      "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800",
    icon: RefreshCw,
    color: "#06b6d4",
  },
  // Added 2026-09-12 — see the CORRECTION note on AuditAction itself.
  PAYMENT_INITIATE: {
    label: "Payment Initiated",
    className:
      "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
    icon: CreditCard,
    color: "#f97316",
  },
  PAYMENT_VERIFY: {
    label: "Payment Verified",
    className:
      "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
    icon: CheckCircle2,
    color: "#22c55e",
  },
  BULK_IMPORT: {
    label: "Bulk Import",
    className:
      "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800",
    icon: UploadCloud,
    color: "#6366f1",
  },
  DEACTIVATE: {
    label: "Deactivate",
    className:
      "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
    icon: PowerOff,
    color: "#64748b",
  }, // Added 2026-09-25: the live ACTIVATE/GENERATE/CANCEL/RESEND_INVITE, plus
  // the Results and session migration actions (see AuditAction).
  ACTIVATE: {
    label: "Activate",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    icon: Power,
    color: "#10b981",
  },
  GENERATE: {
    label: "Generate",
    className:
      "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800",
    icon: Cog,
    color: "#6366f1",
  },
  CANCEL: {
    label: "Cancel",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800",
    icon: Ban,
    color: "#f43f5e",
  },
  RESEND_INVITE: {
    label: "Resend Invite",
    className:
      "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800",
    icon: MailPlus,
    color: "#0ea5e9",
  },
  SUBMIT: {
    label: "Submit",
    className:
      "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800",
    icon: Send,
    color: "#0ea5e9",
  },
  REOPEN: {
    label: "Reopen",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    icon: Undo2,
    color: "#f59e0b",
  },
  PUBLISH: {
    label: "Publish",
    className:
      "bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800",
    icon: Megaphone,
    color: "#14b8a6",
  },
  AMEND: {
    label: "Amend",
    className:
      "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border border-fuchsia-200 dark:border-fuchsia-800",
    icon: FilePen,
    color: "#d946ef",
  },
  REVERT: {
    label: "Revert",
    className:
      "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
    icon: RotateCcw,
    color: "#f97316",
  },
  LOCK: {
    label: "Lock",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800",
    icon: Lock,
    color: "#64748b",
  },
  REFRESH: {
    label: "Refresh",
    className:
      "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800",
    icon: RefreshCcw,
    color: "#06b6d4",
  },
  COMMIT: {
    label: "Commit",
    className:
      "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
    icon: CheckCheck,
    color: "#22c55e",
  },
  REVERSE: {
    label: "Reverse",
    className:
      "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
    icon: History,
    color: "#f97316",
  },
  DISCARD: {
    label: "Discard",
    className:
      "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800",
    icon: Archive,
    color: "#ef4444",
  },
  OVERRIDE: {
    label: "Override",
    className:
      "bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800",
    icon: UserCog,
    color: "#8b5cf6",
  },
  WAIVE: {
    label: "Waive",
    className:
      "bg-lime-500/10 text-lime-700 dark:text-lime-400 border border-lime-200 dark:border-lime-800",
    icon: HandCoins,
    color: "#84cc16",
  },
  DEBT_OVERRIDE: {
    label: "Debt Override",
    className:
      "bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800",
    icon: ShieldCheck,
    color: "#8b5cf6",
  },
  DEBT_OVERRIDE_REMOVE: {
    label: "Debt Override Removed",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800",
    icon: ShieldOff,
    color: "#64748b",
  },
}

// Fallback for any action value the backend adds in the future that this
// map hasn't been updated for yet — renders a neutral badge instead of
// crashing (this is exactly how the 4 actions above were discovered: a
// live log row with an action outside this map threw inside ActionBadge
// with no fallback at all).
const UNKNOWN_ACTION_CONFIG: ActionConfig = {
  label: "Unknown",
  className:
    "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700",
  icon: HelpCircle,
  color: "#6b7280",
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ActionBadgeProps {
  action: AuditAction
  size?: "sm" | "md"
  showIcon?: boolean
}

export function ActionBadge({
  action,
  size = "md",
  showIcon = true,
}: ActionBadgeProps) {
  const config = ACTION_CONFIG[action] ?? UNKNOWN_ACTION_CONFIG
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
        config.className,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      )}
    >
      {showIcon && (
        <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      )}
      {config.label}
    </span>
  )
}
