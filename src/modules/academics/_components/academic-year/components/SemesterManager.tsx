"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  useSemesters,
  useCreateSemester,
  useActivateSemester,
} from "@/hooks/useSemesters"
import type { CreateSemesterPayload } from "@/types/school"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyState } from "./EmptyState"
import { Layers, Plus, Power, ArrowLeft, Loader2 } from "lucide-react"
import { useAcademicSessionSetupStore } from "@/store/dashboard/academicSessionSetupStore"
import { SemesterFormValues, semesterSchema } from "@/schemas/school.schema"

interface SemesterManagerProps {
  canManage?: boolean
}

export function SemesterManager({ canManage = false }: SemesterManagerProps) {
  const { selectedSessionId, selectedSessionName, clearSelectedSession } =
    useAcademicSessionSetupStore()

  const { data: semesters, isLoading } = useSemesters(selectedSessionId)
  const createSemester = useCreateSemester()
  const activateSemester = useActivateSemester(selectedSessionId!)

  const [showForm, setShowForm] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterSchema),
    defaultValues: {
      name: "",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      registrationStart: "",
      registrationEnd: "",
    },
  })

  const onSubmit = async (data: SemesterFormValues) => {
    if (!selectedSessionId) return
    const payload: CreateSemesterPayload = {
      academicSessionId: selectedSessionId,
      name: data.name,
      isActive: false,
      startDate: data.startDate,
      endDate: data.endDate,
      registrationStart: data.registrationStart || undefined,
      registrationEnd: data.registrationEnd || undefined,
    }
    await createSemester.mutateAsync(payload)
    reset({
      name: "",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      registrationStart: "",
      registrationEnd: "",
    })
    setShowForm(false)
  }

  // If user doesn't have permission, show nothing
  if (!canManage) return null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const sorted = [...(semesters ?? [])].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearSelectedSession}
            title="Back to sessions"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Semesters</h2>
            <p className="text-sm text-muted-foreground">
              Session:{" "}
              <span className="font-medium text-foreground">
                {selectedSessionName}
              </span>
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowForm(!showForm)}>
              <Plus className="size-4" data-icon="inline-start" />
              Add Semester
            </Button>
          </div>
        )}
      </div>

      {/* Create Form - only if can manage */}
      {showForm && canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Add Semester</CardTitle>
            <CardDescription>
              Define a semester period, and optionally its registration window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="name">Semester Name</Label>
              <Input
                id="name"
                placeholder="First Semester"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  aria-invalid={!!errors.startDate}
                  {...register("startDate")}
                />
                {errors.startDate && (
                  <p className="text-sm text-destructive">
                    {errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  aria-invalid={!!errors.endDate}
                  {...register("endDate")}
                />
                {errors.endDate && (
                  <p className="text-sm text-destructive">
                    {errors.endDate.message}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="registrationStart">
                  Registration Opens{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="registrationStart"
                  type="date"
                  {...register("registrationStart")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registrationEnd">
                  Registration Closes{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="registrationEnd"
                  type="date"
                  {...register("registrationEnd")}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={createSemester.isPending}
              >
                {createSemester.isPending && (
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                  />
                )}
                Add Semester
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Semester List - action buttons only if can manage */}
      {!sorted.length && !showForm ? (
        <EmptyState
          icon={Layers}
          title="No semesters defined"
          description="Add semesters to this session (e.g., 1st Semester, 2nd Semester)."
          action={
            canManage ? (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="size-4" data-icon="inline-start" />
                Add First Semester
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((semester) => (
            <Card key={semester.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Layers className="size-3.5" />
                  </span>
                  {semester.name}
                </CardTitle>
                <CardDescription>
                  {new Date(semester.startDate).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  –{" "}
                  {new Date(semester.endDate).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  —{" "}
                  {semester.isActive ? (
                    <span className="font-medium text-primary">Active</span>
                  ) : (
                    "Inactive"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {canManage && !semester.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => activateSemester.mutate(semester.id)}
                    >
                      <Power className="size-3.5" data-icon="inline-start" />
                      Activate
                    </Button>
                  )}
                  {semester.isActive && (
                    <span className="flex-1 text-center text-xs font-medium text-primary">
                      ● Currently Active
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
