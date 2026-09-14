"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { FormFieldOption } from "@/types/admissionConfig"

interface OptionsEditorProps {
  value: FormFieldOption[]
  onChange: (options: FormFieldOption[]) => void
  error?: string
  disabled?: boolean
}

/** Fixed answer choices for a dropdown / single-choice / multiple-choice question. */
export function OptionsEditor({
  value,
  onChange,
  error,
  disabled,
}: OptionsEditorProps) {
  const update = (index: number, patch: Partial<FormFieldOption>) =>
    onChange(value.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)))

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-muted-foreground">
          <span>Shown to the applicant</span>
          <span>Saved as</span>
          <span className="w-7" />
        </div>
      )}
      {value.map((opt, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            value={opt.label}
            onChange={(e) => {
              const label = e.target.value
              // Keep the saved value matching the label until it's edited by hand.
              const autoValue = opt.value === "" || opt.value === opt.label
              update(i, { label, ...(autoValue ? { value: label } : {}) })
            }}
            disabled={disabled}
            aria-label={`Option ${i + 1} label`}
          />
          <Input
            value={opt.value}
            onChange={(e) => update(i, { value: e.target.value })}
            disabled={disabled}
            className="font-mono text-xs"
            aria-label={`Option ${i + 1} value`}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            disabled={disabled}
            aria-label={`Remove option ${opt.label || i + 1}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => onChange([...value, { value: "", label: "" }])}
        disabled={disabled}
      >
        <Plus className="size-3.5" />
        Add option
      </Button>
    </div>
  )
}
