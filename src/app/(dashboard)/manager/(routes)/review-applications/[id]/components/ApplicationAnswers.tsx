"use client"

import { useQuery } from "@tanstack/react-query"
import { FileText, ListChecks } from "lucide-react"
import SectionCard from "@/components/custom/SectionCard"
import { admissionStepsQueryOptions } from "@/services/admissionStepsApi"
import type { AdmissionFormField } from "@/types/admissionConfig"
import type {
  AdmissionApplication,
  ApplicationAnswerValue,
  ApplicationFormFile,
  ApplicationFormSheetField,
} from "@/types/school"

// Dynamic application answers for the admin review —
// sandbox/dynamic-admission/API_CONTRACTS.md §3.6. Uses the backend's
// answer sheet when present (built from the form as the applicant saw it);
// otherwise labels today's `custom_fields` from the program's current field
// definitions.

const isFile = (value: ApplicationAnswerValue): value is ApplicationFormFile =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  "url" in value

const isFileList = (
  value: ApplicationAnswerValue
): value is ApplicationFormFile[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((v) => typeof v === "object" && v !== null && "url" in v)

function formatValue(value: ApplicationAnswerValue): string {
  if (value === null || value === "") return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "string" || typeof value === "number")
    return String(value)
  if (isFile(value)) return value.fileName
  return value
    .map((item) =>
      typeof item === "string"
        ? item
        : Object.values(item)
            .filter((v) => v !== null && v !== "")
            .map(String)
            .join(" · ")
    )
    .join(", ")
}

function AnswerRow({
  label,
  value,
  displayValue,
}: {
  label: string
  value: ApplicationAnswerValue
  displayValue?: string | null
}) {
  const files = isFile(value) ? [value] : isFileList(value) ? value : []
  return (
    <div className="space-y-1">
      <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm text-foreground">
        {files.length > 0 ? (
          <ul className="space-y-1">
            {files.map((file) => (
              <li key={file.documentId}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  <FileText size={14} />
                  {file.fileName}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          (displayValue ?? formatValue(value))
        )}
      </dd>
    </div>
  )
}

function SheetStep({
  label,
  fields,
}: {
  label: string
  fields: ApplicationFormSheetField[]
}) {
  const visible = fields.filter(
    (f) => f.visible && f.value !== null && f.value !== ""
  )
  if (visible.length === 0) return null
  return (
    <SectionCard title={label} icon={ListChecks}>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {visible.map((field) => (
          <AnswerRow
            key={field.key}
            label={field.label}
            value={field.value}
            displayValue={field.displayValue}
          />
        ))}
      </dl>
    </SectionCard>
  )
}

function labelsFromFields(fields: AdmissionFormField[]): Map<string, string> {
  const labels = new Map<string, string>()
  for (const field of fields) {
    if (!labels.has(field.key)) labels.set(field.key, field.label)
    for (const child of field.children ?? []) {
      if (!labels.has(child.key)) labels.set(child.key, child.label)
    }
  }
  return labels
}

const prettifyKey = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

export function ApplicationAnswers({
  application,
}: {
  application: AdmissionApplication
}) {
  const sheet = application.form
  const customFields = application.custom_fields ?? null
  const hasCustomFields = !!customFields && Object.keys(customFields).length > 0
  const programId =
    Number(application.program_choice.first_choice_program_id) || null

  const { data: effectiveForm } = useQuery({
    ...admissionStepsQueryOptions.effective("FORM", programId),
    enabled: !sheet?.steps?.length && hasCustomFields,
    retry: false,
  })

  if (sheet?.steps?.length) {
    return (
      <>
        {sheet.steps.map((step) => (
          <SheetStep key={step.key} label={step.label} fields={step.fields} />
        ))}
      </>
    )
  }

  if (!hasCustomFields || !customFields) return null

  const labels = labelsFromFields(
    (effectiveForm ?? []).flatMap((s) => s.fields ?? [])
  )
  return (
    <SectionCard title="Additional Answers" icon={ListChecks}>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {Object.entries(customFields).map(([key, value]) => (
          <AnswerRow
            key={key}
            label={labels.get(key) ?? prettifyKey(key)}
            value={value}
          />
        ))}
      </dl>
    </SectionCard>
  )
}
