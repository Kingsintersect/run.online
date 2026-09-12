"use client"

import { useState } from "react"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { UploadProgress } from "@/components/upload-progress"
import {
  ACCEPT_DOCUMENTS,
  MAX_FILE_SIZE_LABEL,
  formatFileSize,
  getFileError,
} from "@/lib/uploads"
import { useUploadDocument } from "../../hooks/use-document-mutations"
import { COMMON_DOCUMENT_TYPES } from "../../schemas/document.schema"

interface DocumentUploadFormProps {
  studentId: number | null
  onSuccess?: () => void
}

export function DocumentUploadForm({
  studentId,
  onSuccess,
}: DocumentUploadFormProps) {
  const [documentType, setDocumentType] = useState<string>(
    COMMON_DOCUMENT_TYPES[0]
  )
  const [file, setFile] = useState<File | null>(null)
  const upload = useUploadDocument()

  // Reject an oversized file the moment it's picked, so the user never waits
  // on an upload that was always going to be refused.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    e.target.value = ""

    if (!selected) {
      setFile(null)
      return
    }

    const fileError = getFileError(selected, "document")
    if (fileError) {
      toast.error(fileError)
      setFile(null)
      return
    }

    upload.progress.reset()
    setFile(selected)
  }

  const handleSubmit = async () => {
    if (!studentId) {
      toast.error("Your student record couldn't be resolved yet.")
      return
    }
    if (!file) {
      toast.error("Choose a file to upload")
      return
    }
    try {
      await upload.mutateAsync({ file, studentId, documentType })
      toast.success("Document uploaded — pending verification")
      setFile(null)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="space-y-1.5">
        <Label htmlFor="document-type">Document Type</Label>
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger id="document-type" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMON_DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type} className="capitalize">
                {type.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="document-file">File</Label>
        <input
          id="document-file"
          type="file"
          accept={ACCEPT_DOCUMENTS}
          onChange={handleFileChange}
          disabled={upload.progress.isActive}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-[11px] text-muted-foreground">
          Images, PDF, DOC or DOCX — max {MAX_FILE_SIZE_LABEL} per file.
        </p>
        {file && (
          <p className="text-[11px] text-muted-foreground">
            Selected: <span className="font-medium">{file.name}</span> (
            {formatFileSize(file.size)})
          </p>
        )}
      </div>

      <UploadProgress
        stage={upload.progress.stage}
        percent={upload.progress.percent}
        message={
          upload.progress.stage === "done"
            ? "Document uploaded — pending verification"
            : undefined
        }
      />

      {!studentId && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Your student record couldn&apos;t be resolved yet — uploads are
          disabled until that&apos;s wired up.
        </p>
      )}

      <Button
        className="w-full"
        disabled={upload.progress.isActive || !file || !studentId}
        onClick={handleSubmit}
      >
        {upload.progress.isActive ? (
          <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
        ) : (
          <Upload className="size-4" data-icon="inline-start" />
        )}
        Upload Document
      </Button>
    </div>
  )
}
