"use client"

import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  programCourseAssignSchema,
  type ProgramCourseAssignFormValues,
} from "@/schemas/school.schema"
import {
  useCourses,
  useProgramCoursesByProgram,
  useAssignCourseToProgram,
  useRemoveProgramCourse,
} from "@/hooks/useCourseManagement"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import type { ProgramCourse } from "@/types/school"
import Combobox from "@/components/custom/Combobox"
import StatusBadge from "@/components/custom/StatusBadge"
import Modal from "@/components/custom/Modal"
import { EmptyState } from "./EmptyState"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Link2,
  Plus,
  Trash2,
  Loader2,
  GraduationCap,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"

interface ProgramCourseManagerProps {
  canManage?: boolean
}

export function ProgramCourseManager({
  canManage = false,
}: ProgramCourseManagerProps) {
  const { data: programsData, isLoading: programsLoading } = useAllPrograms()
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(
    null
  )

  const programs = useMemo(() => programsData?.data ?? [], [programsData])
  const programOptions = useMemo(
    () =>
      [...programs]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ value: p.id, label: p.name, description: p.code })),
    [programs]
  )
  const selectedProgram =
    programs.find((p) => p.id === selectedProgramId) ?? null

  if (programsLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-20"
      >
        <Loader2 className="size-6 animate-spin text-primary" />
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Program Mapping
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a program to view and manage its assigned courses.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="mb-3 flex items-center gap-2">
              <GraduationCap className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Select Program
              </span>
            </div>
            <Combobox
              options={programOptions}
              value={selectedProgramId}
              onChange={(v) => setSelectedProgramId(Number(v))}
              placeholder="Search by program name or code…"
              searchPlaceholder="Type program name or code…"
              renderOption={(option) => (
                <div>
                  <span className="text-xs font-semibold">{option.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              )}
            />
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence mode="wait">
        {selectedProgram ? (
          <motion.div
            key={selectedProgram.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <ProgramAssignments
              programId={selectedProgram.id}
              programName={selectedProgram.name}
              programCode={selectedProgram.code}
              canManage={canManage}
            />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EmptyState
              icon={Link2}
              title="No program selected"
              description="Select a program above to view and manage which courses belong to it."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Sub-component for a program's assigned courses
function ProgramAssignments({
  programId,
  programName,
  programCode,
  canManage,
}: {
  programId: number
  programName: string
  programCode: string
  canManage: boolean
}) {
  const { data, isLoading } = useProgramCoursesByProgram(programId)
  const { data: allCoursesData } = useCourses()
  const assignMut = useAssignCourseToProgram()
  const removeMut = useRemoveProgramCourse()

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const mappings = useMemo(() => data?.data ?? [], [data])
  const allCourses = useMemo(() => allCoursesData?.data ?? [], [allCoursesData])
  const assignedCourseIds = useMemo(
    () => new Set(mappings.map((m) => m.id)),
    [mappings]
  )
  const availableCourses = useMemo(
    () =>
      allCourses
        .filter((c) => !assignedCourseIds.has(c.id))
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((c) => ({ value: c.id, label: c.code, description: c.title })),
    [allCourses, assignedCourseIds]
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProgramCourseAssignFormValues>({
    resolver: zodResolver(programCourseAssignSchema),
    defaultValues: { course_id: 0, is_required: true },
  })

  const onAssign = async (values: ProgramCourseAssignFormValues) => {
    await assignMut.mutateAsync({
      program_id: programId,
      course_id: values.course_id,
      is_required: values.is_required,
    })
    reset({ course_id: 0, is_required: true })
    setShowAssignModal(false)
  }

  // No dedicated "update mapping" endpoint exists — toggling isRequired is a
  // real remove-then-reassign against the two endpoints that do exist.
  const toggleRequired = async (mapping: ProgramCourse) => {
    setTogglingId(mapping.id)
    try {
      await removeMut.mutateAsync({ programId, courseId: mapping.id })
      await assignMut.mutateAsync({
        program_id: programId,
        course_id: mapping.id,
        is_required: !mapping.is_required,
      })
    } finally {
      setTogglingId(null)
    }
  }

  const removeMapping = async (courseId: number) => {
    await removeMut.mutateAsync({ programId, courseId })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="size-4 text-primary" />
            <span>{programName}</span>
            <StatusBadge label={programCode} variant="info" />
          </CardTitle>
          <CardDescription>
            {mappings.length} course{mappings.length !== 1 ? "s" : ""} mapped to
            this program
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Assigned Courses</p>
        {canManage && (
          <Button
            size="sm"
            onClick={() => setShowAssignModal(true)}
            disabled={availableCourses.length === 0}
          >
            <Plus className="size-4" data-icon="inline-start" />
            Assign Course
          </Button>
        )}
      </div>

      {mappings.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No courses assigned"
          description="Assign one or more courses to include them in this program's curriculum."
          action={
            canManage ? (
              <Button size="sm" onClick={() => setShowAssignModal(true)}>
                <Plus className="size-4" data-icon="inline-start" />
                Assign Course
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {mappings.map((mapping, index) => (
            <motion.div
              key={mapping.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {mapping.code.slice(0, 3)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        <span className="font-mono">{mapping.code}</span> —{" "}
                        {mapping.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StatusBadge
                          label={mapping.is_required ? "Required" : "Elective"}
                          variant={mapping.is_required ? "success" : "orange"}
                          dot
                        />
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRequired(mapping)}
                        title={
                          mapping.is_required
                            ? "Make elective"
                            : "Make required"
                        }
                        disabled={togglingId === mapping.id}
                        className="size-8"
                      >
                        {togglingId === mapping.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : mapping.is_required ? (
                          <ToggleRight className="size-4 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="size-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMapping(mapping.id)}
                        title="Remove from program"
                        disabled={removeMut.isPending}
                        className="size-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      <Modal
        open={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          reset({ course_id: 0, is_required: true })
        }}
        title="Assign Course to Program"
        subtitle={`${programName} (${programCode})`}
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignModal(false)
                reset({ course_id: 0, is_required: true })
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onAssign)}
              disabled={assignMut.isPending}
            >
              {assignMut.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Assign
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Course</Label>
            <Controller
              control={control}
              name="course_id"
              render={({ field }) => (
                <Combobox
                  options={availableCourses}
                  value={field.value || null}
                  onChange={(v) => field.onChange(Number(v))}
                  placeholder="Select a course"
                  searchPlaceholder="Search courses…"
                />
              )}
            />
            {errors.course_id && (
              <p className="text-sm text-destructive">
                {errors.course_id.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Requirement</Label>
            <Controller
              control={control}
              name="is_required"
              render={({ field }) => (
                <Select
                  value={field.value ? "required" : "elective"}
                  onValueChange={(v) => field.onChange(v === "required")}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-transparent bg-muted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">
                      Required (Compulsory)
                    </SelectItem>
                    <SelectItem value="elective">
                      Elective (Optional)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
