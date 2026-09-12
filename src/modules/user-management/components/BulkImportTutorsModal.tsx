"use client"

import { useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Download,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import StatusBadge from "@/components/custom/StatusBadge"
import { cn } from "@/lib/utils"
import { UploadProgress } from "@/components/upload-progress"
import {
  MAX_FILE_SIZE_LABEL,
  formatFileSize,
  getFileSizeError,
} from "@/lib/uploads"
import { useBulkImportTutors } from "../hooks/useUsersData"
import {
  bulkImportTutorsSchema,
  type BulkImportTutorsFormValues,
} from "../schemas"
import type { BulkImportRow, BulkImportRowAction } from "@/types/users"

const TEMPLATE_URL = "/templates/tutor_bulk_import_template.csv"

const actionVariant: Record<
  BulkImportRowAction,
  "success" | "info" | "warning" | "destructive"
> = {
  created: "success",
  updated: "info",
  skipped: "warning",
  failed: "destructive",
}

interface BulkImportTutorsModalProps {
  open: boolean
  onClose: () => void
}

export function BulkImportTutorsModal({
  open,
  onClose,
}: BulkImportTutorsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const bulkImport = useBulkImportTutors()

  const {
    handleSubmit,
    setValue,
    setError,
    control,
    reset,
    formState: { errors },
  } = useForm<BulkImportTutorsFormValues>({
    resolver: zodResolver(bulkImportTutorsSchema),
    defaultValues: { send_welcome_email: true, login_url: "" },
  })

  const sendWelcomeEmail = useWatch({ control, name: "send_welcome_email" })

  const handleClose = () => {
    reset({ send_welcome_email: true, login_url: "" })
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    bulkImport.reset()
    bulkImport.progress.reset()
    onClose()
  }

  const onSubmit = (values: BulkImportTutorsFormValues) => {
    bulkImport.mutate({
      file: values.file,
      send_welcome_email: values.send_welcome_email,
      login_url: values.login_url || undefined,
    })
  }

  const result = bulkImport.data?.data

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk Import Tutors"
      subtitle="Upload the registrar's list once — accounts, roles, and departments are assigned together"
      size="xl"
      footer={
        result ? (
          <Button onClick={handleClose}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={bulkImport.progress.isActive}
            >
              {bulkImport.progress.isActive && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Import Tutors
            </Button>
          </>
        )
      }
    >
      <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
        {!result && (
          <>
            {/* Step 1 — template */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <FileSpreadsheet size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    1. Download the CSV template
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fill in one row per tutor — name, email, staff number,
                    department, designation
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="shrink-0 gap-2"
              >
                <a href={TEMPLATE_URL} download>
                  <Download size={14} /> Template
                </a>
              </Button>
            </div>

            {/* Step 2 — upload */}
            <div className="space-y-1.5">
              <Label>2. Upload the completed CSV *</Label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                  "border-border hover:border-primary/50 hover:bg-accent/50",
                  errors.file && "border-destructive/60"
                )}
              >
                <UploadCloud size={22} className="text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {fileName ?? "Click to select a .csv or .txt file"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Max {MAX_FILE_SIZE_LABEL}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ""
                  if (!file) return
                  // Reject at selection time so the admin isn't told only
                  // after filling in the rest of the dialog and hitting Import.
                  const sizeError = getFileSizeError(file)
                  if (sizeError) {
                    setError("file", { message: sizeError })
                    setFileName(null)
                    return
                  }
                  setValue("file", file, { shouldValidate: true })
                  setFileName(`${file.name} (${formatFileSize(file.size)})`)
                }}
              />
              {errors.file && (
                <p className="text-sm text-destructive">
                  {errors.file.message}
                </p>
              )}
            </div>

            {/* Step 3 — welcome email */}
            <div className="space-y-3 rounded-xl border border-border p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={sendWelcomeEmail}
                  onChange={(e) =>
                    setValue("send_welcome_email", e.target.checked)
                  }
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    3. Send onboarding email automatically
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Recommended — each new tutor gets their login link and
                    temporary password by email; nothing is shown here. Turn
                    this off only if you need the generated passwords back in
                    this screen (e.g. for printed onboarding slips).
                  </span>
                </span>
              </label>

              {!sendWelcomeEmail && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-400/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  Generated passwords will be shown in plain text in the results
                  below — copy them before closing this dialog, they won&apos;t
                  be shown again.
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Login URL override (optional)</Label>
                <Input
                  placeholder="https://portal.qhub.example/login"
                  onChange={(e) => setValue("login_url", e.target.value)}
                />
                {errors.login_url && (
                  <p className="text-sm text-destructive">
                    {errors.login_url.message}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        <UploadProgress
          stage={bulkImport.progress.stage}
          percent={bulkImport.progress.percent}
          message={
            bulkImport.progress.stage === "processing"
              ? "Upload complete — importing tutors…"
              : bulkImport.progress.stage === "done"
                ? "Import finished — see the results below"
                : bulkImport.progress.stage === "error"
                  ? "The import couldn't be completed"
                  : undefined
          }
        />

        {result && <BulkImportResults result={result} />}
      </div>
    </Modal>
  )
}

function BulkImportResults({
  result,
}: {
  result: {
    total: number
    succeeded: number
    failed: number
    results: BulkImportRow[]
  }
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryStat label="Total rows" value={result.total} />
        <SummaryStat
          label="Succeeded"
          value={result.succeeded}
          variant="success"
        />
        <SummaryStat
          label="Failed"
          value={result.failed}
          variant="destructive"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Row</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.results.map((row) => (
              <tr key={row.row}>
                <td className="px-3 py-2 text-muted-foreground">{row.row}</td>
                <td className="px-3 py-2 text-foreground">{row.email}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {row.success ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : (
                      <XCircle size={14} className="text-red-500" />
                    )}
                    <StatusBadge
                      label={row.action}
                      variant={actionVariant[row.action]}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {row.error && (
                    <span className="text-destructive">{row.error}</span>
                  )}
                  {row.generated_password && (
                    <span className="block font-mono text-foreground">
                      temp password: {row.generated_password}
                    </span>
                  )}
                  {row.email_sent === true && <span>Welcome email sent</span>}
                  {row.email_sent === false && (
                    <span className="text-destructive">
                      Email failed
                      {row.email_error ? `: ${row.email_error}` : ""}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant?: "success" | "destructive"
}) {
  return (
    <div className="rounded-xl border border-border p-3 text-center">
      <p
        className={cn(
          "text-2xl font-bold",
          variant === "success" && "text-emerald-600 dark:text-emerald-400",
          variant === "destructive" && "text-red-600 dark:text-red-400",
          !variant && "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
