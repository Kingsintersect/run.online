"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Trash2,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import EmptyState from "@/components/custom/EmptyState"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useDocuments } from "../../hooks/use-documents"
import {
  useDeleteDocument,
  useDownloadDocument,
} from "../../hooks/use-document-mutations"
import { useDocumentUiStore } from "../../store/document-ui.store"
import { DocumentStatusBadge } from "../shared/document-status-badge"
import { DocumentVerifyDialog } from "./document-verify-dialog"
import { DocumentRejectDialog } from "./document-reject-dialog"
import type { DocumentStatus } from "../../types"

const STATUS_TABS: { label: string; value: DocumentStatus | undefined }[] = [
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: undefined },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentReviewTable() {
  const statusFilter = useDocumentUiStore((s) => s.statusFilter)
  const setStatusFilter = useDocumentUiStore((s) => s.setStatusFilter)
  const documentTypeFilter = useDocumentUiStore((s) => s.documentTypeFilter)
  const setDocumentTypeFilter = useDocumentUiStore(
    (s) => s.setDocumentTypeFilter
  )
  const page = useDocumentUiStore((s) => s.page)
  const setPage = useDocumentUiStore((s) => s.setPage)

  const [verifyTarget, setVerifyTarget] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<number | null>(null)

  const { data, isLoading, isError } = useDocuments({
    status: statusFilter,
    documentType: documentTypeFilter || undefined,
    page,
    limit: 15,
  })
  const deleteDoc = useDeleteDocument()
  const download = useDownloadDocument()

  const documents = data?.data ?? []
  const meta = data?.meta

  const handleDownload = async (id: number, fileName: string) => {
    try {
      await download.mutateAsync({ id, fileName })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteDoc.mutateAsync(id)
      toast.success("Document deleted")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete document"
      )
    }
  }

  return (
    <div className="space-y-3">
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
          value={documentTypeFilter ?? "_ALL_"}
          onValueChange={(v) =>
            setDocumentTypeFilter(v === "_ALL_" ? undefined : v)
          }
        >
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All document types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_ALL_">All document types</SelectItem>
            <SelectItem value="birth_certificate">Birth Certificate</SelectItem>
            <SelectItem value="o_level">O&apos;Level Result</SelectItem>
            <SelectItem value="jamb_result">JAMB Result</SelectItem>
            <SelectItem value="transcript">Transcript</SelectItem>
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
          title="Couldn't load documents"
          description="Please try again."
        />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description="Nothing matches the current filters."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_1fr_auto] items-center gap-3 border-b border-border bg-muted/20 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <span>File</span>
            <span>Type</span>
            <span>Student</span>
            <span>Size</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          {documents.map((doc, idx) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="grid grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-none hover:bg-muted/20"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText
                  size={14}
                  className="shrink-0 text-muted-foreground"
                />
                <span className="truncate text-sm font-medium text-foreground">
                  {doc.fileName}
                </span>
              </div>
              <span className="text-xs text-muted-foreground capitalize">
                {doc.documentType.replace(/_/g, " ")}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <UserRound size={12} />
                {doc.studentId ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(doc.fileSize)}
              </span>
              <DocumentStatusBadge status={doc.status} />
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Download"
                  disabled={download.isPending}
                  onClick={() => handleDownload(doc.id, doc.fileName)}
                >
                  <Download size={13} />
                </Button>
                {doc.status === "pending" && (
                  <PermissionGate
                    require={{ resource: "documents", action: "verify" }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setVerifyTarget(doc.id)}
                    >
                      Verify
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => setRejectTarget(doc.id)}
                    >
                      Reject
                    </Button>
                  </PermissionGate>
                )}
                <PermissionGate
                  require={{ resource: "documents", action: "manage" }}
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Delete"
                    disabled={deleteDoc.isPending}
                    onClick={() => handleDelete(doc.id)}
                  >
                    {deleteDoc.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} className="text-destructive" />
                    )}
                  </Button>
                </PermissionGate>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {meta && meta.total > meta.limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page * meta.limit >= meta.total}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      <DocumentVerifyDialog
        documentId={verifyTarget}
        onClose={() => setVerifyTarget(null)}
      />
      <DocumentRejectDialog
        documentId={rejectTarget}
        onClose={() => setRejectTarget(null)}
      />
    </div>
  )
}
