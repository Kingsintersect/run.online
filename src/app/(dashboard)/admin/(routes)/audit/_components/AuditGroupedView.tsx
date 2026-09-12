"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronRight, Inbox, Layers, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuditStore } from "../store/audit.store"
import { useAuditLogs } from "../hooks/useAudit"
import { ActionBadge } from "./ActionBadge"
import {
  formatRelativeTime,
  getAcademicYear,
  getAcademicSemester,
} from "@/lib/utils/date.utils"
import type { AuditLog } from "../types/audit.types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupSection {
  key: string
  label: string
  logs: AuditLog[]
}

// ─── Mini action summary ──────────────────────────────────────────────────────

function ActionSummary({ logs }: { logs: AuditLog[] }) {
  const counts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.action] = (acc[l.action] ?? 0) + 1
    return acc
  }, {})

  const top = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)

  return (
    <div className="hidden items-center gap-2 sm:flex">
      {top.map(([action, count]) => (
        <span key={action} className="text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground">{count}</span>{" "}
          {action.toLowerCase()}
        </span>
      ))}
    </div>
  )
}

// ─── Grouping selector ────────────────────────────────────────────────────────

function GroupBySelector() {
  const { groupBy, setGroupBy } = useAuditStore()

  const options: Array<{
    value: "academicYear" | "semester" | "program" | null
    label: string
  }> = [
    { value: "academicYear", label: "Academic Year" },
    { value: "semester", label: "Semester" },
  ]

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Group by:</span>
      {options.map((opt) => (
        <Button
          key={opt.label}
          variant={groupBy === opt.value ? "default" : "outline"}
          size="sm"
          className={`h-7 text-xs ${groupBy === opt.value ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => setGroupBy(groupBy === opt.value ? null : opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}

// ─── Group accordion ─────────────────────────────────────────────────────────

function GroupAccordion({
  group,
  index,
  isExpanded,
  onToggle,
}: {
  group: GroupSection
  index: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const { setSelectedLog, setDetailModalOpen } = useAuditStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">
            {group.label}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {group.logs.length} logs
          </span>
        </div>
        <ActionSummary logs={group.logs} />
      </button>

      {/* Expanded rows */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{ overflow: "hidden" }}
          >
            <div className="divide-y divide-border/50 border-t border-border">
              {group.logs.slice(0, 20).map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.015 }}
                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                  onClick={() => {
                    setSelectedLog(log)
                    setDetailModalOpen(true)
                  }}
                >
                  <span className="w-8 shrink-0 font-mono text-[10px] text-muted-foreground">
                    #{log.id}
                  </span>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                    {(log.user.firstName ?? "?")[0]}
                    {(log.user.lastName ?? "")[0]}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                    {log.user.firstName} {log.user.lastName}
                  </span>
                  <ActionBadge action={log.action} size="sm" />
                  <span className="hidden text-[10px] text-muted-foreground sm:block">
                    {log.entityType}
                  </span>
                  <span className="text-[10px] whitespace-nowrap text-muted-foreground">
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </motion.div>
              ))}
              {group.logs.length > 20 && (
                <div className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                  +{group.logs.length - 20} more logs — use the Logs view for
                  full listing
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuditGroupedView() {
  const { filters, groupBy } = useAuditStore()
  const { data, isLoading } = useAuditLogs({ ...filters, limit: 200 })
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(["0"]))

  const groups = useMemo<GroupSection[]>(() => {
    if (!data) return []
    const logs = data.data

    const buildGroups = (
      getKey: (log: AuditLog) => string,
      getLabel: (key: string) => string
    ) => {
      const map = new Map<string, AuditLog[]>()
      for (const log of logs) {
        const key = getKey(log)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(log)
      }
      return Array.from(map.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, groupLogs]) => ({
          key,
          label: getLabel(key),
          logs: groupLogs,
        }))
    }

    if (!groupBy || groupBy === "academicYear") {
      return buildGroups(
        (l) => getAcademicYear(l.createdAt),
        (key) => `Academic Year ${key}`
      )
    }

    if (groupBy === "semester") {
      return buildGroups(
        (l) =>
          `${getAcademicYear(l.createdAt)}_${getAcademicSemester(l.createdAt)}`,
        (key) => {
          const [year, sem] = key.split("_")
          return `${sem} Semester — ${year}`
        }
      )
    }

    return []
  }, [data, groupBy])

  function toggleGroup(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Loading grouped view…</span>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card">
        <Inbox className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No logs to group</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {groups.length} group{groups.length !== 1 ? "s" : ""}
          </span>
        </div>
        <GroupBySelector />
      </div>

      {groups.map((group, idx) => (
        <GroupAccordion
          key={group.key}
          group={group}
          index={idx}
          isExpanded={
            expandedKeys.has(group.key) || expandedKeys.has(String(idx))
          }
          onToggle={() => toggleGroup(group.key)}
        />
      ))}
    </div>
  )
}
