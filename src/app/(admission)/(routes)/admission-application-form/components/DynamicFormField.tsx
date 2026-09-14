"use client"

/* ------------------------------------------------------------------ */
/*  Dynamic Application Form Field — sandbox/dynamic-admission/        */
/*                                                                     */
/*  Renders one AdmissionFormField as a plain controlled component     */
/*  (value/onChange). Answer choices come from the field's static      */
/*  options or its option source; repeating groups render their child  */
/*  fields per entry.                                                   */
/* ------------------------------------------------------------------ */

import { useId, useRef, type ReactNode } from "react"
import { FileText, Loader2, Plus, Trash2, Upload, X } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AdmissionFormField, FileAccept } from "@/types/admissionConfig"
import { useFieldOptions } from "../hooks/use-field-options"
import type { DynamicFieldValue, DynamicRow } from "../lib/dynamic-form"

export type { DynamicFieldValue } from "../lib/dynamic-form"

interface DynamicFormFieldProps {
  field: AdmissionFormField
  value: DynamicFieldValue
  onChange: (value: DynamicFieldValue) => void
  error?: string
  disabled?: boolean
  /** REPEATING_GROUP only — the questions inside each entry. */
  childFields?: AdmissionFormField[]
  /** Answer to the field's `dependsOn` question (e.g. the country, for states). */
  dependsOnValue?: string
  /** One level further up (the country, for local governments). */
  parentDependsOnValue?: string
}

const FILE_ACCEPT_ATTR: Record<FileAccept, string | undefined> = {
  IMAGE: "image/*",
  DOCUMENT:
    "image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ANY: undefined,
}

const isFileList = (value: DynamicFieldValue): value is File[] =>
  Array.isArray(value) && value.every((item) => item instanceof File)

const isRowList = (value: DynamicFieldValue): value is DynamicRow[] =>
  Array.isArray(value) &&
  value.every(
    (row) => typeof row === "object" && row !== null && !(row instanceof File)
  )

