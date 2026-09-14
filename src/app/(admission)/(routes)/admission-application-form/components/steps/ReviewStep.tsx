"use client"

import type { ElementType, ReactNode } from "react"
import { motion } from "framer-motion"
import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  CheckCircle,
  AlertCircle,
  Edit,
  FileText,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import type { AdmissionFormField } from "@/types/admissionConfig"
import { FormStep, FORM_STEP_KEYS } from "../../types/form-types"
import type { FormDefaultValues } from "../../types/form-types"
import {
  displayFieldValue,
  isFieldVisible,
  makeLookup,
  readFieldValue,
  stepFields,
  type FieldIndexEntry,
  type ValueLookup,
  type WizardStep,
} from "../../lib/dynamic-form"

interface ReviewStepProps {
  steps: WizardStep[]
  completedSteps: Set<string>
  onEditStep: (stepId: string) => void
  fieldIndex: Map<string, FieldIndexEntry>
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" as const },
}

function ReviewField({
  label,
  value,
}: {
  label: string
  value: string | boolean | undefined
}) {
  if (value === undefined || value === "") return null

  const displayValue =
    typeof value === "boolean" ? (value ? "Yes" : "No") : value

  return (
    <div className="flex justify-between gap-4 border-b border-dashed py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{displayValue}</span>
    </div>
  )
}

function FileReviewField({
  label,
  file,
}: {
  label: string
  file: File | undefined
}) {
  if (!file) return null

  return (
    <div className="flex items-center justify-between border-b border-dashed py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <FileText className="size-3.5 text-primary" />
        <span className="max-w-50 truncate text-sm font-medium">
          {file.name}
        </span>
      </div>
    </div>
  )
}

