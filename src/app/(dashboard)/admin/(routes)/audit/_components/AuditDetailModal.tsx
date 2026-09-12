"use client"

import { motion } from "framer-motion"
import {
  ExternalLink,
  Clock,
  Monitor,
  MapPin,
  ArrowRight,
  Tag,
} from "lucide-react"
import Link from "next/link"
import Modal from "@/components/custom/Modal"
import { ActionBadge } from "./ActionBadge"
import { useAuditStore } from "../store/audit.store"
import { useAuditLog } from "../hooks/useAudit"
import { formatDateTime } from "@/lib/utils/date.utils"
import { Badge } from "@/components/ui/badge"

// ─── Diff section ─────────────────────────────────────────────────────────────

function ValuesDiff({
  oldValues,
  newValues,
}: {
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
}) {
  if (!oldValues && !newValues) return null

  const keys = Array.from(
    new Set([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})])
  )

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        Changes
      </p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-xs">
        {/* Old */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
          <p className="mb-1.5 text-[10px] font-bold tracking-wider text-red-600 uppercase dark:text-red-400">
            Before
          </p>
          {oldValues && keys.length > 0 ? (
            keys
              .filter((k) => k in (oldValues ?? {}))
              .map((k) => (
                <div key={k} className="mb-0.5 flex items-baseline gap-1">
                  <span className="shrink-0 font-mono text-[9px] text-red-500">
                    {k}:
                  </span>
                  <span className="break-all text-red-700 dark:text-red-300">
                    {String(oldValues[k])}
                  </span>
                </div>
              ))
          ) : (
            <p className="text-[10px] text-muted-foreground italic">
              No prior values
            </p>
          )}
        </div>

        <div className="flex items-center justify-center pt-6">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* New */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
          <p className="mb-1.5 text-[10px] font-bold tracking-wider text-green-600 uppercase dark:text-green-400">
            After
          </p>
          {newValues && keys.length > 0 ? (
            keys
              .filter((k) => k in (newValues ?? {}))
              .map((k) => (
                <div key={k} className="mb-0.5 flex items-baseline gap-1">
                  <span className="shrink-0 font-mono text-[9px] text-green-500">
                    {k}:
                  </span>
                  <span className="break-all text-green-700 dark:text-green-300">
                    {String(newValues[k])}
                  </span>
                </div>
              ))
          ) : (
            <p className="text-[10px] text-muted-foreground italic">
              No new values
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function AuditDetailModal() {
  const { selectedLog, isDetailModalOpen, setDetailModalOpen, setSelectedLog } =
    useAuditStore()

  // Enrich the lighter row from the list with the full, JSON-decoded record.
  // Falls back to the row itself while loading or if the endpoint 404s.
  const { data: fullLog } = useAuditLog(
    isDetailModalOpen ? (selectedLog?.id ?? null) : null
  )

  function handleClose() {
    setDetailModalOpen(false)
    setSelectedLog(null)
  }

  if (!selectedLog) return null

  const log = fullLog ?? selectedLog

  return (
    <Modal
      open={isDetailModalOpen}
      onClose={handleClose}
      title="Audit Log Details"
      subtitle={`Entry #${log.id}`}
      size="xl"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Actor + action header */}
        <div className="flex flex-wrap items-start gap-3 rounded-xl bg-muted/50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {(log.user.firstName ?? "?")[0]}
            {(log.user.lastName ?? "")[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">
              {log.user.firstName} {log.user.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{log.user.email}</p>
          </div>
          <ActionBadge action={log.action} />
        </div>

        {/* Entity + deep links */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5">
          <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Entity:</span>
          <Badge variant="outline" className="text-xs">
            {log.entityType}
          </Badge>
          <span className="text-xs text-muted-foreground">#{log.entityId}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Link
              href={`/admin/audit/entity/${log.entityType}/${log.entityId}`}
              onClick={handleClose}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Entity trail
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              href={`/admin/audit/user/${log.userId}`}
              onClick={handleClose}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              User trail
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Diff */}
        <ValuesDiff oldValues={log.oldValues} newValues={log.newValues} />

        {/* Meta row */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                Timestamp
              </p>
              <p className="text-xs font-medium text-foreground">
                {formatDateTime(log.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                IP Address
              </p>
              <p className="font-mono text-xs font-medium text-foreground">
                {log.ipAddress ?? "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
            <Monitor className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                User Agent
              </p>
              <p className="truncate text-xs font-medium text-foreground">
                {log.userAgent ? log.userAgent.slice(0, 28) + "…" : "—"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </Modal>
  )
}