export function DynamicFormField({
  field,
  value,
  onChange,
  error,
  disabled,
  childFields = [],
  dependsOnValue,
  parentDependsOnValue,
}: DynamicFormFieldProps) {
  const id = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const { options, isLoading, waitingFor } = useFieldOptions(
    field,
    dependsOnValue,
    parentDependsOnValue
  )

  const describedBy =
    [field.helpText ? helpId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined
  const requiredMark = field.isRequired && field.type !== "BOOLEAN" && (
    <span className="ml-1 text-destructive" aria-hidden="true">
      *
    </span>
  )
  const label = (
    <Label htmlFor={id} id={`${id}-label`}>
      {field.label}
      {requiredMark}
    </Label>
  )
  const help = field.helpText ? (
    <p id={helpId} className="text-xs text-muted-foreground">
      {field.helpText}
    </p>
  ) : null
  const errorText = error ? (
    <p id={errorId} role="alert" className="text-sm text-destructive">
      {error}
    </p>
  ) : null
  const wrap = (control: ReactNode) => (
    <div className="space-y-2">
      {label}
      {control}
      {help}
      {errorText}
    </div>
  )
  const text =
    typeof value === "string" || typeof value === "number" ? String(value) : ""

  switch (field.type) {
    case "TEXT":
    case "EMAIL":
    case "PHONE":
      return wrap(
        <Input
          id={id}
          type={
            field.type === "EMAIL"
              ? "email"
              : field.type === "PHONE"
                ? "tel"
                : "text"
          }
          disabled={disabled}
          placeholder={field.placeholder ?? undefined}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          value={text}
          maxLength={field.validation?.maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case "NUMBER":
      return wrap(
        <Input
          id={id}
          type="number"
          disabled={disabled}
          placeholder={field.placeholder ?? undefined}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          value={text}
          min={field.validation?.min}
          max={field.validation?.max}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : e.target.valueAsNumber)
          }
        />
      )

    case "YEAR": {
      const now = new Date().getFullYear()
      const max = field.validation?.max ?? now
      const min = field.validation?.min ?? now - 60
      const years = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) =>
        String(max - i)
      )
      return wrap(
        <Select
          value={text || undefined}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={id}
            className="w-full"
            aria-invalid={!!error}
            aria-describedby={describedBy}
          >
            <SelectValue placeholder="Select a year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    case "DATE":
      return wrap(
        <Input
          id={id}
          type="date"
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          value={text}
          min={field.validation?.minDate}
          max={field.validation?.maxDate}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case "TEXTAREA":
      return wrap(
        <Textarea
          id={id}
          disabled={disabled}
          placeholder={field.placeholder ?? undefined}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          value={text}
          maxLength={field.validation?.maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case "SELECT":
      return wrap(
        <Select
          value={text || undefined}
          onValueChange={onChange}
          disabled={disabled || isLoading || !!waitingFor}
        >
          <SelectTrigger
            id={id}
            className="w-full"
            aria-invalid={!!error}
            aria-describedby={describedBy}
          >
            <SelectValue
              placeholder={
                waitingFor
                  ? `Choose ${waitingFor} first`
                  : isLoading
                    ? "Loading…"
                    : (field.placeholder ?? "Select…")
              }
            />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "RADIO":
      return (
        <div className="space-y-2">
          <p id={`${id}-label`} className="text-sm font-medium text-foreground">
            {field.label}
            {requiredMark}
          </p>
          <div
            role="radiogroup"
            aria-labelledby={`${id}-label`}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            className="flex flex-wrap gap-2"
          >
            {isLoading && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
            {options.map((opt) => {
              const checked = text === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={disabled}
                  onClick={() => onChange(opt.value)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                    checked
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border text-foreground hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {help}
          {errorText}
        </div>
      )

    case "MULTISELECT": {
      const selected = Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string")
        : []
      const toggle = (option: string) =>
        onChange(
          selected.includes(option)
            ? selected.filter((s) => s !== option)
            : [...selected, option]
        )
      return (
        <div className="space-y-2">
          <p id={`${id}-label`} className="text-sm font-medium text-foreground">
            {field.label}
            {requiredMark}
          </p>
          <div
            role="group"
            aria-labelledby={`${id}-label`}
            aria-describedby={describedBy}
            className="flex flex-wrap gap-2"
          >
            {isLoading && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
            {options.map((opt) => {
              const active = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
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
          {help}
          {errorText}
        </div>
      )
    }

    case "BOOLEAN":
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <div className="space-y-0.5">
              <Label htmlFor={id}>{field.label}</Label>
              {help}
            </div>
            <Switch
              id={id}
              checked={value === true}
              onCheckedChange={(checked) => onChange(checked)}
              disabled={disabled}
              aria-describedby={describedBy}
            />
          </div>
          {errorText}
        </div>
      )

    case "FILE": {
      const multiple = !!field.validation?.multiple
      const files = isFileList(value)
        ? value
        : value instanceof File
          ? [value]
          : []
      return (
        <div className="space-y-2">
          {label}
          <label
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm transition-colors",
              error
                ? "border-destructive text-destructive"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              disabled && "pointer-events-none opacity-60"
            )}
          >
            <Upload size={14} />
            {multiple
              ? "Add files…"
              : files[0]
                ? `Replace ${files[0].name}`
                : "Choose a file…"}
          </label>
          <input
            ref={fileInputRef}
            id={id}
            type="file"
            className="sr-only"
            accept={FILE_ACCEPT_ATTR[field.validation?.accept ?? "ANY"]}
            multiple={multiple}
            disabled={disabled}
            aria-describedby={describedBy}
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? [])
              if (multiple) onChange([...files, ...picked])
              else onChange(picked[0] ?? null)
              // Allow picking the same file again after removing it.
              if (fileInputRef.current) fileInputRef.current.value = ""
            }}
          />
          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((file, i) => (
                <li
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate">{file.name}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    onClick={() =>
                      onChange(
                        multiple ? files.filter((_, j) => j !== i) : null
                      )
                    }
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {help}
          {errorText}
        </div>
      )
    }

    case "REPEATING_GROUP": {
      const rows = isRowList(value) ? value : []
      const children = [...childFields].sort((a, b) => a.order - b.order)
      const maxItems = field.validation?.maxItems
      const setRow = (index: number, row: DynamicRow) =>
        onChange(rows.map((r, j) => (j === index ? row : r)))
      return (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            {field.label}
            {requiredMark}
          </p>
          {help}
          {rows.map((row, i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-border p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Entry {i + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  aria-label={`Remove entry ${i + 1}`}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
              {children.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className={
                        child.width === "HALF"
                          ? "sm:col-span-1"
                          : "sm:col-span-2"
                      }
                    >
                      <DynamicFormField
                        field={child}
                        value={row[child.key]}
                        onChange={(v) => setRow(i, { ...row, [child.key]: v })}
                        disabled={disabled}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Input
                  value={typeof row.value === "string" ? row.value : ""}
                  disabled={disabled}
                  onChange={(e) => setRow(i, { value: e.target.value })}
                  aria-label={`${field.label} entry ${i + 1}`}
                />
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={
              disabled || (maxItems !== undefined && rows.length >= maxItems)
            }
            onClick={() => onChange([...rows, {}])}
          >
            <Plus size={13} /> Add {rows.length ? "another" : "an entry"}
          </Button>
          {errorText}
        </div>
      )
    }

    default:
      // A FormFieldType this renderer doesn't know yet (backend/type drift)
      // degrades to nothing rather than crashing.
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
