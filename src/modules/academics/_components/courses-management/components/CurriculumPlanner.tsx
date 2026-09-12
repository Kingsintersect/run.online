"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { GraduationCap, Layers, Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  useCurriculumPrograms,
  useCurriculumProgramCourses,
  useUpdateCourseCurriculumSemester,
} from "../../../hooks/useCurriculumPlanner"
import { EmptyState } from "./EmptyState"
import type { CurriculumCourse } from "@/services/curriculumApi"

const TERM_OPTIONS: { value: string; label: string }[] = [
  { value: "unassigned", label: "Unassigned" },
  { value: "1", label: "First Semester" },
  { value: "2", label: "Second Semester" },
]

interface CurriculumPlannerProps {
  canManage?: boolean
}

export function CurriculumPlanner({
  canManage = false,
}: CurriculumPlannerProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(
    null
  )

  const { data: programs, isLoading: programsLoading } = useCurriculumPrograms()
  const { data: courses, isLoading: coursesLoading } =
    useCurriculumProgramCourses(selectedProgramId)
  const updateSemester = useUpdateCourseCurriculumSemester(selectedProgramId)

  // Level.name isn't shown here on purpose: the Level catalog itself is
  // still mock everywhere in this app (a separate, still-pending rebuild —
  // see the Academic module audit), and its ids don't correspond to real
  // Course.levelId values, so any name lookup would be a coincidental
  // guess rather than a real mapping. Showing the raw real id is honest;
  // it becomes a name automatically once Level is wired for real, with no
  // change needed here.

  // Group: levelId -> curriculumSemester ("1" | "2" | "unassigned") -> courses
  const grouped = useMemo(() => {
    const byLevel = new Map<number, Map<string, CurriculumCourse[]>>()
    for (const course of courses ?? []) {
      const termKey = course.curriculumSemester
        ? String(course.curriculumSemester)
        : "unassigned"
      if (!byLevel.has(course.levelId)) byLevel.set(course.levelId, new Map())
      const byTerm = byLevel.get(course.levelId)!
      if (!byTerm.has(termKey)) byTerm.set(termKey, [])
      byTerm.get(termKey)!.push(course)
    }
    return [...byLevel.entries()].sort(([a], [b]) => a - b)
  }, [courses])

  const handleTermChange = async (courseId: number, value: string) => {
    const curriculumSemester =
      value === "unassigned" ? null : (Number(value) as 1 | 2)
    try {
      await updateSemester.mutateAsync({ courseId, curriculumSemester })
      toast.success("Curriculum term updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update term")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Program Curriculum</CardTitle>
          <CardDescription>
            Pick a program to see its courses grouped by level and by term
            (First/Second Semester) within that level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="curriculum-program">Program</Label>
            <Select
              value={selectedProgramId?.toString() ?? ""}
              onValueChange={(v) => setSelectedProgramId(Number(v))}
            >
              <SelectTrigger id="curriculum-program">
                <SelectValue
                  placeholder={
                    programsLoading ? "Loading programs…" : "Select a program"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {programs?.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.code} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedProgramId ? (
        <EmptyState
          icon={GraduationCap}
          title="Select a program"
          description="Choose a program above to view and plan its curriculum."
        />
      ) : coursesLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No courses mapped to this program yet"
          description="Assign courses to this program from the Program Mapping tab first."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([levelId, byTerm]) => (
            <motion.div
              key={levelId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    Level #{levelId}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {["1", "2", "unassigned"].map((termKey) => {
                    const termCourses = byTerm.get(termKey) ?? []
                    if (termCourses.length === 0 && termKey === "unassigned")
                      return null
                    const termLabel =
                      TERM_OPTIONS.find((t) => t.value === termKey)?.label ??
                      termKey
                    return (
                      <div key={termKey} className="space-y-2">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {termLabel} ({termCourses.length})
                        </p>
                        {termCourses.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No courses yet.
                          </p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {termCourses.map((course) => (
                              <div
                                key={course.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {course.code}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {course.title}
                                  </p>
                                </div>
                                {canManage && (
                                  <Select
                                    value={
                                      course.curriculumSemester
                                        ? String(course.curriculumSemester)
                                        : "unassigned"
                                    }
                                    onValueChange={(v) =>
                                      handleTermChange(course.id, v)
                                    }
                                    disabled={updateSemester.isPending}
                                  >
                                    <SelectTrigger className="h-8 w-28 shrink-0 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TERM_OPTIONS.map((t) => (
                                        <SelectItem
                                          key={t.value}
                                          value={t.value}
                                        >
                                          {t.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
