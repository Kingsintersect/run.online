"use client"

import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useForm, useWatch, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { courseSchema, type CourseFormValues } from "@/schemas/school.schema"
import {
  useCourses,
  useCreateCourse,
  useUpdateCourse,
} from "@/hooks/useCourseManagement"
import { useLevels, useAllDepartments } from "@/hooks/useCourseStructure"
import type { Course, CourseType } from "@/types/school"
import Combobox from "@/components/custom/Combobox"
import StatusBadge from "@/components/custom/StatusBadge"
import { EmptyState } from "./EmptyState"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BookOpen,
  Plus,
  Pencil,
  Loader2,
  Filter,
  GraduationCap,
  X,
} from "lucide-react"

// ── course-type badge mapping ───────────────
const courseTypeBadge: Record<
  CourseType,
  { label: string; variant: "info" | "purple" | "success" | "orange" }
> = {
  GENERAL: { label: "General (GST)", variant: "info" },
  FACULTY: { label: "Faculty", variant: "purple" },
  DEPARTMENTAL: { label: "Departmental", variant: "success" },
  ELECTIVE: { label: "Elective", variant: "orange" },
  SUBJECT: { label: "Subject", variant: "info" },
  RESEARCH_PROJECT: { label: "Research Project", variant: "purple" },
}

interface CourseListProps {
  canManage?: boolean
}

