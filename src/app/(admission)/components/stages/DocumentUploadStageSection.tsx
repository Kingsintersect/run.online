"use client"

import { motion } from "framer-motion"
import {
  CheckCircle2,
  FileText,
  FolderOpen,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FILE_ACCEPT_LABELS } from "@/lib/admission-catalog"
import type { FileAccept } from "@/types/admissionConfig"
import type {
  ResolvedStageOf,
  StagesSource,
} from "../../types/admission-stages"

interface DocumentUploadStageSectionProps {
  stage: ResolvedStageOf<"DOCUMENT_UPLOAD">
  source: StagesSource
  onUpload: (documentKey: string, file: File) => Promise<void>
  onRemove: (documentKey: string) => Promise<void>
  isBusy: boolean
}

const ACCEPT_ATTR: Record<FileAccept, string | undefined> = {
  IMAGE: "image/*",
  DOCUMENT: "image/*,.pdf,.doc,.docx",
  ANY: undefined,
}

const DEFAULT_MAX_MB = 5

/** A DOCUMENT_UPLOAD stage — the applicant uploads the documents the admissions office asks for. */
export function DocumentUploadStageSection({
  stage,
  source,
  onUpload,
  onRemove,
  isBusy,
}: DocumentUploadStageSectionProps) {
  const uploaded = new Map(stage.state.documents.map((d) => [d.key, d]))
  const uploadsOpen = source === "backend"

  const handleFile = async (
    documentKey: string,
    maxSizeMb: number,
    file: File | undefined
  ) => {
    if (!file) return
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`That file is larger than ${maxSizeMb} MB.`)
      return
    }
    try {
      await onUpload(documentKey, file)
      toast.success("Document uploaded")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden border-border/50 shadow-lg">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 dark:bg-primary/20">
              <FolderOpen className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{stage.label}</CardTitle>
              {stage.description && (
                <CardDescription>{stage.description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!uploadsOpen && (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground dark:bg-amber-500/10">
              Uploads for this stage aren&apos;t open yet. You can continue with
              the rest of your admission in the meantime.
            </p>
          )}

          <ul className="space-y-3">
            {stage.config.documents.map((doc) => {
              const current = uploaded.get(doc.key)
              const maxSizeMb = doc.maxSizeMb ?? DEFAULT_MAX_MB
              const inputId = `stage-doc-${stage.key}-${doc.key}`
              return (
                <li
                  key={doc.key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {doc.label}
                      </p>
                      <Badge
                        variant={doc.required ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {doc.required ? "Required" : "Optional"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {FILE_ACCEPT_LABELS[doc.accept]} · up to {maxSizeMb} MB
                    </p>
                    {current?.fileName && (
                      <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" />
                        <FileText className="size-3.5" />
                        {current.fileName}
                      </p>
                    )}
                  </div>

                  {uploadsOpen && (
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={inputId}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        {isBusy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Upload className="size-3.5" />
                        )}
                        {current?.fileName ? "Replace" : "Upload"}
                      </label>
                      <input
                        id={inputId}
                        type="file"
                        className="sr-only"
                        accept={ACCEPT_ATTR[doc.accept]}
                        disabled={isBusy}
                        onChange={(e) => {
                          void handleFile(
                            doc.key,
                            maxSizeMb,
                            e.target.files?.[0]
                          )
                          e.target.value = ""
                        }}
                      />
                      {current?.fileName && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isBusy}
                          onClick={() =>
                            onRemove(doc.key).catch((err) =>
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Couldn't remove it"
                              )
                            )
                          }
                          aria-label={`Remove ${doc.label}`}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  )
}
