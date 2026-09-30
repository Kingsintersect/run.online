"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Check } from "lucide-react"
import Modal from "@/components/custom/Modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useBulkEnroll } from "../hooks/use-enrollment-mutations"
import { usersQueryOptions } from "@/services/usersApi"
import { courseOfferingQueryOptions } from "@/services/courseOfferingApi"
import { useAcademicCalendar } from "@/modules/timetable/hooks/useAcademicCalendar"
import type { BulkEnrollResult } from "../types"
import {
  ENROLLMENT_INVOICE_NOTE,
  enrollmentErrorMessage,
} from "../lib/enrollment-errors"

interface BulkEnrollDialogProps {
  open: boolean
  onClose: () => void
}

export function BulkEnrollDialog({ open, onClose }: BulkEnrollDialogProps) {
  const { data: studentsRes, isLoading: studentsLoading } = useQuery(
    usersQueryOptions.students.list()
  )
  const { data: offeringsRes, isLoading: offeringsLoading } = useQuery(
    courseOfferingQueryOptions.list()
  )
  const { data: calendar } = useAcademicCalendar()
  const bulkEnrollMutation = useBulkEnroll()

  const students = studentsRes?.data ?? []
  const offerings = offeringsRes?.data ?? []
  const semesters = calendar?.semesters ?? []
  const offeringLabel = (offeringId: number) => {
    const o = offerings.find((x) => x.id === offeringId)
    return o
      ? `${o.course_code} — ${o.course_title}`
      : `Offering #${offeringId}`
  }

  const [studentId, setStudentId] = useState<number | null>(null)
  const [semesterId, setSemesterId] = useState<number | null>(null)
  const [selectedOfferingIds, setSelectedOfferingIds] = useState<number[]>([])
  const [result, setResult] = useState<BulkEnrollResult | null>(null)

  const toggleOffering = (id: number) =>
    setSelectedOfferingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const canSubmit =
    studentId !== null && semesterId !== null && selectedOfferingIds.length > 0

  const handleSubmit = async () => {
    if (!studentId || !semesterId) return
    setResult(null)
    let res: BulkEnrollResult
    try {
      res = await bulkEnrollMutation.mutateAsync({
        studentId,
        offeringIds: selectedOfferingIds,
        semesterId,
      })
    } catch {
      // Whole-request failure — shown inline from the mutation's error below.
      return
    }
    setResult(res)
    if (res.errors.length === 0) {
      setSelectedOfferingIds([])
    }
  }

  const handleClose = () => {
    setResult(null)
    setSelectedOfferingIds([])
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk Enroll"
      subtitle="Enroll one student into multiple course offerings"
      size="lg"
    >
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Student</Label>
            <Select
              value={studentId ? String(studentId) : undefined}
              onValueChange={(v) => setStudentId(Number(v))}
              disabled={studentsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={studentsLoading ? "Loading…" : "Select student"}
                />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.matric_number} — {s.user.first_name} {s.user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Semester</Label>
            <Select
              value={semesterId ? String(semesterId) : undefined}
              onValueChange={(v) => setSemesterId(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">
            Course Offerings ({selectedOfferingIds.length} selected)
          </Label>
          <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {offeringsLoading ? (
              <div className="p-4 text-xs text-muted-foreground">
                Loading offerings…
              </div>
            ) : (
              offerings.map((o) => {
                const selected = selectedOfferingIds.includes(o.id)
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleOffering(o.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition hover:bg-muted/40",
                      selected && "bg-primary/5"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      )}
                    >
                      {selected && <Check size={10} />}
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      {o.course_code}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {o.course_title}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {bulkEnrollMutation.isError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive dark:border-destructive/40"
          >
            {bulkEnrollMutation.error?.message ?? "Bulk enrollment failed."}
          </p>
        )}

        {result && (
          <div
            role="status"
            className="space-y-2 rounded-xl border border-border p-3 text-xs"
          >
            <p className="font-medium text-emerald-600 dark:text-emerald-400">
              {result.enrolled.length} enrolled successfully.
              {result.enrolled.length > 0 && (
                <span className="block font-normal text-muted-foreground">
                  {ENROLLMENT_INVOICE_NOTE}
                </span>
              )}
            </p>
            {result.errors.length > 0 && (
              <ul className="space-y-1.5">
                {result.errors.map((e) => (
                  <li
                    key={e.offeringId}
                    className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-amber-700 dark:text-amber-400"
                  >
                    <span className="font-medium">
                      {offeringLabel(e.offeringId)}
                    </span>
                    {e.code && (
                      <span className="ml-1.5 rounded bg-amber-500/15 px-1 py-px font-mono text-[10px]">
                        {e.code}
                      </span>
                    )}
                    <span className="block">
                      {enrollmentErrorMessage(e.code, e.message)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={bulkEnrollMutation.isPending}
          >
            Close
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || bulkEnrollMutation.isPending}
            className="min-w-28 gap-2"
          >
            {bulkEnrollMutation.isPending && (
              <Loader2 size={13} className="animate-spin" />
            )}
            Enroll All
          </Button>
        </div>
      </div>
    </Modal>
  )
}
