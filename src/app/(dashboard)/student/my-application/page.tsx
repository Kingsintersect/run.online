"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  Save,
  User,
} from "lucide-react"
import { toast } from "sonner"
import EditableField from "@/components/custom/EditableField"
import SectionCard from "@/components/custom/SectionCard"
import DocumentList from "@/components/custom/DocumentList"
import StatusBadge from "@/components/custom/StatusBadge"
import EmptyState from "@/components/custom/EmptyState"
import { ZoomableImage } from "@/components/custom/ZoomableImage"
import { getFileKind } from "@/lib/utils"
import {
  applicationReviewKeys,
  applicationReviewMutationOptions,
  applicationReviewQueryOptions,
} from "@/services/applicationReviewApi"
import type {
  ApplicationReviewStatus,
  ApplicantAcademicRecord,
  UpdateApplicationPayload,
} from "@/types/school"
import {
  useCountries,
  useStates,
  useLocalGovernments,
} from "@/modules/demographics/hooks/use-demographics"

const statusVariantMap: Record<
  ApplicationReviewStatus,
  "warning" | "info" | "success" | "destructive"
> = {
  pending: "warning",
  under_review: "info",
  approved: "success",
  denied: "destructive",
}

const statusLabelMap: Record<ApplicationReviewStatus, string> = {
  pending: "Pending Review",
  under_review: "Under Review",
  approved: "Approved",
  denied: "Denied",
}

