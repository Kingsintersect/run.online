"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  GraduationCap,
  Loader2,
  Users,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import DataTable, { type Column } from "@/components/custom/DataTable"
import StatusBadge from "@/components/custom/StatusBadge"
import Tabs from "@/components/custom/Tabs"
import EmptyState from "@/components/custom/EmptyState"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  applicationReviewApi,
  applicationReviewKeys,
  applicationReviewQueryOptions,
} from "@/services/applicationReviewApi"
import type {
  AdmissionApplication,
  ApplicationReviewStatus,
} from "@/types/school"
import { BulkCreateOffersDialog } from "./_components/bulk-create-offers-dialog"

const REVIEWABLE: ApplicationReviewStatus[] = ["pending", "under_review"]
// Rows that can be batch-actioned: reviewable → approve/deny, approved →
// create an admission offer.
const SELECTABLE: ApplicationReviewStatus[] = [
  "pending",
  "under_review",
  "approved",
]

const statusVariantMap: Record<
  ApplicationReviewStatus,
  "warning" | "info" | "success" | "destructive"
> = {
  pending: "warning",
  under_review: "info",
  approved: "success",
  denied: "destructive",
}

const statusLabelMap: Record<ApplicationReviewStatus, string> = {
  pending: "Pending",
  under_review: "Under Review",
  approved: "Approved",
  denied: "Denied",
}

const tabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "under_review", label: "Under Review" },
  { key: "approved", label: "Approved" },
  { key: "denied", label: "Denied" },
]

