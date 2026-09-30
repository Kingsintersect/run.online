"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiClientError } from "@/lib/clients/apiClient"
import { useUpdateMyProfile } from "@/hooks/use-my-student-id"
import type { SelfUpdateStudentPayload, Student } from "@/types/users"
import {
  studentSelfProfileSchema,
  type StudentSelfProfileValues,
} from "../schemas"

type FieldKey = keyof StudentSelfProfileValues

// Only the fields a student may change on their own record
// (bruno/user/Students - Update.bru, 2026-09-28). Level, mode of study and
// status are left to the registry and are never sent from here.
const FIELDS: {
  key: FieldKey
  label: string
  placeholder?: string
  type?: "email" | "tel"
}[] = [
  {
    key: "phone_number",
    label: "Phone Number",
    placeholder: "08012345678",
    type: "tel",
  },
  {
    key: "contact_address",
    label: "Contact Address",
    placeholder: "Where you currently live",
  },
  {
    key: "permanent_address",
    label: "Permanent Address",
    placeholder: "Your home address",
  },
  { key: "guardian_name", label: "Guardian Name" },
  { key: "guardian_phone", label: "Guardian Phone", type: "tel" },
  { key: "guardian_email", label: "Guardian Email", type: "email" },
  { key: "guardian_address", label: "Guardian Address" },
]

const ErrorBodySchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
})

function initialValues(student: Student): StudentSelfProfileValues {
  return {
    phone_number: student.user.phone_number ?? "",
    contact_address: student.contact_address ?? "",
    permanent_address: student.permanent_address ?? "",
    guardian_name: student.guardian_name ?? "",
    guardian_phone: student.guardian_phone ?? "",
    guardian_email: student.guardian_email ?? "",
    guardian_address: student.guardian_address ?? "",
  }
}

export function StudentSelfProfileForm({ student }: { student: Student }) {
  const updateProfile = useUpdateMyProfile()
  const [serverError, setServerError] = useState<string | null>(null)
  const original = initialValues(student)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentSelfProfileValues>({
    resolver: zodResolver(studentSelfProfileSchema),
    values: original,
  })

  const onSubmit = async (values: StudentSelfProfileValues) => {
    setServerError(null)
    // Send only what changed, and only allowed keys.
    const payload: SelfUpdateStudentPayload = {}
    for (const { key } of FIELDS) {
      if (values[key] !== original[key]) payload[key] = values[key]
    }
    if (Object.keys(payload).length === 0) {
      toast.success("Profile is already up to date.")
      return
    }
    try {
      await updateProfile.mutateAsync({ studentId: student.id, payload })
      reset(values)
    } catch (err) {
      const body =
        err instanceof ApiClientError
          ? ErrorBodySchema.safeParse(err.data)
          : null
      if (body?.success && body.data.code === "FIELD_NOT_SELF_EDITABLE") {
        setServerError(
          body.data.message ??
            "Some of these details can only be changed by the registry."
        )
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map(({ key, label, placeholder, type }) => {
          const id = `self-profile-${key}`
          const error = errors[key]?.message
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                type={type ?? "text"}
                placeholder={placeholder}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                {...register(key)}
              />
              {error && (
                <p id={`${id}-error`} className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {serverError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive dark:border-destructive/40"
        >
          {serverError}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={updateProfile.isPending}
          className="gap-2"
        >
          <Save size={15} />
          Save Profile
        </Button>
      </div>
    </form>
  )
}
