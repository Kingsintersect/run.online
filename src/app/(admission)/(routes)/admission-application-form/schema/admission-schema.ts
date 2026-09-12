import { z } from "zod"
import {
  nameSchema,
  emailSchema,
  phoneSchema,
  shortStringSchema,
  longStringSchema,
  selectMenuSchema,
  dateOfBirthSchema,
  genderSchema,
} from "@/lib/validations/zod"
import {
  FILE_TOO_LARGE_MESSAGE,
  isDocumentFile,
  isFileWithinSizeLimit,
  isImageFile,
} from "@/lib/uploads"

// ─── Constants ───────────────────────────────────────────────────────────────
export const EXAM_TYPES = ["WAEC", "NECO", "NABTEB", "GCE"] as const
export const RESULT_TYPES = ["single_result", "combined_result"] as const
export const STUDY_MODES = ["online", "offline"] as const
export const RELIGIONS = [
  "Christianity",
  "Islam",
  "Traditional",
  "Other",
] as const
export const RELATIONSHIPS = [
  "Parent",
  "Sibling",
  "Spouse",
  "Guardian",
  "Uncle",
  "Aunt",
  "Other",
] as const
export const ENTRY_MODES = ["UTME", "DIRECT_ENTRY", "TRANSFER"] as const

// ─── File Schemas ────────────────────────────────────────────────────────────
// Two shapes, because a passport photograph and a certificate scan aren't the
// same thing: a photo field takes images only, a document field takes images
// *or* PDF/DOC/DOCX (a phone photo of a certificate is as valid as a scan).
//
// Both match on the MIME prefix / a known extension rather than a fixed
// allowlist. The old allowlist named seven exact types, which rejected real
// files users submit — HEIC from an iPhone, AVIF, and legacy `image/x-png`,
// which older Windows reports instead of `image/png`.

/** Photographs — any image format. */
export const photoFileSchema = z
  .instanceof(File)
  .refine(isFileWithinSizeLimit, { message: FILE_TOO_LARGE_MESSAGE })
  .refine(isImageFile, {
    message:
      "Upload an image file — any format (JPG, PNG, HEIC, WEBP…) is accepted",
  })

/** Supporting documents — images as well as PDF/DOC/DOCX. */
export const documentFileSchema = z
  .instanceof(File)
  .refine(isFileWithinSizeLimit, { message: FILE_TOO_LARGE_MESSAGE })
  .refine((file) => isImageFile(file) || isDocumentFile(file), {
    message: "Upload an image or a PDF, DOC or DOCX file",
  })

// ─── Step 1: Personal Information ────────────────────────────────────────────
export const personalInfoSchema = z
  .object({
    nationality: shortStringSchema("Nationality"),
    state_of_origin: shortStringSchema("State of Origin"),
    lga: shortStringSchema("Local Gov. Area"),
    religion: selectMenuSchema("religion"),
    dob: dateOfBirthSchema(),
    gender: genderSchema,
    hometown: shortStringSchema("Hometown"),
    hometown_address: longStringSchema("Hometown address"),
    contact_address: longStringSchema("Contact address"),
    has_disability: z.boolean().default(false),
    disability: z.string().optional().default("None"),
  })
  .superRefine((data, ctx) => {
    if (
      data.has_disability &&
      (!data.disability ||
        data.disability.trim() === "" ||
        data.disability === "None")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["disability"],
        message: "Please describe your disability",
      })
    }
  })

// ─── Step 2: Sponsor Information ─────────────────────────────────────────────
export const sponsorInfoSchema = z
  .object({
    has_sponsor: z.boolean().default(false),
    sponsor_name: z.string().optional().default(""),
    sponsor_relationship: z.string().optional().default(""),
    sponsor_email: z.string().optional().default(""),
    sponsor_contact_address: z.string().optional().default(""),
    sponsor_phone_number: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.has_sponsor) {
      const requiredChecks: Array<{
        value: string | undefined
        path: string
        message: string
        minLength?: number
      }> = [
        {
          value: data.sponsor_name,
          path: "sponsor_name",
          message: "Sponsor's name is required",
        },
        {
          value: data.sponsor_relationship,
          path: "sponsor_relationship",
          message: "Sponsor's relationship is required",
        },
        {
          value: data.sponsor_contact_address,
          path: "sponsor_contact_address",
          message: "Sponsor's contact address is required",
          minLength: 10,
        },
        {
          value: data.sponsor_phone_number,
          path: "sponsor_phone_number",
          message: "Sponsor's phone number is required",
          minLength: 10,
        },
      ]

      requiredChecks.forEach(({ value, path, message, minLength = 1 }) => {
        if (!value || value.trim().length < minLength) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })
        }
      })

      if (
        !data.sponsor_email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.sponsor_email)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sponsor_email"],
          message: "Valid sponsor email is required",
        })
      }
    }
  })

