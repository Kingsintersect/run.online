"use client"

import { useEffect, useState } from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  admissionCycleSchema,
  type AdmissionCycleFormValues,
} from "@/schemas/school.schema"
import type { AdmissionCycle, AcademicSession } from "@/types/school"

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
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Plus } from "lucide-react"

interface AdmissionCycleFormProps {
  sessions: AcademicSession[]
  editingCycle?: AdmissionCycle | null
  isPending: boolean
  onSubmit: (data: AdmissionCycleFormValues) => void
  onCancel: () => void
  canManage?: boolean // Add this
}

export function AdmissionCycleForm({
  sessions,
  editingCycle,
  isPending,
  onSubmit,
  onCancel,
}: AdmissionCycleFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<AdmissionCycleFormValues>({
    resolver: zodResolver(admissionCycleSchema),
    defaultValues: editingCycle
      ? {
          academic_session_id: String(editingCycle.academic_session_id),
          application_start_date: editingCycle.application_start_date,
          application_end_date: editingCycle.application_end_date,
          late_application_allowed: editingCycle.late_application_allowed,
          late_application_fee: editingCycle.late_application_fee,
          max_applications: editingCycle.max_applications,
          require_documents: editingCycle.require_documents,
          required_documents: editingCycle.required_documents,
          notification_email: editingCycle.notification_email,
          instructions: editingCycle.instructions,
        }
      : {
          academic_session_id: "",
          application_start_date: "",
          application_end_date: "",
          late_application_allowed: false,
          late_application_fee: 0,
          max_applications: 0,
          require_documents: true,
          required_documents: [],
          notification_email: "",
          instructions: "",
        },
  })

  const [noDeadline, setNoDeadline] = useState(
    editingCycle ? !editingCycle.application_end_date : false
  )
  const [newDoc, setNewDoc] = useState("")
  const lateAllowed = useWatch({ control, name: "late_application_allowed" })
  const requireDocs = useWatch({ control, name: "require_documents" })
  const requiredDocuments = useWatch({ control, name: "required_documents" })

  useEffect(() => {
    if (noDeadline) {
      setValue("application_end_date", "")
    }
  }, [noDeadline, setValue])

  const addDocument = () => {
    const trimmed = newDoc.trim()
    if (!trimmed || requiredDocuments.includes(trimmed)) return
    setValue("required_documents", [...requiredDocuments, trimmed])
    setNewDoc("")
  }

  const removeDocument = (doc: string) => {
    setValue(
      "required_documents",
      requiredDocuments.filter((d) => d !== doc)
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {editingCycle ? "Edit Admission Cycle" : "Create Admission Cycle"}
        </CardTitle>
        <CardDescription>
          Configure application dates, requirements, and settings for an
          admission window.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ─── Session & Dates ─────────────────── */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Application Window
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="academic_session_id">Academic Session</Label>
              <select
                id="academic_session_id"
                {...register("academic_session_id")}
                aria-invalid={!!errors.academic_session_id}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-invalid:border-destructive"
              >
                <option value="">Select session</option>
                {sessions
                  ?.sort(
                    (a, b) =>
                      new Date(b.startDate).getTime() -
                      new Date(a.startDate).getTime()
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isActive ? "(Active)" : ""}
                    </option>
                  ))}
              </select>
              {errors.academic_session_id && (
                <p className="text-sm text-destructive">
                  {errors.academic_session_id.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="application_start_date">Start Date</Label>
              <Input
                id="application_start_date"
                type="date"
                aria-invalid={!!errors.application_start_date}
                {...register("application_start_date")}
              />
              {errors.application_start_date && (
                <p className="text-sm text-destructive">
                  {errors.application_start_date.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="application_end_date">End Date</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={noDeadline}
                    onChange={(e) => setNoDeadline(e.target.checked)}
                    className="size-3.5 rounded border-input"
                  />
                  No deadline
                </label>
              </div>
              <Input
                id="application_end_date"
                type="date"
                disabled={noDeadline}
                aria-invalid={!!errors.application_end_date}
                {...register("application_end_date")}
              />
              {noDeadline && (
                <p className="text-xs text-muted-foreground">
                  Applications will remain open indefinitely.
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* ─── Capacity & Late Applications ────── */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Capacity & Late Applications
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="max_applications">Max Applications</Label>
              <Input
                id="max_applications"
                type="number"
                min={0}
                placeholder="0 = Unlimited"
                aria-invalid={!!errors.max_applications}
                {...register("max_applications", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Set to 0 for unlimited applications.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Late Applications</Label>
              <div className="flex items-center gap-3">
                <Controller
                  name="late_application_allowed"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  {lateAllowed ? "Allowed" : "Not allowed"}
                </span>
              </div>
            </div>

            {lateAllowed && (
              <div className="space-y-1.5">
                <Label htmlFor="late_application_fee">Late Fee (₦)</Label>
                <Input
                  id="late_application_fee"
                  type="number"
                  min={0}
                  step={500}
                  placeholder="5000"
                  aria-invalid={!!errors.late_application_fee}
                  {...register("late_application_fee", { valueAsNumber: true })}
                />
                {errors.late_application_fee && (
                  <p className="text-sm text-destructive">
                    {errors.late_application_fee.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* ─── Required Documents ─────────────── */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Required Documents
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Controller
                name="require_documents"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <span className="text-sm text-muted-foreground">
                {requireDocs
                  ? "Applicants must upload documents"
                  : "No documents required"}
              </span>
            </div>

            {requireDocs && (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., O'Level Result"
                    value={newDoc}
                    onChange={(e) => setNewDoc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addDocument()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addDocument}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                {requiredDocuments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {requiredDocuments.map((doc) => (
                      <Badge
                        key={doc}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {doc}
                        <button
                          type="button"
                          onClick={() => removeDocument(doc)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* ─── Notification & Instructions ────── */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Communication
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="notification_email">Notification Email</Label>
              <Input
                id="notification_email"
                type="email"
                placeholder="admissions@university.edu.ng"
                aria-invalid={!!errors.notification_email}
                {...register("notification_email")}
              />
              {errors.notification_email && (
                <p className="text-sm text-destructive">
                  {errors.notification_email.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="instructions">Applicant Instructions</Label>
              <textarea
                id="instructions"
                rows={3}
                placeholder="Instructions shown to applicants on the admission portal..."
                {...register("instructions")}
                className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ─── Actions ────────────────────────── */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isPending}>
            {isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            {editingCycle ? "Save Changes" : "Create Cycle"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
