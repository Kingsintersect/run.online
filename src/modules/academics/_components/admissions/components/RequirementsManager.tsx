"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  admissionRequirementSchema,
  type AdmissionRequirementFormValues,
} from "@/schemas/school.schema"
import {
  useAdmissionRequirements,
  useCreateAdmissionRequirement,
  useDeleteAdmissionRequirement,
} from "../hooks/useAdmissionRequirements"

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
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, X, GraduationCap, BookOpen } from "lucide-react"
import { EmptyState } from "./EmptyState"
import type { AdmissionRequirement, LegacyProgramSummary } from "@/types/school"

interface RequirementsManagerProps {
  cycleId: number
  programs: LegacyProgramSummary[]
  canManage?: boolean
}

export function RequirementsManager({
  cycleId,
  programs,
  canManage = false,
}: RequirementsManagerProps) {
  const { data: requirements, isLoading } = useAdmissionRequirements(cycleId)
  const createReq = useCreateAdmissionRequirement()
  const deleteReq = useDeleteAdmissionRequirement(cycleId)

  const [showForm, setShowForm] = useState(false)
  const [newSubject, setNewSubject] = useState("")

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<AdmissionRequirementFormValues>({
    resolver: zodResolver(admissionRequirementSchema),
    defaultValues: {
      admission_cycle_id: String(cycleId),
      program_id: "",
      min_age: 0,
      max_age: 0,
      min_credits: 5,
      required_subjects: [],
      description: "",
    },
  })

  const requiredSubjects: string[] = useWatch({
    control,
    name: "required_subjects",
  })

  const addSubject = () => {
    const trimmed = newSubject.trim()
    if (!trimmed || requiredSubjects.includes(trimmed)) return
    setValue("required_subjects", [...requiredSubjects, trimmed])
    setNewSubject("")
  }

  const removeSubject = (subject: string) => {
    setValue(
      "required_subjects",
      requiredSubjects.filter((s) => s !== subject)
    )
  }

  const onSubmit = async (data: AdmissionRequirementFormValues) => {
    await createReq.mutateAsync({
      ...data,
      admission_cycle_id: cycleId,
    })
    reset()
    setShowForm(false)
  }

  const getProgramName = (programId: string) => {
    if (!programId) return "All Programs"
    return programs.find((p) => p.id === programId)?.name ?? programId
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  // If user doesn't have permission, show read-only view (no add/delete buttons)
  const readOnly = !canManage

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Entry Requirements
          </h3>
          <p className="text-sm text-muted-foreground">
            Define minimum requirements per program or for all programs.
          </p>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="size-3.5" data-icon="inline-start" />
            Add Requirement
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && !readOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Requirement</CardTitle>
            <CardDescription>
              Set minimum qualifications for applicants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="req-program">Program</Label>
                <select
                  id="req-program"
                  {...register("program_id")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <option value="">All Programs</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="req-credits">
                  Minimum O&apos;Level Credits
                </Label>
                <Input
                  id="req-credits"
                  type="number"
                  min={0}
                  max={9}
                  {...register("min_credits", { valueAsNumber: true })}
                  aria-invalid={!!errors.min_credits}
                />
                {errors.min_credits && (
                  <p className="text-sm text-destructive">
                    {errors.min_credits.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="req-min-age">Minimum Age</Label>
                <Input
                  id="req-min-age"
                  type="number"
                  min={0}
                  placeholder="0 = No minimum"
                  {...register("min_age", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="req-max-age">Maximum Age</Label>
                <Input
                  id="req-max-age"
                  type="number"
                  min={0}
                  placeholder="0 = No maximum"
                  {...register("max_age", { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Required subjects */}
            <div className="space-y-1.5">
              <Label>Required Subjects</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Mathematics"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addSubject()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addSubject}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              {requiredSubjects.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {requiredSubjects.map((subj) => (
                    <Badge
                      key={subj}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {subj}
                      <button
                        type="button"
                        onClick={() => removeSubject(subj)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-desc">Description</Label>
              <Input
                id="req-desc"
                placeholder="e.g., Must have at least 5 credits including..."
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={createReq.isPending}
              >
                {createReq.isPending && (
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                  />
                )}
                Save Requirement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirements list */}
      {!requirements?.length && !showForm ? (
        <EmptyState
          icon={BookOpen}
          title="No requirements yet"
          description="Add entry requirements for this admission cycle."
          action={
            !readOnly ? (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="size-3.5" data-icon="inline-start" />
                Add First Requirement
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {requirements?.map((req: AdmissionRequirement) => (
            <Card key={req.id}>
              <CardContent className="flex items-start gap-4 pt-5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <GraduationCap className="size-4 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getProgramName(req.program_id)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {req.description}
                      </p>
                    </div>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteReq.mutate(req.id)}
                        disabled={deleteReq.isPending}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Min Credits: <strong>{req.min_credits}</strong>
                    </span>
                    {req.min_age > 0 && (
                      <span>
                        Min Age: <strong>{req.min_age}</strong>
                      </span>
                    )}
                    {req.max_age > 0 && (
                      <span>
                        Max Age: <strong>{req.max_age}</strong>
                      </span>
                    )}
                  </div>
                  {req.required_subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {req.required_subjects.map((subj: string) => (
                        <Badge key={subj} variant="outline" className="text-xs">
                          {subj}
                        </Badge>
                      ))}
                    </div>
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