// ─── Step 3: Next of Kin ─────────────────────────────────────────────────────
export const nextOfKinSchema = z.object({
  next_of_kin_name: nameSchema("Full name"),
  next_of_kin_relationship: selectMenuSchema("relationship"),
  next_of_kin_phone_number: phoneSchema(),
  next_of_kin_address: longStringSchema("Address"),
  next_of_kin_email: emailSchema("Email", true),
  is_next_of_kin_primary_contact: z.boolean().default(false).optional(),
  next_of_kin_alternate_phone_number: phoneSchema(true),
  next_of_kin_occupation: shortStringSchema("Occupation", true),
  next_of_kin_workplace: shortStringSchema("Workplace", true),
})

// ─── Step 4: Documents ───────────────────────────────────────────────────────
// `nullish()` rather than `optional()`: a restored draft can hand these fields
// `null` (see the note in useAdmissionForm's loadSavedData), and `.optional()`
// accepts only `undefined` — an empty optional upload would otherwise fail with
// "expected array, received null". Matches qualificationDocumentsSchema and
// odlProgramSchema, which already allow null here.
export const documentsSchema = z.object({
  passport: photoFileSchema.nullish(),
  first_school_leaving: documentFileSchema.nullish(),
  o_level: documentFileSchema.nullish(),
  other_documents: z.array(documentFileSchema).nullish(),
})

// ─── Step 5: Qualification-specific Fields ──────────────────────────────────────────
export const qualificationFieldsSchema = z.object({
  combined_result: z
    .enum(["single_result", "combined_result", ""])
    .optional()
    .default(""),
  awaiting_result: z.boolean().default(false),
})

// ─── Step 6: Exam Sitting ────────────────────────────────────────────────────
export const examSittingSchema = z.object({
  first_sitting_type: z.string().optional().default(""),
  first_sitting_year: z.string().optional().default(""),
  first_sitting_exam_number: z.string().optional().default(""),
  second_sitting_type: z.string().optional().default(""),
  second_sitting_year: z.string().optional().default(""),
  second_sitting_exam_number: z.string().optional().default(""),
})

// ─── Step 7: Qualification-specific Document Fields ───────────────────────────────
export const qualificationDocumentsSchema = z.object({
  first_sitting_result: documentFileSchema.nullish(),
  second_sitting_result: documentFileSchema.nullish(),
})

// ─── Step 8: Program Selection ───────────────────────────────────────────────
export const programSelectionSchema = z.object({
  programId: z.number().min(1, "Please select a program"),
  entryMode: z
    .enum(ENTRY_MODES)
    .or(z.literal(""))
    .refine((val) => !!val, {
      message: "Please select your entry mode",
    }),
  startTerm: selectMenuSchema("start term"),
  studyMode: z.enum(["online", "offline"]).default("online"),
})

