"use client"

/* ------------------------------------------------------------------ */
/*  Dynamic Application Form Field — Multi-Program Platform            */
/*                                                                     */
/*  Renders one AdmissionFormField (sandbox/multi-program-platform/    */
/*  API_CONTRACTS.md §B) — the admin-composed questions that replace   */
/*  a hardcoded step component for a program's own FORM-group steps.   */
/*                                                                     */
/*  Deliberately a plain controlled component (value/onChange), not    */
/*  wired to react-hook-form's FormDefaultValues context the existing  */
/*  fixed steps use (FormFields.tsx's FieldName is a closed union of   */
/*  the 9 built-in fields' keys — a dynamic, admin-defined key can't   */
/*  satisfy that type). Whatever eventually holds the live wizard's    */
/*  custom-field state (a Controller, a small local reducer, ...) can  */
/*  drive this the same way regardless of that choice — see            */
/*  FRONTEND_IMPLEMENTATION_PLAN.md phase B3.                          */
/* ------------------------------------------------------------------ */

import { useId } from "react"
import { Loader2, Plus, Trash2, Upload } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AdmissionFormField } from "@/types/admissionConfig"

export type DynamicFieldValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, unknown>[]
  | File
  | null
  | undefined

interface DynamicFormFieldProps {
  field: AdmissionFormField
  value: DynamicFieldValue
  onChange: (value: DynamicFieldValue) => void
  error?: string
  disabled?: boolean
}

export function DynamicFormField({
  field,
  value,
  onChange,
  error,
  disabled,
}: DynamicFormFieldProps) {
  const id = useId()

  const label = (
    <Label htmlFor={id}>
      {field.label}
      {field.isRequired && <span className="ml-1 text-destructive">*</span>}
    </Label>
  )

  const errorText = error && (
    <p className="text-sm text-destructive">{error}</p>
  )

  switch (field.type) {
    case "TEXT":
    case "EMAIL":
    case "PHONE":
    case "NUMBER": {
      const htmlType =
        field.type === "EMAIL"
          ? "email"
          : field.type === "PHONE"
            ? "tel"
            : field.type === "NUMBER"
              ? "number"
              : "text"
      return (
        <div className="space-y-2">
          {label}
          <Input
            id={id}
            type={htmlType}
            disabled={disabled}
            aria-invalid={!!error}
            value={(value as string | number | undefined) ?? ""}
            onChange={(e) =>
              onChange(
                field.type === "NUMBER"
                  ? e.target.valueAsNumber
                  : e.target.value
              )
            }
          />
          {field.helpText && !error && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
          {errorText}
        </div>
      )
    }

    case "DATE":
      return (
        <div className="space-y-2">
          {label}
          <Input
            id={id}
            type="date"
            disabled={disabled}
            aria-invalid={!!error}
            value={(value as string | undefined) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            min={field.validation?.minDate}
            max={field.validation?.maxDate}
          />
          {errorText}
        </div>
      )

    case "TEXTAREA":
      return (
        <div className="space-y-2">
          {label}
          <Textarea
            id={id}
            disabled={disabled}
            aria-invalid={!!error}
            value={(value as string | undefined) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.helpText && !error && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
          {errorText}
        </div>
      )

    case "SELECT":
      return (
        <div className="space-y-2">
          {label}
          <Select
            value={(value as string | undefined) ?? ""}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full" id={id}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorText}
        </div>
      )

    case "MULTISELECT": {
      const selected = Array.isArray(value) ? (value as string[]) : []
      const toggle = (v: string) =>
        onChange(
          selected.includes(v)
            ? selected.filter((s) => s !== v)
            : [...selected, v]
        )
      return (
        <div className="space-y-2">
          {label}
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((opt) => {
              const active = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {errorText}
        </div>
      )
    }

    case "FILE":
      return (
        <div className="space-y-2">
          {label}
          <label
            htmlFor={id}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <Upload size={14} />
            {value instanceof File ? value.name : "Choose a file…"}
          </label>
          <input
            id={id}
            type="file"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
          {errorText}
        </div>
      )

    case "REPEATING_GROUP": {
      // Each entry is a free-form object — the admin-defined shape isn't
      // known here (no nested field defs in v1, see SCHEMA_CHANGES.md §3).
      // Renders as a simple add/remove list of single-line entries; a
      // richer nested-field editor is a natural follow-up once a real
      // repeatable field is actually in use.
      const rows = Array.isArray(value)
        ? (value as Record<string, unknown>[])
        : []
      const setRow = (i: number, text: string) => {
        const next = [...rows]
        next[i] = { value: text }
        onChange(next)
      }
      return (
        <div className="space-y-2">
          {label}
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={(row.value as string | undefined) ?? ""}
                  disabled={disabled}
                  onChange={(e) => setRow(i, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                >
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={disabled}
              onClick={() => onChange([...rows, { value: "" }])}
            >
              <Plus size={13} /> Add another
            </Button>
          </div>
          {errorText}
        </div>
      )
    }

    default:
      // Exhaustiveness guard — a FormFieldType this renderer doesn't know
      // yet (backend/type drift) degrades to nothing rather than crashing.
      return null
  }
}

/** Loading placeholder while a step's field defs are still resolving. */
export function DynamicFormFieldSkeleton() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 size={14} className="animate-spin" />
      Loading fields…
    </div>
  )
}
