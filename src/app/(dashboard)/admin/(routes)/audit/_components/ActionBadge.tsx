"use client";

import {
    LogIn, LogOut, Plus, Pencil, Trash2,
    CheckCircle2, XCircle, BookOpen, CreditCard, RefreshCw,
    UploadCloud, PowerOff, HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditAction } from "../types/audit.types";

// ─── Config ───────────────────────────────────────────────────────────────────

interface ActionConfig {
    label: string;
    className: string;
    icon: LucideIcon;
    color: string;
}

export const ACTION_CONFIG: Record<AuditAction, ActionConfig> = {
    LOGIN: {
        label: "Login",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
        icon: LogIn,
        color: "#10b981",
    },
    LOGOUT: {
        label: "Logout",
        className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
        icon: LogOut,
        color: "#94a3b8",
    },
    CREATE: {
        label: "Create",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
        icon: Plus,
        color: "#3b82f6",
    },
    UPDATE: {
        label: "Update",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
        icon: Pencil,
        color: "#f59e0b",
    },
    DELETE: {
        label: "Delete",
        className: "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800",
        icon: Trash2,
        color: "#ef4444",
    },
    APPROVE: {
        label: "Approve",
        className: "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
        icon: CheckCircle2,
        color: "#22c55e",
    },
    REJECT: {
        label: "Reject",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800",
        icon: XCircle,
        color: "#f43f5e",
    },
    ENROLL: {
        label: "Enroll",
        className: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800",
        icon: BookOpen,
        color: "#8b5cf6",
    },
    PAYMENT: {
        label: "Payment",
        className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
        icon: CreditCard,
        color: "#f97316",
    },
    SYNC: {
        label: "Sync",
        className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800",
        icon: RefreshCw,
        color: "#06b6d4",
    },
    // Added 2026-09-12 — see the CORRECTION note on AuditAction itself.
    PAYMENT_INITIATE: {
        label: "Payment Initiated",
        className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
        icon: CreditCard,
        color: "#f97316",
    },
    PAYMENT_VERIFY: {
        label: "Payment Verified",
        className: "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
        icon: CheckCircle2,
        color: "#22c55e",
    },
    BULK_IMPORT: {
        label: "Bulk Import",
        className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800",
        icon: UploadCloud,
        color: "#6366f1",
    },
    DEACTIVATE: {
        label: "Deactivate",
        className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
        icon: PowerOff,
        color: "#64748b",
    },
};

// Fallback for any action value the backend adds in the future that this
// map hasn't been updated for yet — renders a neutral badge instead of
// crashing (this is exactly how the 4 actions above were discovered: a
// live log row with an action outside this map threw inside ActionBadge
// with no fallback at all).
const UNKNOWN_ACTION_CONFIG: ActionConfig = {
    label: "Unknown",
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700",
    icon: HelpCircle,
    color: "#6b7280",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ActionBadgeProps {
    action: AuditAction;
    size?: "sm" | "md";
    showIcon?: boolean;
}

export function ActionBadge({ action, size = "md", showIcon = true }: ActionBadgeProps) {
    const config = ACTION_CONFIG[action] ?? UNKNOWN_ACTION_CONFIG;
    const Icon = config.icon;

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
                config.className,
                size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
            )}
        >
            {showIcon && <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />}
            {config.label}
        </span>
    );
}
