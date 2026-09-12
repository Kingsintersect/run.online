"use client"

import { Download, FileText, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/custom/EmptyState"
import { useMyStudentId } from "@/hooks/use-my-student-id"
import { useStudentDocuments } from "../../hooks/use-documents"
import {
  useDeleteDocument,
  useDownloadDocument,
} from "../../hooks/use-document-mutations"
import { DocumentStatusBadge } from "../shared/document-status-badge"
import { DocumentUploadForm } from "./document-upload-form"

export function MyDocumentsList() {
  const { studentId } = useMyStudentId()
  const {
    data: documents = [],
    isLoading,
    isError,
  } = useStudentDocuments(studentId ?? 0)
  const deleteDoc = useDeleteDocument()
  const download = useDownloadDocument()

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
    <div className="space-y-6">
      <DocumentUploadForm studentId={studentId} />

      {!studentId ? (
        <EmptyState
          icon={FileText}
          title="Can't load your documents yet"
          description="Your student record couldn't be resolved. Try again later."
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load your documents"
          description="Please try again."
        />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents uploaded yet"
          description="Upload a document above to get started."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {documents.map((doc, idx) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-none"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText
                  size={16}
                  className="shrink-0 text-muted-foreground"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground capitalize">
                    {doc.documentType.replace(/_/g, " ")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {doc.fileName}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <DocumentStatusBadge status={doc.status} />
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
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
