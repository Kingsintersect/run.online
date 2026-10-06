import { z } from "zod"
import { passwordSchema } from "@/lib/validations/zod"
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL } from "@/lib/uploads"

export const createUserSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(100, "Username must be 100 characters or less"),
    password: passwordSchema,
    first_name: z.string().optional(),
    middle_name: z.string().optional(),
    last_name: z.string().optional(),
    phone_number: z.string().optional(),
    role_ids: z
      .array(z.number().int().positive())
      .min(1, "Select at least one role"),
    // Major-Program Scoping — sandbox/major-program-scoping/API_CONTRACTS.md
    // §5, revised 2026-09-16: singular and required for Tutor/Admin/Dean/
    // Director/HOD/Bursary/Staff at creation; absent for Student/Applicant/
    // Super Admin. `role_ids` are opaque backend ids, so this schema can't
    // tell by itself which of the selected roles are scoped — CreateUserModal
    // keeps `requires_major_program` in sync with the same role-name check it
    // already uses to show/hide the field, and the superRefine below enforces
    // requiredness off that flag. Same conditional-required shape as
    // `has_disability`/`has_sponsor` in admission-schema.ts.
    requires_major_program: z.boolean().optional().default(false),
    major_program_id: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.requires_major_program && !data.major_program_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["major_program_id"],
        message: "Major program is required for this role",
      })
    }
  })

// `requires_major_program` carries a `.default(false)`, so the resolver's
// input type (pre-default, what react-hook-form's form-values generic needs)
// and output type (post-default, what onSubmit actually receives) diverge —
// same z.input/z.infer split already used for CreateFeeTypeDtoSchema in
// fee-type.schema.ts, for the same reason.
export type CreateUserFormValues = z.input<typeof createUserSchema>
export type CreateUserDto = z.infer<typeof createUserSchema>

// ── Bulk Import Tutors ──
// See sandbox/user/tutor_onboarding_README.md §1 for the CSV contract this
// validates against before the multipart request goes out.
const ACCEPTED_BULK_IMPORT_TYPES = [
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel", // some browsers report .csv this way
]
// The backend accepts up to 10MB here, but the portal caps every upload at the
// shared 2MB limit. A stricter client cap is always safe against a laxer
// backend, and 2MB still covers ~20k tutor rows of CSV. Swap this back to a
// local 10 * 1024 * 1024 if bulk imports ever need the backend's full headroom.
const MAX_BULK_IMPORT_SIZE_BYTES = MAX_FILE_SIZE_BYTES

export const bulkImportTutorsSchema = z.object({
  file: z
    .instanceof(File, { message: "Select a CSV file to upload" })
    .refine(
      (f) => f.size > 0 && f.size <= MAX_BULK_IMPORT_SIZE_BYTES,
      `File must be ${MAX_FILE_SIZE_LABEL} or less`
    )
    .refine(
      (f) =>
        ACCEPTED_BULK_IMPORT_TYPES.includes(f.type) ||
        f.name.toLowerCase().endsWith(".csv") ||
        f.name.toLowerCase().endsWith(".txt"),
      "Only .csv or .txt files are accepted"
    ),
  send_welcome_email: z.boolean(),
  login_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
})

export type BulkImportTutorsFormValues = z.infer<typeof bulkImportTutorsSchema>

// ── Student self-service profile ──
// The only fields PATCH /users/students/:id accepts when the caller is the
// student themself (bruno/user/Students - Update.bru, 2026-09-28). Level,
// mode of study and status are registry-controlled; sending them as a
// self-update is rejected with 403 FIELD_NOT_SELF_EDITABLE.
const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or less`)

export const studentSelfProfileSchema = z.object({
  phone_number: optionalText(30, "Phone number"),
  contact_address: optionalText(500, "Contact address"),
  permanent_address: optionalText(500, "Permanent address"),
  guardian_name: optionalText(255, "Guardian name"),
  guardian_phone: optionalText(30, "Guardian phone"),
  guardian_email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .or(z.literal("")),
  guardian_address: optionalText(500, "Guardian address"),
})

export type StudentSelfProfileValues = z.infer<typeof studentSelfProfileSchema>

// ── Delete account (typed confirmation) ──
// DELETE /users/:id revokes login permanently (bruno/user/Users - Delete.bru),
// so the admin must type the account's email exactly — case-sensitive, with
// surrounding whitespace trimmed — before the confirm button unlocks.
export const deleteAccountConfirmBaseSchema = z.object({
  confirmation: z.string(),
})

export type DeleteAccountConfirmValues = z.infer<
  typeof deleteAccountConfirmBaseSchema
>

export function deleteAccountConfirmSchema(email: string) {
  const expected = email.trim()
  return deleteAccountConfirmBaseSchema.refine(
    (v) => v.confirmation.trim() === expected,
    {
      path: ["confirmation"],
      message: "Type the email exactly as shown (it's case-sensitive).",
    }
  )
}
