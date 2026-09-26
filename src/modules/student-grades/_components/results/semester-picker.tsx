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
  /** Only this major program's sessions (plus institution-wide ones). */
  majorProgramId?: number | null
  /** Why the session field is locked, e.g. "Pick a major program first". */
  sessionDisabledReason?: string | null
}

// Real academic sessions/semesters (never the old mock SEMESTERS constant).
export function SemesterPicker({
  idPrefix,
  sessionId,
  semesterId,
  onSessionChange,
  onSemesterChange,
  majorProgramId = null,
  sessionDisabledReason = null,
}: SemesterPickerProps) {
  // Each option names its major program ("2026/2027 — Part-Time
  // Programmes") — several programmes run identically named sessions — and
  // a scoped admin only sees their own programmes' (plus institution-wide).
  const { options: sessionOptions, isLoading: loadingSessions } =
    useSessionOptions({ majorProgramId })
  const { data: semesters = [], isLoading: loadingSemesters } =
    useSemesters(sessionId)

  return (
    <>
      <SelectField
        id={`${idPrefix}-session`}
        label="Academic session"
        value={sessionId ? String(sessionId) : ""}
        onChange={(v) => onSessionChange(toId(v))}
        disabled={sessionDisabledReason != null}
        placeholder={
          sessionDisabledReason ??
          (loadingSessions
            ? "Loading…"
            : sessionOptions.length === 0
              ? "No sessions"
              : "All sessions")
        }
        options={sessionDisabledReason != null ? [] : sessionOptions}
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
              : semesters.length === 0
                ? "No semesters in this session"
                : "All semesters"
        }
        options={semesters.map((s) => ({ value: String(s.id), label: s.name }))}
      />
    </>
  )
}
