"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, ClipboardCheck, UserRound, XCircle } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useClearances, useClearanceTypes } from "../../hooks/use-clearance"
import { ClearanceStatusBadge } from "../shared/clearance-status-badge"
import { ClearanceApproveDialog } from "./clearance-approve-dialog"
import { ClearanceRejectDialog } from "./clearance-reject-dialog"
import type { ClearanceStatus, StudentClearance } from "../../types"

const STATUS_TABS: { label: string; value: ClearanceStatus | undefined }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: undefined },
]

const ALL_TYPES = "_ALL_"

function describeStudent(clearance: StudentClearance): string {
  const { student } = clearance
  if (student?.user?.firstName || student?.user?.lastName) {
    return `${student.user.firstName ?? ""} ${student.user.lastName ?? ""}`.trim()
  }
  if (student?.matricNumber) return student.matricNumber
  return `Student #${clearance.studentId}`
}

export function ClearanceReviewQueue() {
  const [statusFilter, setStatusFilter] = useState<ClearanceStatus | undefined>(
    "PENDING"
  )
  const [typeFilter, setTypeFilter] = useState<number | undefined>(undefined)
  const [approveTarget, setApproveTarget] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<number | null>(null)

  const { data: types } = useClearanceTypes()
  const {
    data: clearances = [],
    isLoading,
    isError,
  } = useClearances({
    status: statusFilter,
    typeId: typeFilter,
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Clearance Requests
        </h2>
        <p className="text-sm text-muted-foreground">
          Review and approve or reject student clearance requests for your
          checkpoint(s).
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setStatusFilter(tab.value)}
              className={
                statusFilter === tab.value
                  ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-[--primary-foreground]"
                  : "rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Select
          value={typeFilter ? String(typeFilter) : ALL_TYPES}
          onValueChange={(v) =>
            setTypeFilter(v === ALL_TYPES ? undefined : Number(v))
          }
        >
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="All checkpoint types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>All checkpoint types</SelectItem>
            {(types ?? []).map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load clearance requests"
          description="Please try again."
        />
      ) : clearances.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No clearance requests found"
          description="Nothing matches the current filters."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[1fr_1fr_0.8fr_1fr_auto] items-center gap-3 border-b border-border bg-muted/20 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <span>Student</span>
            <span>Checkpoint</span>
            <span>Status</span>
            <span>Requested</span>
            <span className="text-right">Action</span>
          </div>

          {clearances.map((clearance, idx) => (
            <motion.div
              key={clearance.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="grid grid-cols-[1fr_1fr_0.8fr_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-none hover:bg-muted/20"
            >
              <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                <UserRound
                  size={13}
                  className="shrink-0 text-muted-foreground"
                />
                {describeStudent(clearance)}
              </span>
              <span className="truncate text-sm text-foreground">
                {clearance.clearanceType?.name ??
                  `Type #${clearance.clearanceTypeId}`}
              </span>
              <ClearanceStatusBadge status={clearance.status} />
              <span className="text-xs text-muted-foreground">
                {new Date(clearance.requestedAt).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <div className="flex justify-end gap-1">
                {clearance.status === "PENDING" && (
                  <PermissionGate
                    require={{ resource: "clearance", action: "approve" }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-emerald-700 hover:text-emerald-700 dark:text-emerald-400"
                      onClick={() => setApproveTarget(clearance.id)}
                    >
                      <CheckCircle2 size={12} data-icon="inline-start" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => setRejectTarget(clearance.id)}
                    >
                      <XCircle size={12} data-icon="inline-start" />
                      Reject
                    </Button>
                  </PermissionGate>
                )}
                {clearance.status !== "PENDING" && clearance.comments && (
                  <span
                    className="max-w-40 truncate text-right text-[11px] text-muted-foreground"
                    title={clearance.comments}
                  >
                    {clearance.comments}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ClearanceApproveDialog
        clearanceId={approveTarget}
        onClose={() => setApproveTarget(null)}
      />
      <ClearanceRejectDialog
        clearanceId={rejectTarget}
        onClose={() => setRejectTarget(null)}
      />
    </div>
  )
}