export function CourseList({ canManage = false }: CourseListProps) {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useCourses()
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const { data: levelsData } = useLevels()
  const { data: departmentsData } = useAllDepartments()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [filterLevel, setFilterLevel] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<CourseType | null>(null)

  const courses = useMemo(() => data?.data ?? [], [data])
  const levels = useMemo(() => levelsData?.data ?? [], [levelsData])
  const departments = useMemo(
    () => departmentsData?.data ?? [],
    [departmentsData]
  )

  const levelOptions = useMemo(
    () =>
      [...levels]
        .sort((a, b) => a.numericValue - b.numericValue)
        .map((l) => ({ value: l.id, label: l.name })),
    [levels]
  )

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments]
  )

  const levelName = (levelId: number) =>
    levels.find((l) => l.id === levelId)?.name ?? `Level #${levelId}`
  const departmentName = (departmentId: number | null) =>
    departmentId
      ? (departments.find((d) => d.id === departmentId)?.name ??
        `Dept #${departmentId}`)
      : null

  // Filtered courses (search + filters) — client-side, same pattern as before
  const filteredCourses = useMemo(() => {
    let result = courses
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
      )
    }
    if (filterLevel) {
      result = result.filter((c) => c.level_id === filterLevel)
    }
    if (filterType) {
      result = result.filter((c) => c.course_type === filterType)
    }
    return [...result].sort((a, b) => a.code.localeCompare(b.code))
  }, [courses, search, filterLevel, filterType])

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      code: "",
      title: "",
      description: "",
      credit_units: 3,
      course_type: "DEPARTMENTAL",
      level_id: 0,
      owning_department_id: null,
      syllabus: "",
    },
  })

  const watchCourseType = useWatch({ control, name: "course_type" })

  const onSubmit = async (values: CourseFormValues) => {
    const payload = {
      ...values,
      owning_department_id:
        values.course_type === "GENERAL" ? null : values.owning_department_id,
    }
    if (editingId) {
      await updateCourse.mutateAsync({ id: editingId, payload })
      setEditingId(null)
    } else {
      await createCourse.mutateAsync(payload)
    }
    reset()
    setShowForm(false)
  }

  const startEdit = (course: Course) => {
    setEditingId(course.id)
    reset({
      code: course.code,
      title: course.title,
      description: course.description ?? "",
      credit_units: course.credit_units,
      course_type: course.course_type,
      level_id: course.level_id,
      owning_department_id: course.owning_department_id,
      syllabus: course.syllabus ?? "",
    })
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    reset({
      code: "",
      title: "",
      description: "",
      credit_units: 3,
      course_type: "DEPARTMENTAL",
      level_id: 0,
      owning_department_id: null,
      syllabus: "",
    })
  }

  const clearFilters = () => {
    setFilterLevel(null)
    setFilterType(null)
    setSearch("")
  }

  const hasFilters = filterLevel || filterType || search

  if (isLoading) {
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

  const isPending = createCourse.isPending || updateCourse.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Course Registry
          </h2>
          <p className="text-sm text-muted-foreground">
            {filteredCourses.length} course
            {filteredCourses.length !== 1 ? "s" : ""}
            {hasFilters ? " (filtered)" : ""}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => (showForm ? cancelForm() : setShowForm(true))}>
            <Plus className="size-4" data-icon="inline-start" />
            New Course
          </Button>
        )}
      </div>

      {/* Search + Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search by code or title…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border-transparent bg-muted"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Filter Courses
                </span>
                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-auto h-7 text-xs"
                  >
                    <X className="size-3" data-icon="inline-start" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Combobox
                options={levelOptions}
                value={filterLevel}
                onChange={(v) => setFilterLevel(Number(v))}
                placeholder="All Levels"
                searchPlaceholder="Search levels…"
              />
              <Select
                value={filterType ?? "ALL"}
                onValueChange={(v) =>
                  setFilterType(v === "ALL" ? null : (v as CourseType))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-transparent bg-muted">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="GENERAL">General (GST)</SelectItem>
                  <SelectItem value="FACULTY">Faculty</SelectItem>
                  <SelectItem value="DEPARTMENTAL">Departmental</SelectItem>
                  <SelectItem value="ELECTIVE">Elective</SelectItem>
                  <SelectItem value="SUBJECT">Subject</SelectItem>
                  <SelectItem value="RESEARCH_PROJECT">
                    Research Project
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create / Edit Form - only if canManage */}
      <AnimatePresence>
        {showForm && canManage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)" }}
          >
            <Card className="mx-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto">
              <CardHeader>
                <CardTitle>
                  {editingId ? "Edit Course" : "Create Course"}
                </CardTitle>
                <CardDescription>
                  {editingId
                    ? "Update this course's details below."
                    : "Provide information for the new course."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-12">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="code">Course Code</Label>
                    <Input
                      id="code"
                      placeholder="CSC101"
                      aria-invalid={!!errors.code}
                      {...register("code")}
                    />
                    {errors.code && (
                      <p className="text-sm text-destructive">
                        {errors.code.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="title">Course Title</Label>
                    <Input
                      id="title"
                      placeholder="Introduction to Computer Science"
                      aria-invalid={!!errors.title}
                      {...register("title")}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive">
                        {errors.title.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="credit_units">Credit Units</Label>
                    <Input
                      id="credit_units"
                      type="number"
                      min={1}
                      max={12}
                      aria-invalid={!!errors.credit_units}
                      {...register("credit_units", { valueAsNumber: true })}
                    />
                    {errors.credit_units && (
                      <p className="text-sm text-destructive">
                        {errors.credit_units.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Course Type</Label>
                    <Controller
                      control={control}
                      name="course_type"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-10 w-full rounded-xl border-transparent bg-muted">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GENERAL">
                              General (GST)
                            </SelectItem>
                            <SelectItem value="FACULTY">Faculty</SelectItem>
                            <SelectItem value="DEPARTMENTAL">
                              Departmental
                            </SelectItem>
                            <SelectItem value="ELECTIVE">Elective</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.course_type && (
                      <p className="text-sm text-destructive">
                        {errors.course_type.message}
                      </p>
                    )}
                  </div>
                  {watchCourseType !== "GENERAL" && (
                    <div className="space-y-1.5">
                      <Label>Owning Department</Label>
                      <Controller
                        control={control}
                        name="owning_department_id"
                        render={({ field }) => (
                          <Combobox
                            options={departmentOptions}
                            value={field.value ?? null}
                            onChange={(v) => field.onChange(Number(v))}
                            placeholder="Select department"
                            searchPlaceholder="Search departments…"
                          />
                        )}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Level</Label>
                    <Controller
                      control={control}
                      name="level_id"
                      render={({ field }) => (
                        <Combobox
                          options={levelOptions}
                          value={field.value || null}
                          onChange={(v) => field.onChange(Number(v))}
                          placeholder="Select level"
                          searchPlaceholder="Search levels…"
                        />
                      )}
                    />
                    {errors.level_id && (
                      <p className="text-sm text-destructive">
                        {errors.level_id.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      placeholder="Brief description of the course"
                      {...register("description")}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label htmlFor="syllabus">Syllabus (optional)</Label>
                    <textarea
                      id="syllabus"
                      rows={3}
                      placeholder="Week 1: ... Week 2: ..."
                      {...register("syllabus")}
                      className="flex w-full resize-none rounded-md border border-input bg-muted px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={cancelForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit(onSubmit)} disabled={isPending}>
                    {isPending && (
                      <Loader2
                        className="size-4 animate-spin"
                        data-icon="inline-start"
                      />
                    )}
                    {editingId ? "Save Changes" : "Create Course"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course List - edit button only if canManage */}
      {!filteredCourses.length ? (
        <EmptyState
          icon={BookOpen}
          title={hasFilters ? "No matching courses" : "No courses yet"}
          description={
            hasFilters
              ? "Try adjusting your filters to find more courses."
              : "Create your first course to start building the curriculum."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : canManage ? (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="size-4" data-icon="inline-start" />
                Create First Course
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
            >
              <Card className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-primary" />
                    <span className="font-mono text-sm">{course.code}</span>
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.title}
                  </CardDescription>
                  <CardAction>
                    <StatusBadge
                      label={courseTypeBadge[course.course_type].label}
                      variant={courseTypeBadge[course.course_type].variant}
                      dot
                    />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">
                        {course.credit_units}
                      </span>{" "}
                      credit unit{course.credit_units !== 1 ? "s" : ""}
                    </p>
                    <p>{levelName(course.level_id)}</p>
                    {departmentName(course.owning_department_id) && (
                      <p>Dept: {departmentName(course.owning_department_id)}</p>
                    )}
                  </div>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => startEdit(course)}
                    >
                      <Pencil className="size-3.5" data-icon="inline-start" />
                      Edit
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