function ReviewSection({
  title,
  icon: Icon,
  isCompleted,
  onEdit,
  editable = true,
  children,
}: {
  title: string
  icon: ElementType
  isCompleted: boolean
  onEdit: () => void
  /** Hides the edit button — for sections chosen at an earlier step and shown here read-only. */
  editable?: boolean
  children: ReactNode
}) {
  return (
    <motion.div {...fadeInUp}>
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isCompleted ? "default" : "secondary"}
              className="text-xs"
            >
              {isCompleted ? (
                <>
                  <CheckCircle className="mr-1 size-3" /> Complete
                </>
              ) : (
                <>
                  <AlertCircle className="mr-1 size-3" /> Incomplete
                </>
              )}
            </Badge>
            {editable && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${title}`}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Edit className="size-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-3">{children}</CardContent>
      </Card>
    </motion.div>
  )
}

/** Answers to dynamic questions, labelled from their definitions. */
function DynamicAnswers({
  stepId,
  fields,
  values,
  lookup,
  optionLabel,
}: {
  stepId: string
  fields: AdmissionFormField[]
  values: FormDefaultValues
  lookup: ValueLookup
  optionLabel: (field: AdmissionFormField, value: string) => string | undefined
}) {
  const visible = fields.filter(
    (f) => !f.parentFieldId && isFieldVisible(f, lookup)
  )
  return (
    <>
      {visible.map((field) => (
        <ReviewField
          key={field.key}
          label={field.label}
          value={displayFieldValue(
            field,
            readFieldValue(values, stepId, field),
            (v) => optionLabel(field, v)
          )}
        />
      ))}
    </>
  )
}

function BuiltinAnswers({
  formStep,
  values,
  programName,
}: {
  formStep: FormStep
  values: FormDefaultValues
  programName: string | undefined
}) {
  switch (formStep) {
    case FormStep.PERSONAL_INFO:
      return (
        <>
          <ReviewField label="Nationality" value={values.nationality} />
          <ReviewField label="State of Origin" value={values.state_of_origin} />
          <ReviewField label="Local Gov. Area" value={values.lga} />
          <ReviewField label="Religion" value={values.religion} />
          <ReviewField label="Date of Birth" value={values.dob} />
          <ReviewField label="Gender" value={values.gender} />
          <ReviewField label="Hometown" value={values.hometown} />
          <ReviewField
            label="Hometown Address"
            value={values.hometown_address}
          />
          <ReviewField label="Contact Address" value={values.contact_address} />
          <ReviewField label="Has Disability" value={values.has_disability} />
          {values.has_disability && (
            <ReviewField label="Disability" value={values.disability} />
          )}
        </>
      )
    case FormStep.SPONSOR_INFO:
      return (
        <>
          <ReviewField label="Has Sponsor" value={values.has_sponsor} />
          {values.has_sponsor && (
            <>
              <ReviewField label="Sponsor Name" value={values.sponsor_name} />
              <ReviewField
                label="Relationship"
                value={values.sponsor_relationship}
              />
              <ReviewField label="Email" value={values.sponsor_email} />
              <ReviewField label="Phone" value={values.sponsor_phone_number} />
              <ReviewField
                label="Address"
                value={values.sponsor_contact_address}
              />
            </>
          )}
        </>
      )
    case FormStep.NEXT_OF_KIN:
      return (
        <>
          <ReviewField label="Full Name" value={values.next_of_kin_name} />
          <ReviewField
            label="Relationship"
            value={values.next_of_kin_relationship}
          />
          <ReviewField label="Phone" value={values.next_of_kin_phone_number} />
          <ReviewField label="Address" value={values.next_of_kin_address} />
          <ReviewField label="Email" value={values.next_of_kin_email} />
          <ReviewField
            label="Primary Contact"
            value={values.is_next_of_kin_primary_contact}
          />
          <ReviewField
            label="Occupation"
            value={values.next_of_kin_occupation}
          />
          <ReviewField label="Workplace" value={values.next_of_kin_workplace} />
        </>
      )
    case FormStep.DOCUMENTS:
      return (
        <>
          <FileReviewField label="Passport" file={values.passport} />
          <FileReviewField
            label="First School Leaving"
            file={values.first_school_leaving}
          />
          <FileReviewField label="O-Level Certificate" file={values.o_level} />
          {values.other_documents?.map((file, idx) => (
            <FileReviewField
              key={idx}
              label={`Other Document ${idx + 1}`}
              file={file}
            />
          ))}
        </>
      )
    case FormStep.QUALIFICATION_FIELDS:
      return (
        <>
          <ReviewField label="Awaiting Result" value={values.awaiting_result} />
          {!values.awaiting_result && (
            <ReviewField
              label="Result Type"
              value={
                values.combined_result === "combined_result"
                  ? "Combined Result"
                  : "Single Result"
              }
            />
          )}
        </>
      )
    case FormStep.EXAM_SITTING:
      return values.awaiting_result ? (
        <p className="text-sm text-muted-foreground italic">
          Skipped — awaiting results
        </p>
      ) : (
        <>
          <ReviewField
            label="First Sitting Type"
            value={values.first_sitting_type}
          />
          <ReviewField
            label="First Sitting Year"
            value={values.first_sitting_year}
          />
          <ReviewField
            label="First Sitting Exam No."
            value={values.first_sitting_exam_number}
          />
          {values.combined_result === "combined_result" && (
            <>
              <ReviewField
                label="Second Sitting Type"
                value={values.second_sitting_type}
              />
              <ReviewField
                label="Second Sitting Year"
                value={values.second_sitting_year}
              />
              <ReviewField
                label="Second Sitting Exam No."
                value={values.second_sitting_exam_number}
              />
            </>
          )}
        </>
      )
    case FormStep.QUALIFICATION_DOCUMENTS:
      return values.awaiting_result ? (
        <p className="text-sm text-muted-foreground italic">
          Skipped — awaiting results
        </p>
      ) : (
        <>
          <FileReviewField
            label="First Sitting Result"
            file={values.first_sitting_result}
          />
          {values.combined_result === "combined_result" && (
            <FileReviewField
              label="Second Sitting Result"
              file={values.second_sitting_result}
            />
          )}
        </>
      )
    case FormStep.PROGRAM_SELECTION:
      return (
        <>
          <ReviewField label="Program" value={programName} />
          <ReviewField label="Entry Mode" value={values.entryMode} />
          <ReviewField label="Start Term" value={values.startTerm} />
          <ReviewField
            label="Study Mode"
            value={
              values.studyMode === "online" ? "Online Learning" : "On-Campus"
            }
          />
        </>
      )
    default:
      return null
  }
}

export default function ReviewStep({
  steps,
  completedSteps,
  onEditStep,
  fieldIndex,
}: ReviewStepProps) {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<FormDefaultValues>()
  const values = watch()
  const agreeToTerms = watch("agreeToTerms")
  const lookup = makeLookup(values, fieldIndex)
  const { data: programsData } = useAllPrograms()
  const programs = programsData?.data ?? []
  const programName = programs.find((p) => p.id === values.programId)?.name
  const optionLabel = (field: AdmissionFormField, value: string) =>
    field.optionsSource === "PROGRAMS"
      ? programs.find((p) => String(p.id) === value)?.name
      : undefined

  const sections = steps.filter((s) => s.kind !== "review")
  const programSelectionShown = sections.some(
    (s) => s.id === FORM_STEP_KEYS[FormStep.PROGRAM_SELECTION]
  )

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <div>
        <h3 className="text-lg font-semibold">Review & Submit</h3>
        <p className="text-sm text-muted-foreground">
          Please review all information carefully before submitting your
          application. Click the edit icon to make changes to any section.
        </p>
      </div>

      {sections.map((step) => (
        <ReviewSection
          key={step.id}
          title={step.title}
          icon={step.icon}
          isCompleted={completedSteps.has(step.id)}
          onEdit={() => onEditStep(step.id)}
        >
          {step.kind === "builtin" && (
            <BuiltinAnswers
              formStep={step.formStep}
              values={values}
              programName={programName}
            />
          )}
          <DynamicAnswers
            stepId={step.id}
            fields={stepFields(step)}
            values={values}
            lookup={lookup}
            optionLabel={optionLabel}
          />
        </ReviewSection>
      ))}

      {/* The program chosen at the earlier "Choice Program" stage, shown read-only. */}
      {!programSelectionShown &&
        !sections.some((s) =>
          stepFields(s).some((f) => f.systemKey === "programId")
        ) && (
          <ReviewSection
            title="Program Selection"
            icon={Settings}
            isCompleted={!!programName && !!values.entryMode}
            onEdit={() => {}}
            editable={false}
          >
            <BuiltinAnswers
              formStep={FormStep.PROGRAM_SELECTION}
              values={values}
              programName={programName}
            />
          </ReviewSection>
        )}

      <motion.div {...fadeInUp}>
        <Card
          className={cn(
            "border-2",
            agreeToTerms ? "border-primary/30 bg-primary/5" : "border-border",
            errors.agreeToTerms && "border-destructive"
          )}
        >
          <CardContent className="flex items-start gap-4 pt-6">
            <Switch
              id="agreeToTerms"
              checked={agreeToTerms ?? false}
              onCheckedChange={(checked) =>
                setValue("agreeToTerms", checked, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />
            <div className="space-y-1">
              <Label
                htmlFor="agreeToTerms"
                className="cursor-pointer text-sm font-medium"
              >
                I agree to the Terms and Conditions
              </Label>
              <p className="text-xs text-muted-foreground">
                By checking this box, I confirm that all information provided is
                accurate and complete. I understand that providing false
                information may result in the cancellation of my admission.
              </p>
            </div>
          </CardContent>
        </Card>
        {errors.agreeToTerms?.message && (
          <p className="mt-2 text-sm text-destructive">
            {errors.agreeToTerms.message}
          </p>
        )}
      </motion.div>
    </motion.div>
  )
}
