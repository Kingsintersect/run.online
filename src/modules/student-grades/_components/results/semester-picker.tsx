"use client"

import { useSessionOptions } from "@/hooks/use-session-options"
import { useSemesters } from "@/hooks/useSemesters"
import { SelectField, toId } from "./select-field"

interface SemesterPickerProps {
  idPrefix: string
  sessionId: number | null
  semesterId: number | null
  onSessionChange: (id: number | null) => void
  onSemesterChange: (id: number | null) => void
}

// Real academic sessions/semesters (never the old mock SEMESTERS constant).
export function SemesterPicker({
  idPrefix,
  sessionId,
  semesterId,
  onSessionChange,
  onSemesterChange,
}: SemesterPickerProps) {
  // Each option names its major program ("2026/2027 — Part-Time
  // Programmes") — several programmes run identically named sessions — and
  // a scoped admin only sees their own programmes' (plus institution-wide).
  const { options: sessionOptions, isLoading: loadingSessions } =
    useSessionOptions()
  const { data: semesters = [], isLoading: loadingSemesters } =
    useSemesters(sessionId)

  return (
    <>
      <SelectField
        id={`${idPrefix}-session`}
        label="Academic session"
        value={sessionId ? String(sessionId) : ""}
        onChange={(v) => onSessionChange(toId(v))}
        placeholder={loadingSessions ? "Loading…" : "All sessions"}
        options={sessionOptions}
      />
      <SelectField
        id={`${idPrefix}-semester`}
        label="Semester"
        value={semesterId ? String(semesterId) : ""}
        onChange={(v) => onSemesterChange(toId(v))}
        disabled={!sessionId}
        placeholder={
          !sessionId
            ? "Pick a session first"
            : loadingSemesters
              ? "Loading…"
              : "All semesters"
        }
        options={semesters.map((s) => ({ value: String(s.id), label: s.name }))}
      />
    </>
  )
}
