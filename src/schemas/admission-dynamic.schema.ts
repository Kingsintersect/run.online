import { z } from "zod"
import type {
  FieldCondition,
  StageConfigByType,
  StageType,
} from "@/types/admissionConfig"

// Dynamic Admission — sandbox/dynamic-admission/API_CONTRACTS.md §2.2 (stage
// config) and §3.1 (field definitions). The backend re-validates both; these
// give the admin immediate feedback.

const feeCategorySchema = z.enum([
  "APPLICATION",
  "ACCEPTANCE",
  "TUITION",
  "HOSTEL",
  "CLEARANCE",
  "OTHER",
])

const fileAcceptSchema = z.enum(["IMAGE", "DOCUMENT", "ANY"])

const slugKey = z
  .string()
  .trim()
  .min(2, "Give it a key of at least 2 characters")
  .max(60, "Keep the key under 60 characters")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Lowercase letters, numbers and underscores only, starting with a letter"
  )

export const stageConfigSchemas: {
  [K in StageType]: z.ZodType<StageConfigByType[K]>
} = {
  PROGRAM_CHOICE: z.object({
    collectEntryMode: z.boolean(),
    collectStudyMode: z.boolean(),
    collectStartTerm: z.boolean(),
  }),
  PAYMENT: z
    .object({
      feeCategory: feeCategorySchema,
      feeTypeId: z.number().int().positive().nullable().optional(),
      allowInstallments: z.boolean(),
      minimumPercent: z.number().int().min(1).max(100).nullable().optional(),
    })
    .superRefine((config, ctx) => {
      if (config.allowInstallments && !config.minimumPercent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minimumPercent"],
          message: "Set the minimum first payment (1–100%)",
        })
      }
    }),
  FORM: z.object({}).strict(),
  DECISION: z.object({ showOfferExpiry: z.boolean() }),
  CONTENT: z
    .object({
      title: z.string().trim().min(2, "Give the page a title").max(120),
      body: z.string().trim().min(10, "Write at least a sentence").max(20000),
      requireAcknowledgement: z.boolean(),
      acknowledgementLabel: z.string().trim().max(120).nullable().optional(),
    })
    .superRefine((config, ctx) => {
      if (
        config.requireAcknowledgement &&
        !config.acknowledgementLabel?.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["acknowledgementLabel"],
          message: "Say what the applicant is confirming",
        })
      }
    }),
  DOCUMENT_UPLOAD: z.object({
    documents: z
      .array(
        z.object({
          key: slugKey,
          label: z.string().trim().min(2, "Name the document").max(120),
          accept: fileAcceptSchema,
          required: z.boolean(),
          maxSizeMb: z.number().int().min(1).max(50).nullable().optional(),
        })
      )
      .min(1, "Add at least one document")
      .superRefine((docs, ctx) => {
        const seen = new Set<string>()
        docs.forEach((doc, i) => {
          if (seen.has(doc.key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [i, "key"],
              message: "Each document needs its own key",
            })
          }
          seen.add(doc.key)
        })
      }),
  }),
  COMPLETE: z
    .object({
      message: z.string().trim().min(2, "Write a closing message").max(500),
      ctaLabel: z.string().trim().max(60).nullable().optional(),
      ctaHref: z.string().trim().max(300).nullable().optional(),
    })
    .superRefine((config, ctx) => {
      if (config.ctaLabel?.trim() && !config.ctaHref?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ctaHref"],
          message: "Add the link the button opens",
        })
      }
    }),
}

const conditionLeafSchema = z.union([
  z.object({
    field: z.string().min(1, "Pick a question"),
    op: z.enum(["equals", "notEquals"]),
    value: z.union([
      z.string().min(1, "Enter a value"),
      z.number(),
      z.boolean(),
    ]),
  }),
  z.object({
    field: z.string().min(1, "Pick a question"),
    op: z.enum(["in", "notIn"]),
    value: z
      .array(z.union([z.string(), z.number()]))
      .min(1, "Enter at least one value"),
  }),
  z.object({
    field: z.string().min(1, "Pick a question"),
    op: z.enum(["isTrue", "isFalse", "isEmpty", "isNotEmpty"]),
  }),
])

