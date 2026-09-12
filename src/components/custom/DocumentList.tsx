"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Download,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn, getFileKind } from "@/lib/utils"
import {
  ACCEPT_DOCUMENTS,
  MAX_FILE_SIZE_LABEL,
  getFileError,
} from "@/lib/uploads"
import type { ApplicantDocument } from "@/types/school"

interface DocumentCardProps {
  document: ApplicantDocument
  editable?: boolean
  onRemove?: (id: string) => void
  onReplace?: (id: string, file: File) => void
  /**
   * When set, downloads go through an authenticated blob fetch rather than a
   * plain `<a href>` — required because the real document URL is now the
   * bearer-protected `/admissions/applications/:id/documents/:docId/download`
   * endpoint, which a raw link can't reach.
   */
  onDownload?: (document: ApplicantDocument) => Promise<Blob>
}

export function DocumentCard({
  document,
  editable = false,
  onRemove,
  onReplace,
  onDownload,
}: DocumentCardProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!onDownload) return
    setDownloading(true)
    try {
      const blob = await onDownload(document)
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement("a")
      a.href = url
      a.download = document.name || `document-${document.id}`
      window.document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }
  const [preview, setPreview] = useState(false)
  // Every uploaded document was previously forced through an <img> tag
  // regardless of what it actually was — a PDF or .doc/.docx just showed a
  // broken-image icon. Check the real file type first and pick a rendering
  // strategy that can actually display it.
  const fileKind = getFileKind(document.name || document.url)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="group relative flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText size={18} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {document.name}
          </p>
          <p className="text-[11px] text-muted-foreground capitalize">
            {document.type}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPreview(true)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Preview"
          >
            <Eye size={14} />
          </button>
          {onDownload && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              title="Download"
            >
              {downloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
            </button>
          )}
          {editable && (
            <>
              <label
                className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Replace"
              >
                <Upload size={14} />
                <input
                  type="file"
                  className="hidden"
                  accept={ACCEPT_DOCUMENTS}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ""
                    if (!file) return
                    const fileError = getFileError(file, "document")
                    if (fileError) {
                      toast.error(fileError)
                      return
                    }
                    onReplace?.(document.id, file)
                  }}
                />
              </label>
              <button
                onClick={() => onRemove?.(document.id)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreview(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <p className="truncate pr-2 text-sm font-semibold text-foreground">
                  {document.name}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Open in new tab"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={() => setPreview(false)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                {fileKind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={document.url}
                    alt={document.name}
                    className="h-auto max-h-[60vh] w-full rounded-lg object-contain"
                  />
                ) : fileKind === "pdf" ? (
                  <iframe
                    src={document.url}
                    title={document.name}
                    className="h-[65vh] w-full rounded-lg border-0"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <FileText size={40} className="text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Preview isn&apos;t available for this file type.
                    </p>
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <ExternalLink size={14} />
                      Open file in a new tab
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

interface DocumentListProps {
  documents: ApplicantDocument[]
  editable?: boolean
  onRemove?: (id: string) => void
  onReplace?: (id: string, file: File) => void
  onAdd?: (file: File) => void
  onDownload?: (document: ApplicantDocument) => Promise<Blob>
}

export default function DocumentList({
  documents,
  editable = false,
  onRemove,
  onReplace,
  onAdd,
  onDownload,
}: DocumentListProps) {
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            editable={editable}
            onRemove={onRemove}
            onReplace={onReplace}
            onDownload={onDownload}
          />
        ))}
      </AnimatePresence>

      {editable && (
        <label
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4",
            "cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5"
          )}
        >
          <Upload size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Upload Document{" "}
            <span className="text-xs">(max {MAX_FILE_SIZE_LABEL})</span>
          </span>
          <input
            type="file"
            className="hidden"
            accept={ACCEPT_DOCUMENTS}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (!file) return
              const fileError = getFileError(file, "document")
              if (fileError) {
                toast.error(fileError)
                return
              }
              onAdd?.(file)
            }}
          />
        </label>
      )}
    </div>
  )
}