// ─── Combined: Full ODL Application Schema ───────────────────────────────────
export const odlProgramSchema = z
  .object({
    id: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => (val !== undefined ? String(val) : undefined)),

    // Step 1: Personal Information
    nationality: shortStringSchema("Nationality"),
    state_of_origin: shortStringSchema("State of Origin"),
    lga: shortStringSchema("Local Gov. Area"),
    religion: selectMenuSchema("religion"),
    dob: dateOfBirthSchema(),
    gender: genderSchema,
    hometown: shortStringSchema("Hometown"),
    hometown_address: longStringSchema("Hometown address"),
    contact_address: longStringSchema("Contact address"),
    has_disability: z.boolean().default(false),
    disability: z.string().optional().default("None"),

    // Step 2: Sponsor Information
    has_sponsor: z.boolean().default(false),
    sponsor_name: z.string().optional().default(""),
    sponsor_relationship: z.string().optional().default(""),
    sponsor_email: z.string().optional().default(""),
    sponsor_contact_address: z.string().optional().default(""),
    sponsor_phone_number: z.string().optional().default(""),

    // Step 3: Next of Kin
    next_of_kin_name: nameSchema("Full name"),
    next_of_kin_relationship: selectMenuSchema("relationship"),
    next_of_kin_phone_number: phoneSchema(),
    next_of_kin_address: longStringSchema("Address"),
    next_of_kin_email: emailSchema("Email", true),
    is_next_of_kin_primary_contact: z.boolean().default(false).optional(),
    next_of_kin_alternate_phone_number: phoneSchema(true),
    next_of_kin_occupation: shortStringSchema("Occupation", true),
    next_of_kin_workplace: shortStringSchema("Workplace", true),

    // Step 4: Documents
    passport: photoFileSchema.nullish(),
    first_school_leaving: documentFileSchema.nullish(),
    o_level: documentFileSchema.nullish(),
    other_documents: z.array(documentFileSchema).nullish(),

    // Step 5: Qualification Fields
    combined_result: z
      .enum(["single_result", "combined_result", ""])
      .optional()
      .default(""),
    awaiting_result: z.boolean().default(false),

    // Step 6: Exam Sitting
    first_sitting_type: z.string().optional().default(""),
    first_sitting_year: z.string().optional().default(""),
    first_sitting_exam_number: z.string().optional().default(""),
    second_sitting_type: z.string().optional().default(""),
    second_sitting_year: z.string().optional().default(""),
    second_sitting_exam_number: z.string().optional().default(""),

    // Step 7: Qualification Documents
    first_sitting_result: documentFileSchema.nullish(),
    second_sitting_result: documentFileSchema.nullish(),

    // Step 8: Program Selection
    programId: z.number().min(1, "Please select a program"),
    entryMode: z.enum(ENTRY_MODES),
    startTerm: z.string().default(""),
    studyMode: z.enum(["online", "offline"]).default("online"),

    // Terms
    agreeToTerms: z
      .boolean()
      .refine((val) => val === true, "You must agree to terms and conditions"),
  })
  .superRefine((data, ctx) => {
    // Sponsor validation
    if (data.has_sponsor) {
      const sponsorChecks: Array<{
        value: string | undefined
        path: string
        message: string
        minLength?: number
      }> = [
        {
          value: data.sponsor_name,
          path: "sponsor_name",
          message: "Sponsor's name is required",
        },
        {
          value: data.sponsor_relationship,
          path: "sponsor_relationship",
          message: "Sponsor's relationship is required",
        },
        {
          value: data.sponsor_contact_address,
          path: "sponsor_contact_address",
          message: "Sponsor's contact address is required",
          minLength: 10,
        },
        {
          value: data.sponsor_phone_number,
          path: "sponsor_phone_number",
          message: "Sponsor's phone number is required",
          minLength: 10,
        },
      ]

      sponsorChecks.forEach(({ value, path, message, minLength = 1 }) => {
        if (!value || value.trim().length < minLength) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })
        }
      })

      if (
        !data.sponsor_email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.sponsor_email)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sponsor_email"],
          message: "Valid sponsor email is required",
        })
      }
    }

    // Disability validation
    if (
      data.has_disability &&
      (!data.disability ||
        data.disability.trim() === "" ||
        data.disability === "None")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["disability"],
        message: "Please describe your disability",
      })
    }

    // Qualification sitting validation
    if (!data.awaiting_result) {
      if (!data.combined_result || data.combined_result.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["combined_result"],
          message: "Please select result type",
        })
      }

      const firstSittingFields: Array<{
        value: string | File | null | undefined
        path: string
        message: string
      }> = [
        {
          value: data.first_sitting_type,
          path: "first_sitting_type",
          message: "First sitting exam type is required",
        },
        {
          value: data.first_sitting_year,
          path: "first_sitting_year",
          message: "First sitting exam year is required",
        },
        {
          value: data.first_sitting_exam_number,
          path: "first_sitting_exam_number",
          message: "First sitting exam number is required",
        },
        {
          value: data.first_sitting_result,
          path: "first_sitting_result",
          message: "First sitting result file is required",
        },
      ]

      firstSittingFields.forEach(({ value, path, message }) => {
        if (typeof value === "string") {
          if (!value || value.trim() === "") {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })
          }
        } else if (!value) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })
        }
      })

      if (data.combined_result === "combined_result") {
        const secondSittingFields: Array<{
          value: string | File | null | undefined
          path: string
          message: string
        }> = [
          {
            value: data.second_sitting_type,
            path: "second_sitting_type",
            message:
              "Second sitting exam type is required for combined results",
          },
          {
            value: data.second_sitting_year,
            path: "second_sitting_year",
            message:
              "Second sitting exam year is required for combined results",
          },
          {
            value: data.second_sitting_exam_number,
            path: "second_sitting_exam_number",
            message:
              "Second sitting exam number is required for combined results",
          },
          {
            value: data.second_sitting_result,
            path: "second_sitting_result",
            message:
              "Second sitting result file is required for combined results",
          },
        ]

        secondSittingFields.forEach(({ value, path, message }) => {
          if (typeof value === "string") {
            if (!value || value.trim() === "") {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [path],
                message,
              })
            }
          } else if (!value) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })
          }
        })
      }
    }
  })

// ─── Types ───────────────────────────────────────────────────────────────────
export type PersonalInfoData = z.infer<typeof personalInfoSchema>
export type SponsorInfoData = z.infer<typeof sponsorInfoSchema>
export type NextOfKinData = z.infer<typeof nextOfKinSchema>
export type DocumentsData = z.infer<typeof documentsSchema>
export type QualificationFieldsData = z.infer<typeof qualificationFieldsSchema>
export type ExamSittingData = z.infer<typeof examSittingSchema>
export type QualificationDocumentsData = z.infer<
  typeof qualificationDocumentsSchema
>
export type ProgramSelectionData = z.infer<typeof programSelectionSchema>
export type ODLApplication = z.infer<typeof odlProgramSchema>
