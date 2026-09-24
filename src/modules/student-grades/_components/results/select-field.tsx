import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder: string
  disabled?: boolean
  className?: string
}

// Labelled native <select> — keyboard and screen-reader friendly without
// extra wiring. An empty string value means "no filter".
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
}: SelectFieldProps) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <label
        htmlFor={id}
        className="text-[11px] font-medium text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-border bg-background pr-8 pl-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none disabled:opacity-50 dark:bg-muted/20"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
    </div>
  )
}

export const toId = (v: string): number | null => (v ? Number(v) : null)
