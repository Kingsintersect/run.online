"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import gsap from "gsap"
import Link from "next/link"
import {
  ChevronRight,
  Layers,
  ArrowLeft,
  Loader2,
  Inbox,
  CheckCircle2,
  Clock,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuditEntityLogs } from "../hooks/useAudit"
import { ActionBadge } from "./ActionBadge"
import { AuditDetailModal } from "./AuditDetailModal"
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date.utils"
import type { AuditEntityLog } from "../types/audit.types"

// ─── Props ────────────────────────────────────────────────────────────────────

interface AuditEntityTrailViewProps {
  entityType: string
  entityId: number
}

// ─── Lifecycle step ───────────────────────────────────────────────────────────

function LifecycleStep({
  log,
  index,
  isLast,
}: {
  log: AuditEntityLog
  index: number
  isLast: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative flex gap-4"
    >
      {/* Connector line */}
      {!isLast && (
        <div className="absolute top-9 bottom-0 left-4.25 w-px bg-border" />
      )}

      {/* Circle dot */}
      <div className="relative z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm ring-1 ring-border">
        <ActionBadge action={log.action} size="sm" showIcon={true} />
      </div>

      {/* Card */}
      <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                {(log.user.firstName ?? "?")[0]}
                {(log.user.lastName ?? "")[0]}
              </div>
              <span className="text-sm font-semibold text-foreground">
                {log.user.firstName} {log.user.lastName}
              </span>
              <Badge variant="outline" className="text-[9px]">
                #{log.userId}
              </Badge>
            </div>
          </div>
          <span className="text-[10px] whitespace-nowrap text-muted-foreground">
            {formatRelativeTime(log.createdAt)}
          </span>
        </div>

        {/* Values diff */}
        {(log.oldValues || log.newValues) && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            {log.oldValues && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950/20">
                <p className="mb-1 font-semibold text-red-600">Before</p>
                {Object.entries(log.oldValues)
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <div key={k} className="flex gap-1">
                      <span className="shrink-0 font-mono text-red-500">
                        {k}:
                      </span>
                      <span className="truncate text-red-700 dark:text-red-300">
                        {String(v)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
            {log.newValues && (
              <div className="rounded-md border border-green-200 bg-green-50 p-2 dark:border-green-900 dark:bg-green-950/20">
                <p className="mb-1 font-semibold text-green-600">After</p>
                {Object.entries(log.newValues)
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <div key={k} className="flex gap-1">
                      <span className="shrink-0 font-mono text-green-500">
                        {k}:
                      </span>
                      <span className="truncate text-green-700 dark:text-green-300">
                        {String(v)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-2 text-[10px] text-muted-foreground">
          <Clock className="mr-1 inline h-3 w-3" />
          {formatDateTime(log.createdAt)}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function AuditEntityTrailView({
  entityType,
  entityId,
}: AuditEntityTrailViewProps) {
  const headerRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useAuditEntityLogs(entityType, entityId)
  const logs = data?.data ?? []

  const createdLog = logs.find((l) => l.action === "CREATE")
  const lastLog = logs[logs.length - 1]

  useEffect(() => {
    if (!headerRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(".entity-header-item", {
        y: -20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: "power3.out",
      })
    }, headerRef)
    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div ref={headerRef} className="space-y-4">
          <div className="entity-header-item flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/admin/audit"
              className="transition-colors hover:text-primary"
            >
              Audit
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Entity Trail</span>
          </div>

          <div className="entity-header-item flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">
                    {entityType}
                  </h1>
                  <Badge variant="outline">#{entityId}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {logs.length} lifecycle event{logs.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/audit">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back
              </Link>
            </Button>
          </div>

          {/* Quick meta */}
          {!isLoading && logs.length > 0 && (
            <motion.div
              className="entity-header-item grid grid-cols-2 gap-3 sm:grid-cols-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                <div>
                  <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Created
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    {createdLog
                      ? formatDateTime(createdLog.createdAt)
                      : "Unknown"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm">
                <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Last Updated
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    {lastLog ? formatRelativeTime(lastLog.createdAt) : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm">
                <User className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Contributors
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    {new Set(logs.map((l) => l.userId)).size} user
                    {new Set(logs.map((l) => l.userId)).size !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Loading entity history…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No history found for {entityType} #{entityId}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, i) => (
              <LifecycleStep
                key={log.id}
                log={log}
                index={i}
                isLast={i === logs.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      <AuditDetailModal />
    </div>
  )
}
