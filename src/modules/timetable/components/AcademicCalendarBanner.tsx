"use client"

import { useEffect, useState } from "react"
import { BookOpen, GraduationCap } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAcademicCalendar, useSessions } from "../hooks/useAcademicCalendar"
import { useTimetableUIStore } from "../store/useTimetableUIStore"

export function AcademicCalendarBanner() {
  const { data, isLoading } = useAcademicCalendar()
  const { data: sessions } = useSessions()
  const [selectedAcademicYearOverride, setSelectedAcademicYearOverride] =
    useState<string | null>(null)
  const { selectedSemesterId, setSelectedSemesterId } = useTimetableUIStore()

  // Real sessions list (GET /academic-calendar/sessions) — previously this
  // synthesized "previous/next" year labels via regex on the current
  // session's name, which don't correspond to real sessions and would
  // silently show nothing if selected.
  const academicYearOptions =
    sessions?.map((s) => s.name) ??
    (data?.session?.name ? [data.session.name] : [])
  // Defaults to the current session until the user picks a different one —
  // derived directly from render rather than synced via an effect.
  const selectedAcademicYear =
    selectedAcademicYearOverride ?? data?.session?.name ?? ""

  useEffect(() => {
    const activeSemester = data?.currentSemester
    if (!activeSemester || selectedSemesterId) return
    setSelectedSemesterId(activeSemester.id)
  }, [data?.currentSemester, selectedSemesterId, setSelectedSemesterId])

  if (isLoading) {
    return <Skeleton className="h-14 w-full rounded-xl" />
  }

  if (!data) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <GraduationCap size={15} className="text-primary" />
          Academic Year & Semester
        </span>

        <div className="hidden h-4 w-px bg-border sm:block" />
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <BookOpen size={13} />
          Select current academic year and semester
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-55">
          <Select
            value={selectedAcademicYear}
            onValueChange={setSelectedAcademicYearOverride}
          >
            <SelectTrigger className="w-full justify-between bg-background">
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              {academicYearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-48">
          <Select
            value={selectedSemesterId ? String(selectedSemesterId) : "all"}
            onValueChange={(value) =>
              setSelectedSemesterId(value === "all" ? null : Number(value))
            }
          >
            <SelectTrigger className="w-full justify-between bg-background">
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All semesters</SelectItem>
              {(data?.semesters ?? []).map((semester) => (
                <SelectItem key={semester.id} value={String(semester.id)}>
                  {semester.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
