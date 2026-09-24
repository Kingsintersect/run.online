"use client"

import { useAcademicSessions } from "@/hooks/useAcademicSessions"
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
  const { data: sessions = [], isLoading: loadingSessions } =
    useAcademicSessions()
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
        options={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
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
