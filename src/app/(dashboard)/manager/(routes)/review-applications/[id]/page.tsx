"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  Sparkles,
  User,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import EditableField from "@/components/custom/EditableField"
import SectionCard from "@/components/custom/SectionCard"
import DocumentList from "@/components/custom/DocumentList"
import StatusBadge from "@/components/custom/StatusBadge"
import Modal from "@/components/custom/Modal"
import { ZoomableImage } from "@/components/custom/ZoomableImage"
import { getFileKind } from "@/lib/utils"
import {
  applicationReviewApi,
  applicationReviewKeys,
  applicationReviewMutationOptions,
  applicationReviewQueryOptions,
} from "@/services/applicationReviewApi"
import {
  admissionOfferApi,
  admissionOfferKeys,
  admissionOfferMutationOptions,
  type AdmissionOffer,
} from "@/services/admissionOfferApi"
import { useAllPrograms, useLevels } from "@/hooks/useCourseStructure"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import {
  createAdmissionOfferSchema,
  type CreateAdmissionOfferFormValues,
} from "@/schemas/school.schema"
import type { ApplicationReviewStatus } from "@/types/school"

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
  pending: "Pending",
  under_review: "Under Review",
  approved: "Approved",
  denied: "Denied",
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [denyModalOpen, setDenyModalOpen] = useState(false)
  const [denyReason, setDenyReason] = useState("")
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false)
  const [createOfferOpen, setCreateOfferOpen] = useState(false)

  const {
    data: application,
    isLoading,
    isError,
    error,
  } = useQuery(applicationReviewQueryOptions.detail(id))

  // Admin editing of application fields/documents is intentionally not wired up:
  // PATCH /admissions/applications/:id (Applications - Update.bru) is applicant-only
  // (own application, SUBMITTED status only) per admission_README.md — an admission
  // officer has no real endpoint to edit another user's application. This view is
  // read-only for the officer; only the review decision (approve/deny) below is real.
  const reviewMutation = useMutation({
    ...applicationReviewMutationOptions.review(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: applicationReviewKeys.detail(id),
      })
      queryClient.invalidateQueries({ queryKey: applicationReviewKeys.all })
      toast.success(res.message ?? "Decision submitted")
      setDenyModalOpen(false)
      setConfirmApproveOpen(false)
    },
    onError: () => toast.error("Failed to submit decision"),
  })

  const { data: programs } = useAllPrograms()
  const { data: levelsData } = useLevels()
  const { data: sessions } = useAcademicSessions()
  const levels = levelsData?.data ?? []

  // There's no real "does this application already have an offer" lookup
  // endpoint (see admissionOfferApi.ts) — GET /admissions only filters by
  // sessionId/programId/status, not applicationId. Scoping the check to the
  // application's own program+session keeps it a bounded query instead of
  // fetching the entire admissions table, and covers every offer created the
  // normal way through this same dialog (which defaults to those same
  // values). It would miss an offer deliberately created under a different
  // program/session than the application requested — see
  // moodle_sync_BACKEND_GAPS.md-style follow-up: ideally GET /admissions
  // gains an applicationId filter, or the application response embeds its
  // own offer directly, so this doesn't need to guess.
  const applicationProgramId = Number(
    application?.program_choice.first_choice_program_id
  )
  const applicationSessionId = Number(application?.admission_cycle_id)
  const { data: offersForProgramSession } = useQuery({
    queryKey: admissionOfferKeys.list({
      programId: applicationProgramId,
      sessionId: applicationSessionId,
    }),
    queryFn: () =>
      admissionOfferApi.list({
        programId: applicationProgramId,
        sessionId: applicationSessionId,
        limit: 100,
      }),
    enabled: application?.status === "approved" && !!applicationProgramId,
  })
  const [createdOffer, setCreatedOffer] = useState<AdmissionOffer | null>(null)
  const existingOffer =
    createdOffer ??
    offersForProgramSession?.data.find((o) => o.applicationId === Number(id))

  const createOfferForm = useForm<CreateAdmissionOfferFormValues>({
    resolver: zodResolver(createAdmissionOfferSchema),
    defaultValues: {
      admissionNumber: "",
      programId: 0,
      levelId: 0,
      sessionId: 0,
      admissionDate: new Date().toISOString().slice(0, 10),
      admissionType: "merit",
      expiryDate: "",
    },
  })

  const createOfferMutation = useMutation({
    ...admissionOfferMutationOptions.create(),
    onSuccess: (res) => {
      setCreatedOffer(res.data)
      queryClient.invalidateQueries({
        queryKey: admissionOfferKeys.list({
          programId: applicationProgramId,
          sessionId: applicationSessionId,
        }),
      })
      toast.success("Admission offer created")
      setCreateOfferOpen(false)
    },
    onError: (err: Error) =>
      toast.error(
        err.message ??
          "Failed to create offer — an offer may already exist for this application"
      ),
  })

  const handleOpenCreateOffer = () => {
    createOfferForm.reset({
      admissionNumber: "",
      programId:
        Number(application?.program_choice.first_choice_program_id) || 0,
      levelId: 0,
      sessionId: Number(application?.admission_cycle_id) || 0,
      admissionDate: new Date().toISOString().slice(0, 10),
      admissionType: "merit",
      expiryDate: "",
    })
    setCreateOfferOpen(true)
  }

  // `admissionNumber` has no server-side generator (see
  // admission_README.md's CreateAdmissionRequest — it's a required,
  // client-supplied, unique string; the backend only rejects a duplicate,
  // it never invents one). Making an admin hand-type a unique, correctly
  // formatted number is exactly the kind of thing a real university system
  // wouldn't ask of a human, so this offers a best-effort suggestion —
  // `ADM-{sessionYear}-{nextSequence}` — that the admin can still edit
  // before submitting. It's a suggestion, not a guarantee: two admins
  // generating around the same time could collide, in which case the
  // create call 400s on the duplicate and the admin just generates again.
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false)
  const handleGenerateAdmissionNumber = async () => {
    const sessionId = createOfferForm.getValues("sessionId")
    if (!sessionId) {
      toast.error("Select a session first.")
      return
    }
    const session = (sessions ?? []).find((s) => s.id === sessionId)
    const year = session?.name.match(/\d{4}/)?.[0] ?? new Date().getFullYear()

    setIsGeneratingNumber(true)
    try {
      const { meta } = await admissionOfferApi.list({ sessionId, limit: 1 })
      const nextSequence = (meta?.total ?? 0) + 1
      createOfferForm.setValue(
        "admissionNumber",
        `ADM-${year}-${String(nextSequence).padStart(5, "0")}`,
        { shouldValidate: true }
      )
    } catch {
      toast.error("Couldn't generate a suggestion — enter one manually.")
    } finally {
      setIsGeneratingNumber(false)
    }
  }

  const handleCreateOffer = createOfferForm.handleSubmit((data) => {
    createOfferMutation.mutate({
      applicationId: Number(id),
      admissionNumber: data.admissionNumber,
      programId: data.programId,
      levelId: data.levelId,
      sessionId: data.sessionId,
      admissionDate: data.admissionDate,
      admissionType: data.admissionType,
      expiryDate: data.expiryDate || undefined,
    })
  })

  const handleApprove = () => {
    reviewMutation.mutate({ id, payload: { status: "approved" } })
  }

  const handleDeny = () => {
    if (!denyReason.trim()) {
      toast.error("Please provide a reason for denial")
      return
    }
    reviewMutation.mutate({
      id,
      payload: { status: "denied", denial_reason: denyReason },
    })
  }

  const canReview =
    application?.status === "pending" || application?.status === "under_review"

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">
          {error?.message ?? "Failed to load application"}
        </p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Application not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    )
  }

  const { personal_info, academic_records, program_choice, documents } =
    application

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-foreground">
                  {personal_info.last_name}, {personal_info.first_name}{" "}
                  {personal_info.middle_name}
                </h1>
                <StatusBadge
                  label={statusLabelMap[application.status]}
                  variant={statusVariantMap[application.status]}
                  dot
                />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Application ID: {application.id} &middot; Session:{" "}
                {application.session}
              </p>
            </div>
          </div>

          {canReview && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmApproveOpen(true)}
                disabled={reviewMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                Approve
              </button>
              <button
                onClick={() => setDenyModalOpen(true)}
                disabled={reviewMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle size={16} />
                Deny
              </button>
            </div>
          )}

          {application.status === "approved" && (
            <div className="flex items-center gap-2">
              {existingOffer ? (
                <button
                  disabled
                  title={`Admission number ${existingOffer.admissionNumber}`}
                  className="inline-flex cursor-default items-center gap-1.5 rounded-xl bg-emerald-600/15 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2 size={16} />
                  Admission Offer Created
                </button>
              ) : (
                <button
                  onClick={handleOpenCreateOffer}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Award size={16} />
                  Create Admission Offer
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Denial reason banner */}
        <AnimatePresence>
          {application.status === "denied" && application.denial_reason && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
            >
              <p className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">
                Denial Reason
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                {application.denial_reason}
              </p>
              <p className="mt-2 text-[11px] text-red-500/70">
                Reviewed by {application.reviewed_by} on{" "}
                {application.reviewed_at &&
                  new Date(application.reviewed_at).toLocaleDateString(
                    "en-NG",
                    { day: "numeric", month: "long", year: "numeric" }
                  )}
              </p>
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
                title={`${personal_info.first_name} ${personal_info.last_name} — Passport`}
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
            {/* Read-only: admission officers cannot edit application fields — see admission_README.md */}
            <EditableField
              label="First Name"
              value={personal_info.first_name}
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="Last Name"
              value={personal_info.last_name}
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="Middle Name"
              value={personal_info.middle_name}
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="Date of Birth"
              value={personal_info.date_of_birth}
              type="date"
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="Gender"
              value={personal_info.gender}
              editable={false}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
              onSave={() => {}}
            />
            <EditableField
              label="Nationality"
              value={personal_info.nationality}
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="State of Origin"
              value={personal_info.state_of_origin}
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="LGA"
              value={personal_info.lga}
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="Phone"
              value={personal_info.phone}
              type="tel"
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="Email"
              value={personal_info.email}
              type="email"
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="Address"
              value={personal_info.address}
              type="textarea"
              editable={false}
              onSave={() => {}}
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
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="Second Choice"
              value={program_choice.second_choice_program_name}
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="Entry Mode"
              value={program_choice.entry_mode}
              editable={false}
              options={[
                { value: "utme", label: "UTME" },
                { value: "direct_entry", label: "Direct Entry" },
                { value: "transfer", label: "Transfer" },
              ]}
              onSave={() => {}}
            />
            <EditableField
              label="JAMB Reg No."
              value={program_choice.jamb_reg_no}
              editable={false}
              onSave={() => {}}
            />
            <EditableField
              label="JAMB Score"
              value={String(program_choice.jamb_score)}
              type="number"
              editable={false}
              onSave={() => {}}
            />
          </div>
        </SectionCard>

        {/* Academic Records — view only */}
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
                    editable={false}
                    onSave={() => {}}
                  />
                  <EditableField
                    label="Qualification"
                    value={record.qualification}
                    editable={false}
                    onSave={() => {}}
                  />
                  <EditableField
                    label="Year Obtained"
                    value={record.year_obtained}
                    editable={false}
                    onSave={() => {}}
                  />
                  <EditableField
                    label="Grade"
                    value={record.grade}
                    editable={false}
                    onSave={() => {}}
                  />
                </div>
                {record.certificate_url && (
                  <div className="mt-2">
                    <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Certificate
                    </p>
                    {/* Certificates are uploaded as either an image or a PDF —
                        rendering everything through <img> silently broke for
                        PDFs (broken-image icon). Only images get the inline
                        thumbnail; anything else is a plain link to open it. */}
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

        {/* Documents — view + download; edits are applicant-scoped, not admin */}
        <SectionCard title="Uploaded Documents" icon={FileText}>
          <DocumentList
            documents={documents}
            editable={false}
            onDownload={(doc) =>
              applicationReviewApi.downloadDocument(id, doc.id)
            }
          />
        </SectionCard>

        {/* Approval Confirmation */}
        <Modal
          open={confirmApproveOpen}
          onClose={() => setConfirmApproveOpen(false)}
          title="Approve Application"
          subtitle={`Grant admission to ${personal_info.first_name} ${personal_info.last_name}?`}
          size="sm"
          footer={
            <>
              <button
                onClick={() => setConfirmApproveOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={reviewMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {reviewMutation.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Confirm Approval
              </button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            This will change the application status to <strong>Approved</strong>{" "}
            and notify the applicant. This action can be reviewed later but
            should be done carefully.
          </p>
        </Modal>

        {/* Deny Modal */}
        <Modal
          open={denyModalOpen}
          onClose={() => setDenyModalOpen(false)}
          title="Deny Application"
          subtitle={`Deny admission for ${personal_info.first_name} ${personal_info.last_name}?`}
          size="md"
          footer={
            <>
              <button
                onClick={() => setDenyModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDeny}
                disabled={reviewMutation.isPending || !denyReason.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {reviewMutation.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Confirm Denial
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Please provide a clear reason for denying this application. The
              applicant will be notified.
            </p>
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              rows={4}
              placeholder="e.g. JAMB score below cut-off, missing required documents…"
              className="w-full resize-none rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground transition-all outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </Modal>

        {/* Create Admission Offer Modal */}
        <Modal
          open={createOfferOpen}
          onClose={() => setCreateOfferOpen(false)}
          title="Create Admission Offer"
          subtitle={`Formally admit ${personal_info.first_name} ${personal_info.last_name}`}
          size="md"
          footer={
            <>
              <button
                onClick={() => setCreateOfferOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOffer}
                disabled={createOfferMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {createOfferMutation.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Create Offer
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Admission Number
              </label>
              <div className="flex gap-2">
                <input
                  {...createOfferForm.register("admissionNumber")}
                  placeholder="e.g. ADM-2026-00001"
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={handleGenerateAdmissionNumber}
                  disabled={isGeneratingNumber}
                  title="Suggest a number — you can still edit it before submitting"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {isGeneratingNumber ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Generate
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Suggested from the selected session — no two offers can share a
                number, so double-check it before submitting.
              </p>
              {createOfferForm.formState.errors.admissionNumber && (
                <p className="mt-1 text-xs text-destructive">
                  {createOfferForm.formState.errors.admissionNumber.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Program
                </label>
                <select
                  {...createOfferForm.register("programId", {
                    valueAsNumber: true,
                  })}
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value={0}>Select program</option>
                  {(programs?.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Level
                </label>
                <select
                  {...createOfferForm.register("levelId", {
                    valueAsNumber: true,
                  })}
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value={0}>Select level</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Session
                </label>
                <select
                  {...createOfferForm.register("sessionId", {
                    valueAsNumber: true,
                  })}
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value={0}>Select session</option>
                  {(sessions ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Admission Type
                </label>
                <input
                  {...createOfferForm.register("admissionType")}
                  placeholder="merit, catchment, transfer…"
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Admission Date
                </label>
                <input
                  type="date"
                  {...createOfferForm.register("admissionDate")}
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Offer Expiry (optional)
                </label>
                <input
                  type="date"
                  {...createOfferForm.register("expiryDate")}
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
