"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  addPrerequisiteSchema,
  type AddPrerequisiteFormValues,
} from "@/schemas/school.schema"
import { useCourses } from "@/hooks/useCourseManagement"
import {
  useCoursePrerequisites,
  useAddPrerequisite,
  useRemovePrerequisite,
} from "@/hooks/useCoursePrerequisites"
import type { Course } from "@/types/school"
import Combobox from "@/components/custom/Combobox"
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
import { Link2, Plus, Trash2, Loader2, GraduationCap } from "lucide-react"

interface PrerequisiteManagerProps {
  canManage?: boolean
}

export function PrerequisiteManager({
  canManage = false,
}: PrerequisiteManagerProps) {
  const { data: coursesData, isLoading: coursesLoading } = useCourses()
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  const courses = useMemo(() => coursesData?.data ?? [], [coursesData])
  const courseOptions = useMemo(
    () =>
      [...courses]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((c) => ({ value: c.id, label: c.code, description: c.title })),
    [courses]
  )

  if (coursesLoading) {
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
          Course Prerequisites
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a course to view and manage which other courses must be taken
          first.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Select Course
            </span>
          </div>
          <Combobox
            options={courseOptions}
            value={selectedCourse?.id ?? null}
            onChange={(v) => {
              const course = courses.find((c) => c.id === Number(v))
              setSelectedCourse(course ?? null)
            }}
            placeholder="Search by course code or title…"
            searchPlaceholder="Type course code or title…"
            renderOption={(option) => (
              <div>
                <span className="font-mono text-xs font-semibold">
                  {option.label}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {selectedCourse ? (
          <motion.div
            key={selectedCourse.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <PrerequisiteList
              course={selectedCourse}
              allCourses={courses}
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
              title="No course selected"
              description="Select a course above to view and manage its prerequisites."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PrerequisiteList({
  course,
  allCourses,
  canManage,
}: {
  course: Course
  allCourses: Course[]
  canManage: boolean
}) {
  const { data, isLoading } = useCoursePrerequisites(course.id)
  const addMut = useAddPrerequisite()
  const removeMut = useRemovePrerequisite()
  const [showAddModal, setShowAddModal] = useState(false)

  const prerequisites = useMemo(() => data?.data ?? [], [data])
  const prerequisiteIds = useMemo(
    () => new Set(prerequisites.map((p) => p.id)),
    [prerequisites]
  )
  const availableCourses = useMemo(
    () =>
      allCourses
        .filter((c) => c.id !== course.id && !prerequisiteIds.has(c.id))
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((c) => ({ value: c.id, label: c.code, description: c.title })),
    [allCourses, course.id, prerequisiteIds]
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPrerequisiteFormValues>({
    resolver: zodResolver(addPrerequisiteSchema),
    defaultValues: { prerequisite_id: 0 },
  })

  const onAdd = async (values: AddPrerequisiteFormValues) => {
    await addMut.mutateAsync({
      courseId: course.id,
      prerequisiteId: values.prerequisite_id,
    })
    reset({ prerequisite_id: 0 })
    setShowAddModal(false)
  }

  const onRemove = async (prerequisiteId: number) => {
    await removeMut.mutateAsync({ courseId: course.id, prerequisiteId })
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
            <span className="font-mono">{course.code}</span>
            <span className="text-sm font-normal text-muted-foreground">
              — {course.title}
            </span>
          </CardTitle>
          <CardDescription>
            {course.credit_units} credit{course.credit_units !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {prerequisites.length} prerequisite
          {prerequisites.length !== 1 ? "s" : ""}
        </p>
        {canManage && (
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            disabled={availableCourses.length === 0}
          >
            <Plus className="size-4" data-icon="inline-start" />
            Add Prerequisite
          </Button>
        )}
      </div>

      {prerequisites.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No prerequisites"
          description="This course has no prerequisite requirements."
          action={
            canManage ? (
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="size-4" data-icon="inline-start" />
                Add Prerequisite
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {prerequisites.map((p, index) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {p.code.slice(0, 3)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        <span className="font-mono">{p.code}</span> — {p.title}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(p.id)}
                      disabled={removeMut.isPending}
                      className="size-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          reset({ prerequisite_id: 0 })
        }}
        title="Add Prerequisite"
        subtitle={`${course.code} — ${course.title}`}
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false)
                reset({ prerequisite_id: 0 })
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit(onAdd)} disabled={addMut.isPending}>
              {addMut.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label>Prerequisite Course</Label>
          <Controller
            control={control}
            name="prerequisite_id"
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
          {errors.prerequisite_id && (
            <p className="text-sm text-destructive">
              {errors.prerequisite_id.message}
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
