"use client"

import { useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Loader2,
  Inbox,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAuditStore } from "../store/audit.store"
import { useAuditLogs } from "../hooks/useAudit"
import { formatRelativeTime } from "@/lib/utils/date.utils"
import type { AuditLog } from "../types/audit.types"
import { Checkbox } from "@/components/ui/checkbox"
import { ActionBadge } from "./ActionBadge"
import { ExportMenu } from "./ExportMenu"
import { AuditFilters } from "./AuditFilters"

// ─── Row ─────────────────────────────────────────────────────────────────────

interface AuditRowProps {
  log: AuditLog
  index: number
  isSelected: boolean
  onToggle: () => void
  onView: () => void
}

function AuditRow({ log, index, isSelected, onToggle, onView }: AuditRowProps) {
  const firstName = log.user.firstName?.trim() || ""
  const lastName = log.user.lastName?.trim() || ""
  const email = log.user.email?.trim() || ""
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || "Unknown User"
  const initials =
    `${firstName.charAt(0) || ""}${lastName.charAt(0) || ""}`.toUpperCase() ||
    email.charAt(0).toUpperCase() ||
    "U"

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={`group border-b border-border transition-colors hover:bg-muted/50 ${
        isSelected ? "bg-primary-50/40" : ""
      }`}
    >
      {/* Checkbox */}
      <td className="w-10 px-3 py-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="border-border"
        />
      </td>

      {/* ID */}
      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
        #{log.id}
      </td>

      {/* User */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary-100 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {email || "No email"}
            </p>
          </div>
        </div>
      </td>

      {/* Action */}
      <td className="px-3 py-3">
        <ActionBadge action={log.action} size="sm" />
      </td>

      {/* Entity */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="border-border text-[10px]">
            {log.entityType}
          </Badge>
          <span className="text-xs text-muted-foreground">#{log.entityId}</span>
        </div>
      </td>

      {/* IP */}
      <td className="hidden px-3 py-3 text-xs text-muted-foreground xl:table-cell">
        {log.ipAddress ?? "—"}
      </td>

      {/* Time */}
      <td className="px-3 py-3 text-xs whitespace-nowrap text-muted-foreground">
        {formatRelativeTime(log.createdAt)}
      </td>

      {/* Actions */}
      <td className="px-3 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onView}
          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </td>
    </motion.tr>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function AuditTable() {
  const {
    filters,
    setFilters,
    selectedIds,
    toggleSelectedId,
    selectAllIds,
    clearSelectedIds,
    setSelectedLog,
    setDetailModalOpen,
  } = useAuditStore()

  const { data, isLoading, isFetching } = useAuditLogs(filters)

  const logs = data?.data ?? []
  const meta = data?.meta ?? { total: 0, page: 1, limit: 10 }
  const totalPages = Math.ceil(meta.total / meta.limit)
  const allSelected =
    logs.length > 0 && logs.every((l) => selectedIds.has(l.id))

  const handleView = useCallback(
    (log: AuditLog) => {
      setSelectedLog(log)
      setDetailModalOpen(true)
    },
    [setSelectedLog, setDetailModalOpen]
  )

  function toggleAll() {
    if (allSelected) clearSelectedIds()
    else selectAllIds(logs.map((l) => l.id))
  }

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex max-w-sm min-w-0 flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={filters.search ?? ""}
              onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
              className="h-8 border-border bg-background pl-8 text-sm"
            />
          </div>
          {isFetching && !isLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs text-muted-foreground"
            >
              {selectedIds.size} selected
            </motion.span>
          )}
          <ExportMenu
            logs={
              selectedIds.size > 0
                ? logs.filter((l) => selectedIds.has(l.id))
                : logs
            }
          />
          <AuditFilters />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-3 py-2.5">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  className="border-border"
                />
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                ID
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                User
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Action
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Entity
              </th>
              <th className="hidden px-3 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase xl:table-cell">
                IP Address
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Time
              </th>
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>

          <tbody>
            <AnimatePresence mode="wait">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Loading audit logs...
                    </p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No audit logs found
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <AuditRow
                    key={log.id}
                    log={log}
                    index={i}
                    isSelected={selectedIds.has(log.id)}
                    onToggle={() => toggleSelectedId(log.id)}
                    onView={() => handleView(log)}
                  />
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {Math.min((meta.page - 1) * meta.limit + 1, meta.total)}–
            {Math.min(meta.page * meta.limit, meta.total)}
          </span>{" "}
          of <span className="font-semibold text-foreground">{meta.total}</span>{" "}
          logs
        </p>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={meta.page <= 1}
            onClick={() => setFilters({ page: meta.page - 1 })}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) pageNum = i + 1
            else if (meta.page <= 3) pageNum = i + 1
            else if (meta.page >= totalPages - 2) pageNum = totalPages - 4 + i
            else pageNum = meta.page - 2 + i

            return (
              <Button
                key={pageNum}
                variant={meta.page === pageNum ? "default" : "outline"}
                size="icon"
                className={`h-7 w-7 text-xs ${
                  meta.page === pageNum ? "bg-primary text-white" : ""
                }`}
                onClick={() => setFilters({ page: pageNum })}
              >
                {pageNum}
              </Button>
            )
          })}

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={meta.page >= totalPages}
            onClick={() => setFilters({ page: meta.page + 1 })}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