// Input and output share one shape, so the editor form reads it typed too.
export const fieldConditionSchema: z.ZodType<FieldCondition, FieldCondition> =
  z.lazy(() =>
    z.union([
      conditionLeafSchema,
      z.object({ all: z.array(fieldConditionSchema).min(1) }),
      z.object({ any: z.array(fieldConditionSchema).min(1) }),
    ])
  )

const fieldTypeSchema = z.enum([
  "TEXT",
  "TEXTAREA",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "DATE",
  "SELECT",
  "MULTISELECT",
  "FILE",
  "REPEATING_GROUP",
  "BOOLEAN",
  "RADIO",
  "YEAR",
])

const optionsSourceSchema = z.enum([
  "COUNTRIES",
  "STATES",
  "LGAS",
  "PROGRAMS",
  "SESSIONS",
  "ENTRY_MODES",
  "EXAM_TYPES",
])

export const formFieldDraftSchema = z
  .object({
    key: slugKey,
    label: z.string().trim().min(2, "Write the question").max(200),
    type: fieldTypeSchema,
    order: z.number().int().min(1),
    isRequired: z.boolean(),
    helpText: z.string().trim().max(300).nullable(),
    placeholder: z.string().trim().max(120).nullable().optional(),
    width: z.enum(["FULL", "HALF"]).optional(),
    options: z
      .array(
        z.object({
          value: z.string().trim().min(1),
          label: z.string().trim().min(1),
        })
      )
      .nullable(),
    optionsSource: optionsSourceSchema.nullable().optional(),
    dependsOn: z.string().nullable().optional(),
    validation: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().optional(),
        minDate: z.string().optional(),
        maxDate: z.string().optional(),
        minLength: z.number().int().min(0).optional(),
        maxLength: z.number().int().min(1).optional(),
        accept: fileAcceptSchema.optional(),
        maxSizeMb: z.number().int().min(1).max(50).optional(),
        multiple: z.boolean().optional(),
        maxItems: z.number().int().min(1).max(50).optional(),
      })
      .nullable(),
    repeatable: z.boolean(),
    systemKey: z.string().nullable().optional(),
    visibleWhen: fieldConditionSchema.nullable().optional(),
    parentFieldId: z.number().int().positive().nullable().optional(),
    defaultValue: z
      .union([z.string(), z.number(), z.boolean()])
      .nullable()
      .optional(),
  })
  .superRefine((draft, ctx) => {
    const isChoice = ["SELECT", "RADIO", "MULTISELECT"].includes(draft.type)
    if (isChoice && !draft.optionsSource && !draft.options?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Add at least one option, or load options from a data source",
      })
    }
    if (
      (draft.optionsSource === "STATES" || draft.optionsSource === "LGAS") &&
      !draft.dependsOn
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dependsOn"],
        message:
          draft.optionsSource === "STATES"
            ? "Pick the country question these states depend on"
            : "Pick the state question these local governments depend on",
      })
    }
    const v = draft.validation
    if (v?.min !== undefined && v.max !== undefined && v.min > v.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validation", "max"],
        message: "Maximum must be at least the minimum",
      })
    }
    if (
      v?.minLength !== undefined &&
      v.maxLength !== undefined &&
      v.minLength > v.maxLength
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validation", "maxLength"],
        message: "Maximum length must be at least the minimum",
      })
    }
    if (v?.pattern) {
      try {
        new RegExp(v.pattern)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["validation", "pattern"],
          message: "This pattern isn't a valid regular expression",
        })
      }
    }
  })

export type FormFieldDraftInput = z.input<typeof formFieldDraftSchema>
export type FormFieldDraft = z.infer<typeof formFieldDraftSchema>
