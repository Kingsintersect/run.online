"use client"

import {
  SelectField,
  toId,
} from "@/modules/student-grades/_components/results/select-field"

interface MajorProgramSelectProps {
  id: string
  programs: { id: number; name: string }[]
  value: number | null
  onChange: (majorProgramId: number | null) => void
  isLoading: boolean
}

// Hidden when only one major program is on offer — it's auto-selected and
// named in the screen's context line instead (single-program deployments
// look unchanged).
export function MajorProgramSelect({
  id,
  programs,
  value,
  onChange,
  isLoading,
}: MajorProgramSelectProps) {
  if (!isLoading && programs.length === 1) return null
  return (
    <SelectField
      id={id}
      label="Major program"
      value={value ? String(value) : ""}
      onChange={(v) => onChange(toId(v))}
      placeholder={isLoading ? "Loading…" : "Choose a major program"}
      disabled={isLoading}
      options={programs.map((p) => ({ value: String(p.id), label: p.name }))}
      className="w-full sm:max-w-xs"
    />
  )
}