export default function MyApplicationPage() {
  const queryClient = useQueryClient()
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // Real API: GET /admissions/applications/my — resolves from the JWT, no id needed.
  const {
    data: application,
    isLoading,
    isError,
    error,
  } = useQuery(applicationReviewQueryOptions.mine())

  const updateMutation = useMutation({
    ...applicationReviewMutationOptions.update(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationReviewKeys.mine() })
      setLastSaved(new Date().toLocaleTimeString())
      toast.success("Changes saved")
    },
    onError: () => toast.error("Failed to save changes"),
  })

  const addDocumentMutation = useMutation({
    ...applicationReviewMutationOptions.addDocument(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationReviewKeys.mine() })
      toast.success("Document uploaded")
    },
    onError: () => toast.error("Failed to upload document"),
  })

  const replaceDocumentMutation = useMutation({
    ...applicationReviewMutationOptions.replaceDocument(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationReviewKeys.mine() })
      toast.success("Document replaced")
    },
    onError: () => toast.error("Failed to replace document"),
  })

  const deleteDocumentMutation = useMutation({
    ...applicationReviewMutationOptions.deleteDocument(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationReviewKeys.mine() })
      toast.success("Document removed")
    },
    onError: () => toast.error("Failed to remove document"),
  })

  // Nationality/State of Origin/LGA are now backed selects, cascading off
  // the currently-saved value rather than free-form local edit state — each
  // EditableField commits one field at a time, so the next level's options
  // naturally recompute once the query refetches after a save.
  const { data: countries = [] } = useCountries()
  const countryId =
    countries.find((c) => c.name === application?.personal_info?.nationality)
      ?.id ?? null
  const { data: states = [] } = useStates(countryId)
  const stateId =
    states.find((s) => s.name === application?.personal_info?.state_of_origin)
      ?.id ?? null
  const { data: lgas = [] } = useLocalGovernments(stateId)

  const countryOptions = countries.map((c) => ({
    value: c.name,
    label: c.name,
  }))
  const stateOptions = states.map((s) => ({ value: s.name, label: s.name }))
  const lgaOptions = lgas.map((l) => ({ value: l.name, label: l.name }))

  const handleFieldSave = (
    section: keyof UpdateApplicationPayload,
    key: string,
    value: string
  ) => {
    if (!application) return
    const payload: UpdateApplicationPayload = {}

    if (section === "personal_info") {
      payload.personal_info = {
        [key]: value,
      } as UpdateApplicationPayload["personal_info"]
    } else if (section === "program_choice") {
      payload.program_choice = {
        [key]: key === "jamb_score" ? Number(value) : value,
      } as UpdateApplicationPayload["program_choice"]
    }

    updateMutation.mutate({ id: application.id, payload })
  }

  const handleAcademicRecordSave = (
    index: number,
    key: keyof ApplicantAcademicRecord,
    value: string
  ) => {
    if (!application) return
    const updated = [...application.academic_records]
    updated[index] = { ...updated[index], [key]: value }
    updateMutation.mutate({
      id: application.id,
      payload: { academic_records: updated },
    })
  }

  const handleDocumentRemove = (docId: string) => {
    if (!application) return
    deleteDocumentMutation.mutate({ applicationId: application.id, docId })
  }

  const handleDocumentReplace = (docId: string, file: File) => {
    if (!application) return
    replaceDocumentMutation.mutate({
      applicationId: application.id,
      docId,
      file,
    })
  }

  const handleDocumentAdd = (file: File) => {
    if (!application) return
    addDocumentMutation.mutate({
      applicationId: application.id,
      file,
      type: "other",
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 404 from GET /admissions/applications/my just means "haven't applied yet" (per admission_README.md) — not a real error.
  if (isError && error?.status !== 404) {
    return (
      <EmptyState
        icon={FileText}
        title="Couldn't load your application"
        description={
          error?.message ?? "Something went wrong. Please try again."
        }
      />
    )
  }

  if (!application) {
    return (
      <EmptyState
        icon={FileText}
        title="No Application Found"
        description="You haven't submitted an admission application yet."
      />
    )
  }

  // Both PATCH /admissions/applications/:id and the document endpoints only
  // allow edits while status is still "pending" (Applications - Update.bru /
  // Application Documents - Add.bru: "Only works while the application is
  // still pending") — under_review is real but not editable.
  const isEditable = application.status === "pending"
  const { personal_info, academic_records, program_choice, documents } =
    application

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-foreground">
                My Application
              </h1>
              <StatusBadge
                label={statusLabelMap[application.status]}
                variant={statusVariantMap[application.status]}
                dot
              />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Session: {application.session} &middot; Submitted{" "}
              {new Date(application.submitted_at).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {updateMutation.isPending && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </div>
          )}
          {lastSaved && !updateMutation.isPending && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600">
              <Save size={14} />
              Saved at {lastSaved}
            </div>
          )}
        </motion.div>

        {/* Info banner */}
        {isEditable && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4"
          >
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
            />
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                You can edit your application
              </p>
              <p className="mt-0.5 text-sm text-blue-600/80 dark:text-blue-400/80">
                Click on any field to correct typos or replace uploaded
                documents. Changes are saved automatically.
              </p>
            </div>
          </motion.div>
        )}

        {/* Denial reason */}
        <AnimatePresence>
          {application.status === "denied" && application.denial_reason && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
            >
              <p className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">
                Application Denied
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                {application.denial_reason}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Approved banner */}
        <AnimatePresence>
          {application.status === "approved" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"
            >
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Congratulations! Your application has been approved.
                </p>
                <p className="mt-0.5 text-sm text-emerald-600/80 dark:text-emerald-400/80">
                  Please proceed to the admissions portal to complete your
                  enrollment.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Personal Information */}
        <SectionCard title="Personal Information" icon={User}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="mb-2 flex items-center gap-4 sm:col-span-2 lg:col-span-3">
              <ZoomableImage
                src={personal_info.passport_url}
                alt="Passport photograph"
                title="Your passport photograph"
                className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border"
              />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {personal_info.last_name}, {personal_info.first_name}{" "}
                  {personal_info.middle_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {personal_info.email}
                </p>
              </div>
            </div>
            <EditableField
              label="First Name"
              value={personal_info.first_name}
              editable={isEditable}
              onSave={(v) => handleFieldSave("personal_info", "first_name", v)}
            />
            <EditableField
              label="Last Name"
              value={personal_info.last_name}
              editable={isEditable}
              onSave={(v) => handleFieldSave("personal_info", "last_name", v)}
            />
            <EditableField
              label="Middle Name"
              value={personal_info.middle_name}
              editable={isEditable}
              onSave={(v) => handleFieldSave("personal_info", "middle_name", v)}
            />
            <EditableField
              label="Date of Birth"
              value={personal_info.date_of_birth}
              type="date"
              editable={isEditable}
              onSave={(v) =>
                handleFieldSave("personal_info", "date_of_birth", v)
              }
            />
            <EditableField
              label="Gender"
              value={personal_info.gender}
              editable={isEditable}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
              onSave={(v) => handleFieldSave("personal_info", "gender", v)}
            />
            <EditableField
              label="Nationality"
              value={personal_info.nationality}
              editable={isEditable}
              options={countryOptions}
              onSave={(v) => handleFieldSave("personal_info", "nationality", v)}
            />
            <EditableField
              label="State of Origin"
              value={personal_info.state_of_origin}
              editable={isEditable}
              options={stateOptions}
              onSave={(v) =>
                handleFieldSave("personal_info", "state_of_origin", v)
              }
            />
            <EditableField
              label="LGA"
              value={personal_info.lga}
              editable={isEditable}
              options={lgaOptions}
              onSave={(v) => handleFieldSave("personal_info", "lga", v)}
            />
            <EditableField
              label="Phone"
              value={personal_info.phone}
              type="tel"
              editable={isEditable}
              onSave={(v) => handleFieldSave("personal_info", "phone", v)}
            />
            <EditableField
              label="Email"
              value={personal_info.email}
              type="email"
              editable={isEditable}
              onSave={(v) => handleFieldSave("personal_info", "email", v)}
            />
            <EditableField
              label="Address"
              value={personal_info.address}
              type="textarea"
              editable={isEditable}
              onSave={(v) => handleFieldSave("personal_info", "address", v)}
              className="sm:col-span-2 lg:col-span-3"
            />
          </div>
        </SectionCard>

        {/* Program Choice */}
        <SectionCard title="Program Choice" icon={GraduationCap}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <EditableField
              label="First Choice"
              value={program_choice.first_choice_program_name}
              editable={isEditable}
              onSave={(v) =>
                handleFieldSave(
                  "program_choice",
                  "first_choice_program_name",
                  v
                )
              }
            />
            <EditableField
              label="Second Choice"
              value={program_choice.second_choice_program_name}
              editable={isEditable}
              onSave={(v) =>
                handleFieldSave(
                  "program_choice",
                  "second_choice_program_name",
                  v
                )
              }
            />
            <EditableField
              label="Entry Mode"
              value={program_choice.entry_mode}
              editable={isEditable}
              options={[
                { value: "utme", label: "UTME" },
                { value: "direct_entry", label: "Direct Entry" },
                { value: "transfer", label: "Transfer" },
              ]}
              onSave={(v) => handleFieldSave("program_choice", "entry_mode", v)}
            />
            <EditableField
              label="JAMB Reg No."
              value={program_choice.jamb_reg_no}
              editable={isEditable}
              onSave={(v) =>
                handleFieldSave("program_choice", "jamb_reg_no", v)
              }
            />
            <EditableField
              label="JAMB Score"
              value={String(program_choice.jamb_score)}
              type="number"
              editable={isEditable}
              onSave={(v) => handleFieldSave("program_choice", "jamb_score", v)}
            />
          </div>
        </SectionCard>

        {/* Academic Records */}
        <SectionCard title="Academic Records" icon={BookOpen}>
          <div className="space-y-6">
            {academic_records.map((record, idx) => (
              <div key={idx} className="space-y-4">
                {idx > 0 && <hr className="border-border" />}
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Record {idx + 1}
                </p>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <EditableField
                    label="Institution"
                    value={record.institution}
                    editable={isEditable}
                    onSave={(v) =>
                      handleAcademicRecordSave(idx, "institution", v)
                    }
                  />
                  <EditableField
                    label="Qualification"
                    value={record.qualification}
                    editable={isEditable}
                    onSave={(v) =>
                      handleAcademicRecordSave(idx, "qualification", v)
                    }
                  />
                  <EditableField
                    label="Year Obtained"
                    value={record.year_obtained}
                    editable={isEditable}
                    onSave={(v) =>
                      handleAcademicRecordSave(idx, "year_obtained", v)
                    }
                  />
                  <EditableField
                    label="Grade"
                    value={record.grade}
                    editable={isEditable}
                    onSave={(v) => handleAcademicRecordSave(idx, "grade", v)}
                  />
                </div>
                {record.certificate_url && (
                  <div className="mt-2">
                    <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Certificate
                    </p>
                    {getFileKind(record.certificate_url) === "image" ? (
                      <ZoomableImage
                        src={record.certificate_url}
                        alt={`${record.qualification} certificate`}
                        title={`${record.institution} — ${record.qualification} Certificate`}
                        className="h-auto w-full max-w-sm overflow-hidden rounded-xl border border-border"
                      />
                    ) : (
                      <a
                        href={record.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-primary hover:underline"
                      >
                        <FileText size={16} />
                        View {record.qualification} certificate
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Documents */}
        <SectionCard title="Uploaded Documents" icon={FileText}>
          <DocumentList
            documents={documents}
            editable={isEditable}
            onRemove={handleDocumentRemove}
            onReplace={handleDocumentReplace}
            onAdd={handleDocumentAdd}
          />
        </SectionCard>
      </div>
    </div>
  )
}
