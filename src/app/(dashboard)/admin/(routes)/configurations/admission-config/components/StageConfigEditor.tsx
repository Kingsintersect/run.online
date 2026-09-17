"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FEE_CATEGORY_LABELS,
  FILE_ACCEPT_LABELS,
  toSnakeKey,
} from "@/lib/admission-catalog"
import { useFeeTypes } from "@/modules/fee-management/hooks/use-fee-types"
import type {
  AdmissionFeeCategory,
  FileAccept,
  StageConfigByType,
  StageDocumentRequirement,
} from "@/types/admissionConfig"
import type { StageDraft } from "./stage-draft"

// Per-type settings for a PROCESS stage — sandbox/dynamic-admission/
// API_CONTRACTS.md §2.2. Errors are keyed by config path.

interface StageConfigEditorProps {
  draft: StageDraft
  onChange: (draft: StageDraft) => void
  errors: Record<string, string>
  disabled?: boolean
}

const ANY_FEE_TYPE = "__any__"
const FEE_CATEGORIES = Object.keys(
  FEE_CATEGORY_LABELS
) as AdmissionFeeCategory[]
const FILE_ACCEPTS = Object.keys(FILE_ACCEPT_LABELS) as FileAccept[]

function ErrorText({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <div>
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}

const toOptionalInt = (value: string): number | null => {
  if (value.trim() === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

export function StageConfigEditor({
  draft,
  onChange,
  errors,
  disabled,
}: StageConfigEditorProps) {
  switch (draft.type) {
    case "MAJOR_PROGRAM_CHOICE":
      return (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          The applicant picks their major program here (e.g. Degree, Part-Time,
          Certificate) — it has no settings of its own. Put it before Program
          Choice so that stage&apos;s own picker can narrow to this major
          program&apos;s programs.
        </p>
      )

    case "PROGRAM_CHOICE": {
      const config = draft.config
      const set = (patch: Partial<StageConfigByType["PROGRAM_CHOICE"]>) =>
        onChange({ type: "PROGRAM_CHOICE", config: { ...config, ...patch } })
      return (
        <div className="space-y-2">
          <ToggleRow
            id="stage-entry-mode"
            label="Ask for entry mode"
            description="UTME, direct entry or transfer."
            checked={config.collectEntryMode}
            onChange={(v) => set({ collectEntryMode: v })}
            disabled={disabled}
          />
          <ToggleRow
            id="stage-study-mode"
            label="Ask for study mode"
            description="Online or on campus."
            checked={config.collectStudyMode}
            onChange={(v) => set({ collectStudyMode: v })}
            disabled={disabled}
          />
          <ToggleRow
            id="stage-start-term"
            label="Ask for start term"
            checked={config.collectStartTerm}
            onChange={(v) => set({ collectStartTerm: v })}
            disabled={disabled}
          />
        </div>
      )
    }

    case "PAYMENT":
      return (
        <PaymentConfigEditor
          config={draft.config}
          onChange={(config) => onChange({ type: "PAYMENT", config })}
          errors={errors}
          disabled={disabled}
        />
      )

    case "FORM":
      return (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          This stage shows the Application Form Steps configured on the right.
          It has no settings of its own.
        </p>
      )

    case "DECISION":
      return (
        <ToggleRow
          id="stage-offer-expiry"
          label="Show the offer expiry date"
          checked={draft.config.showOfferExpiry}
          onChange={(v) =>
            onChange({ type: "DECISION", config: { showOfferExpiry: v } })
          }
          disabled={disabled}
        />
      )

    case "CONTENT": {
      const config = draft.config
      const set = (patch: Partial<StageConfigByType["CONTENT"]>) =>
        onChange({ type: "CONTENT", config: { ...config, ...patch } })
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="stage-content-title">Page title</Label>
            <Input
              id="stage-content-title"
              value={config.title}
              onChange={(e) => set({ title: e.target.value })}
              disabled={disabled}
              aria-invalid={!!errors.title}
            />
            <ErrorText message={errors.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stage-content-body">Content</Label>
            <Textarea
              id="stage-content-body"
              rows={6}
              value={config.body}
              onChange={(e) => set({ body: e.target.value })}
              disabled={disabled}
              aria-invalid={!!errors.body}
              placeholder={
                "## Medical examination\nBook your medical at the university clinic before…"
              }
            />
            <p className="text-xs text-muted-foreground">
              Markdown is supported: headings, lists, bold and links.
            </p>
            <ErrorText message={errors.body} />
          </div>
          <ToggleRow
            id="stage-content-ack"
            label="Require acknowledgement"
            description="The applicant must confirm before moving on."
            checked={config.requireAcknowledgement}
            onChange={(v) => set({ requireAcknowledgement: v })}
            disabled={disabled}
          />
          {config.requireAcknowledgement && (
            <div className="space-y-1.5">
              <Label htmlFor="stage-content-ack-label">Confirmation text</Label>
              <Input
                id="stage-content-ack-label"
                value={config.acknowledgementLabel ?? ""}
                onChange={(e) => set({ acknowledgementLabel: e.target.value })}
                disabled={disabled}
                aria-invalid={!!errors.acknowledgementLabel}
              />
              <ErrorText message={errors.acknowledgementLabel} />
            </div>
          )}
        </div>
      )
    }

    case "DOCUMENT_UPLOAD":
      return (
        <DocumentListEditor
          documents={draft.config.documents}
          onChange={(documents) =>
            onChange({ type: "DOCUMENT_UPLOAD", config: { documents } })
          }
          errors={errors}
          disabled={disabled}
        />
      )

    case "COMPLETE": {
      const config = draft.config
      const set = (patch: Partial<StageConfigByType["COMPLETE"]>) =>
        onChange({ type: "COMPLETE", config: { ...config, ...patch } })
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="stage-complete-message">Closing message</Label>
            <Textarea
              id="stage-complete-message"
              rows={3}
              value={config.message}
              onChange={(e) => set({ message: e.target.value })}
              disabled={disabled}
              aria-invalid={!!errors.message}
            />
            <ErrorText message={errors.message} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stage-complete-cta-label">
                Button label (optional)
              </Label>
              <Input
                id="stage-complete-cta-label"
                value={config.ctaLabel ?? ""}
                onChange={(e) => set({ ctaLabel: e.target.value || null })}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stage-complete-cta-href">Button link</Label>
              <Input
                id="stage-complete-cta-href"
                value={config.ctaHref ?? ""}
                onChange={(e) => set({ ctaHref: e.target.value || null })}
                disabled={disabled}
                placeholder="/student/courses"
                aria-invalid={!!errors.ctaHref}
              />
              <ErrorText message={errors.ctaHref} />
            </div>
          </div>
        </div>
      )
    }
  }
}

function PaymentConfigEditor({
  config,
  onChange,
  errors,
  disabled,
}: {
  config: StageConfigByType["PAYMENT"]
  onChange: (config: StageConfigByType["PAYMENT"]) => void
  errors: Record<string, string>
  disabled?: boolean
}) {
  const { data: feeTypes, isLoading } = useFeeTypes({
    category: config.feeCategory,
  })
  const set = (patch: Partial<StageConfigByType["PAYMENT"]>) =>
    onChange({ ...config, ...patch })

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="stage-fee-category">Fee category</Label>
          <Select
            value={config.feeCategory}
            onValueChange={(v) =>
              set({ feeCategory: v as AdmissionFeeCategory, feeTypeId: null })
            }
            disabled={disabled}
          >
            <SelectTrigger id="stage-fee-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEE_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {FEE_CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stage-fee-type">Fee type</Label>
          <Select
            value={config.feeTypeId ? String(config.feeTypeId) : ANY_FEE_TYPE}
            onValueChange={(v) =>
              set({ feeTypeId: v === ANY_FEE_TYPE ? null : Number(v) })
            }
            disabled={disabled || isLoading}
          >
            <SelectTrigger id="stage-fee-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_FEE_TYPE}>
                The applicant&apos;s fee in this category
              </SelectItem>
              {(feeTypes ?? []).map((fee) => {
                // Mirror the "Scope" column in fee-type-table.tsx: prefer the
                // most specific scope (major program, else program) so
                // same-named fee types (e.g. three "Tuition Fee" rows, one
                // per major program) are distinguishable in this dropdown.
                const scope = fee.program
                  ? fee.program.name
                  : (fee.majorProgram?.name ?? null)
                return (
                  <SelectItem key={fee.id} value={String(fee.id)}>
                    {fee.name}
                    {scope ? ` · ${scope}` : ""}
                    {fee.session ? ` · ${fee.session.name}` : ""}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ToggleRow
        id="stage-installments"
        label="Allow installments"
        checked={config.allowInstallments}
        onChange={(v) =>
          set({
            allowInstallments: v,
            minimumPercent: v ? (config.minimumPercent ?? 50) : null,
          })
        }
        disabled={disabled}
      />
      {config.allowInstallments && (
        <div className="space-y-1.5">
          <Label htmlFor="stage-minimum-percent">
            Minimum first payment (%)
          </Label>
          <Input
            id="stage-minimum-percent"
            type="number"
            min={1}
            max={100}
            value={config.minimumPercent ?? ""}
            onChange={(e) =>
              set({ minimumPercent: toOptionalInt(e.target.value) })
            }
            disabled={disabled}
            aria-invalid={!!errors.minimumPercent}
            className="max-w-40"
          />
          <ErrorText message={errors.minimumPercent} />
        </div>
      )}
    </div>
  )
}

function DocumentListEditor({
  documents,
  onChange,
  errors,
  disabled,
}: {
  documents: StageDocumentRequirement[]
  onChange: (documents: StageDocumentRequirement[]) => void
  errors: Record<string, string>
  disabled?: boolean
}) {
  const update = (index: number, patch: Partial<StageDocumentRequirement>) =>
    onChange(
      documents.map((doc, i) => (i === index ? { ...doc, ...patch } : doc))
    )

  return (
    <div className="space-y-3">
      {documents.map((doc, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-start gap-2">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`stage-doc-label-${i}`}>Document</Label>
                <Input
                  id={`stage-doc-label-${i}`}
                  value={doc.label}
                  onChange={(e) => {
                    const label = e.target.value
                    // Keep the key in step with the label until it's edited by hand.
                    const autoKey =
                      doc.key === "" || doc.key === toSnakeKey(doc.label)
                    update(i, {
                      label,
                      ...(autoKey ? { key: toSnakeKey(label) } : {}),
                    })
                  }}
                  disabled={disabled}
                  placeholder="Medical report"
                  aria-invalid={!!errors[`documents.${i}.label`]}
                />
                <ErrorText message={errors[`documents.${i}.label`]} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`stage-doc-key-${i}`}>Key</Label>
                <Input
                  id={`stage-doc-key-${i}`}
                  value={doc.key}
                  onChange={(e) => update(i, { key: e.target.value })}
                  disabled={disabled}
                  className="font-mono text-xs"
                  aria-invalid={!!errors[`documents.${i}.key`]}
                />
                <ErrorText message={errors[`documents.${i}.key`]} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`stage-doc-accept-${i}`}>Accepts</Label>
                <Select
                  value={doc.accept}
                  onValueChange={(v) => update(i, { accept: v as FileAccept })}
                  disabled={disabled}
                >
                  <SelectTrigger
                    id={`stage-doc-accept-${i}`}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_ACCEPTS.map((accept) => (
                      <SelectItem key={accept} value={accept}>
                        {FILE_ACCEPT_LABELS[accept]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`stage-doc-size-${i}`}>Max size (MB)</Label>
                <Input
                  id={`stage-doc-size-${i}`}
                  type="number"
                  min={1}
                  max={50}
                  value={doc.maxSizeMb ?? ""}
                  onChange={(e) =>
                    update(i, { maxSizeMb: toOptionalInt(e.target.value) })
                  }
                  disabled={disabled}
                  placeholder="5"
                />
              </div>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="mt-6 text-destructive hover:text-destructive"
              onClick={() => onChange(documents.filter((_, j) => j !== i))}
              disabled={disabled}
              aria-label={`Remove ${doc.label || "document"}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <ToggleRow
            id={`stage-doc-required-${i}`}
            label="Required"
            checked={doc.required}
            onChange={(v) => update(i, { required: v })}
            disabled={disabled}
          />
        </div>
      ))}
      <ErrorText message={errors.documents} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() =>
          onChange([
            ...documents,
            {
              key: "",
              label: "",
              accept: "DOCUMENT",
              required: true,
              maxSizeMb: null,
            },
          ])
        }
        disabled={disabled}
      >
        <Plus className="size-3.5" />
        Add document
      </Button>
    </div>
  )
}