export default function ReviewApplicationsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [denyOpen, setDenyOpen] = useState(false)
  const [denyReason, setDenyReason] = useState("")
  const [offersOpen, setOffersOpen] = useState(false)

  const {
    data: applications = [],
    isLoading,
    isError,
    error,
  } = useQuery(
    applicationReviewQueryOptions.list(
      statusFilter !== "all" ? { status: statusFilter } : undefined
    )
  )

  const bulkReview = useMutation({
    mutationFn: (arg: {
      status: "approved" | "denied"
      denial_reason?: string
    }) =>
      applicationReviewApi.bulkReview({
        applicationIds: [...selected],
        status: arg.status,
        denial_reason: arg.denial_reason,
      }),
    onSuccess: (res, arg) => {
      const ok = res.data.filter((r) => r.success).length
      const failed = res.data.length - ok
      toast.success(
        `${ok} application${ok === 1 ? "" : "s"} ${
          arg.status === "approved" ? "approved" : "denied"
        }${failed ? ` · ${failed} skipped` : ""}`
      )
      setSelected(new Set())
      setDenyOpen(false)
      setDenyReason("")
      qc.invalidateQueries({ queryKey: applicationReviewKeys.all })
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Bulk review failed"),
  })

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    under_review: applications.filter((a) => a.status === "under_review")
      .length,
    approved: applications.filter((a) => a.status === "approved").length,
    denied: applications.filter((a) => a.status === "denied").length,
  }

  const tabsWithBadges = tabs.map((t) => ({
    ...t,
    badge: counts[t.key as keyof typeof counts],
  }))

  const selectableIds = applications
    .filter((a) => SELECTABLE.includes(a.status))
    .map((a) => a.id)
  const allSelectableSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))

  const selectedApps = applications.filter((a) => selected.has(a.id))
  const selectedReviewable = selectedApps.filter((a) =>
    REVIEWABLE.includes(a.status)
  )
  const selectedApproved = selectedApps.filter((a) => a.status === "approved")
  // Only offer a batch action when the whole selection qualifies for it.
  const canBatchReview =
    selectedApps.length > 0 && selectedReviewable.length === selectedApps.length
  const canBatchOffer =
    selectedApps.length > 0 && selectedApproved.length === selectedApps.length

  const columns: Column<AdmissionApplication>[] = [
    {
      key: "select",
      header: (
        <Checkbox
          aria-label="Select all applications"
          checked={allSelectableSelected}
          disabled={selectableIds.length === 0}
          onCheckedChange={(v) =>
            setSelected(v ? new Set(selectableIds) : new Set())
          }
        />
      ),
      width: "48px",
      render: (row) =>
        SELECTABLE.includes(row.status) ? (
          <span
            onClick={(e) => e.stopPropagation()}
            className="flex items-center"
          >
            <Checkbox
              aria-label={`Select ${row.personal_info.first_name} ${row.personal_info.last_name}`}
              checked={selected.has(row.id)}
              onCheckedChange={() => toggle(row.id)}
            />
          </span>
        ) : null,
    },
    {
      key: "applicant_name",
      header: "Applicant",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xs font-bold text-primary">
              {row.personal_info.first_name[0]}
              {row.personal_info.last_name[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">
              {row.personal_info.last_name}, {row.personal_info.first_name}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {row.personal_info.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "program",
      header: "Program",
      render: (row) => (
        <span className="text-foreground">
          {row.program_choice.first_choice_program_name}
        </span>
      ),
    },
    {
      key: "jamb_score",
      header: "JAMB",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="font-medium text-foreground">
          {row.program_choice.jamb_score}
        </span>
      ),
    },
    {
      key: "submitted_at",
      header: "Submitted",
      sortable: true,
      render: (row) => (
        <span className="text-muted-foreground">
          {new Date(row.submitted_at).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <StatusBadge
          label={statusLabelMap[row.status]}
          variant={statusVariantMap[row.status]}
          dot
        />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/manager/review-applications/${row.id}`)
          }}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Review"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ]

  // Stats
  const stats = [
    {
      label: "Total Applications",
      value: counts.all,
      icon: Users,
      color: "text-blue-500",
    },
    {
      label: "Pending Review",
      value: counts.pending,
      icon: ClipboardList,
      color: "text-amber-500",
    },
    {
      label: "Approved",
      value: counts.approved,
      icon: GraduationCap,
      color: "text-emerald-500",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl font-bold text-foreground">
          Review Applications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and manage student admission applications
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {isError && (
        <EmptyState
          icon={ClipboardList}
          title="Couldn't load applications"
          description={
            error?.message ?? "Something went wrong. Please try again."
          }
        />
      )}

      {/* Table with Tabs */}
      {!isError && (
        <Tabs
          tabs={tabsWithBadges}
          defaultTab="all"
          onChange={(key) => {
            setStatusFilter(key)
            setSelected(new Set())
          }}
        >
          {() =>
            applications.length === 0 && !isLoading ? (
              <EmptyState
                icon={ClipboardList}
                title="No applications found"
                description="There are no applications matching the current filter."
              />
            ) : (
              <DataTable
                data={
                  applications as (AdmissionApplication &
                    Record<string, unknown>)[]
                }
                columns={
                  columns as Column<
                    AdmissionApplication & Record<string, unknown>
                  >[]
                }
                loading={isLoading}
                searchable
                searchPlaceholder="Search by name, email, program…"
                searchExtractor={(row) => {
                  const a = row as unknown as AdmissionApplication
                  return [
                    a.personal_info.first_name,
                    a.personal_info.last_name,
                    a.personal_info.middle_name,
                    a.personal_info.email,
                    a.personal_info.phone,
                    a.program_choice.first_choice_program_name,
                    a.program_choice.second_choice_program_name,
                    a.program_choice.jamb_reg_no,
                    String(a.program_choice.jamb_score),
                    a.status,
                    a.id,
                  ].join(" ")
                }}
                rowKey="id"
                onRowClick={(row) =>
                  router.push(`/manager/review-applications/${row.id}`)
                }
                pageSize={10}
                emptyMessage="No applications match your search"
              />
            )
          }
        </Tabs>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-2xl"
          >
            <span className="text-sm font-medium text-foreground">
              {selected.size} selected
            </span>
            <div className="h-5 w-px bg-border" />
            {canBatchReview && (
              <>
                <Button
                  size="sm"
                  onClick={() => bulkReview.mutate({ status: "approved" })}
                  disabled={bulkReview.isPending}
                >
                  {bulkReview.isPending &&
                  bulkReview.variables?.status === "approved" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Approve ({selected.size})
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDenyOpen(true)}
                  disabled={bulkReview.isPending}
                >
                  <XCircle size={14} />
                  Deny ({selected.size})
                </Button>
              </>
            )}
            {canBatchOffer && (
              <Button size="sm" onClick={() => setOffersOpen(true)}>
                <GraduationCap size={14} />
                Create offers ({selected.size})
              </Button>
            )}
            {!canBatchReview && !canBatchOffer && (
              <span className="text-xs text-muted-foreground">
                Mixed statuses — select only pending/under-review, or only
                approved
              </span>
            )}
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deny reason modal */}
      <Modal
        open={denyOpen}
        onClose={() => {
          if (!bulkReview.isPending) setDenyOpen(false)
        }}
        title={`Deny ${selected.size} application${selected.size === 1 ? "" : "s"}`}
        subtitle="This reason is recorded on every selected application."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDenyOpen(false)}
              disabled={bulkReview.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                bulkReview.mutate({
                  status: "denied",
                  denial_reason: denyReason.trim() || undefined,
                })
              }
              disabled={bulkReview.isPending || denyReason.trim().length < 3}
            >
              {bulkReview.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Confirm denial
            </Button>
          </>
        }
      >
        <label className="text-xs font-medium text-muted-foreground">
          Reason for denial
        </label>
        <textarea
          value={denyReason}
          onChange={(e) => setDenyReason(e.target.value)}
          rows={4}
          placeholder="e.g. JAMB score below the cut-off for all selected programs."
          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-muted p-3 text-sm text-foreground transition-all outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </Modal>

      <BulkCreateOffersDialog
        open={offersOpen}
        onClose={() => setOffersOpen(false)}
        applications={selectedApproved}
        onDone={() => setSelected(new Set())}
      />
    </div>
  )
}
