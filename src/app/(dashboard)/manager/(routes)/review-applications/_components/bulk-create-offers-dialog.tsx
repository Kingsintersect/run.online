"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { useLevels } from "@/hooks/useCourseStructure"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { courseStructureQueryOptions } from "@/services/courseStructureApi"
import {
  admissionOfferApi,
  admissionOfferKeys,
  admissionOfferMutationOptions,
} from "@/services/admissionOfferApi"
import { applicationReviewKeys } from "@/services/applicationReviewApi"
import {
  bulkCreateAdmissionOffersSchema,
  type BulkCreateAdmissionOffersFormValues,
} from "@/schemas/school.schema"
import type { AdmissionApplication, ProgramCategory } from "@/types/school"

interface BulkCreateOffersDialogProps {
  open: boolean
  onClose: () => void
  /** The selected, already-approved applications to mint offers for. */
  applications: AdmissionApplication[]
  onDone: () => void
}

const CATEGORY_LABELS: Record<ProgramCategory, string> = {
  DEGREE: "Degree",
  POSTGRADUATE: "Postgraduate",
  CERTIFICATE: "Certificate",
  DIPLOMA: "Diploma",
  SECONDARY_SCHOOL: "Secondary School",
  FOUNDATIONAL: "Foundational",
  PART_TIME: "Part-Time",
}

// Program Structure Depth — sandbox/program-structure-depth/. One offer per
// application. `programId` comes from each application's own first-choice
// program and `sessionId` from its admission cycle (mirroring the
// single-offer dialog on the detail page). Admission numbers have no
// server-side generator, so they're built here as `ADM-{year}-{seq}` per
// session — a best-effort suggestion; the backend rejects a duplicate and
// that row comes back `success: false`.
//
// Every selected application's target program has a `programCategory` that
// determines whether it needs a Level+Session (DEGREE/PART_TIME/…), Session
// only (FOUNDATIONAL), or a Cohort instead of either (CERTIFICATE) — see
// createAdmissionOfferSchema's note above and program-structure-depth's
// category-conditional table. A single bulk action can only sensibly apply
// one shared set of fields, so a mixed-category batch (or any CERTIFICATE
// application, whose Cohort is program-specific) is blocked here rather
// than silently offering the wrong shape to some applicants — the reviewer
// is pointed at the single-offer flow instead.
export function BulkCreateOffersDialog({
  open,
  onClose,
  applications,
  onDone,
}: BulkCreateOffersDialogProps) {
  const qc = useQueryClient()
  const { data: levelsData } = useLevels()
  const { data: sessions } = useAcademicSessions()
  const { data: programsRes } = useQuery({
    ...courseStructureQueryOptions.programs.list(),
    staleTime: 1000 * 60 * 30,
  })
  const levels = levelsData?.data ?? []
  const categoryByProgramId = useMemo(
    () =>
      new Map((programsRes?.data ?? []).map((p) => [p.id, p.programCategory])),
    [programsRes]
  )

  const [results, setResults] = useState<
    { applicationId: number; success: boolean; error?: string }[] | null
  >(null)

  // Every application's category, resolved via its first-choice program.
  // Unknown (program list not loaded yet, or an unmatched id) falls back to
  // DEGREE — the strictest shape (requires level+session) — rather than
  // silently skipping validation for it.
  const categories = applications.map(
    (a) =>
      categoryByProgramId.get(
        Number(a.program_choice.first_choice_program_id)
      ) ?? "DEGREE"
  )
  const distinctCategories = [...new Set(categories)]
  const sharedCategory: ProgramCategory | null =
    distinctCategories.length === 1 ? distinctCategories[0] : null
  const isMixedBatch = distinctCategories.length > 1
  const isCertificateBatch = sharedCategory === "CERTIFICATE"
  const requiresLevel = sharedCategory !== "FOUNDATIONAL"
  const canBulkCreate = !!sharedCategory && !isCertificateBatch

  const form = useForm<BulkCreateAdmissionOffersFormValues>({
    resolver: zodResolver(bulkCreateAdmissionOffersSchema),
    defaultValues: {
      programCategory: undefined,
      levelId: null,
      admissionDate: new Date().toISOString().slice(0, 10),
      admissionType: "merit",
      expiryDate: "",
    },
  })

  useEffect(() => {
    if (open) {
      setResults(null)
      form.reset({
        programCategory: sharedCategory ?? undefined,
        levelId: null,
        admissionDate: new Date().toISOString().slice(0, 10),
        admissionType: "merit",
        expiryDate: "",
      })
    }
    // form is stable from RHF; re-run only when the dialog opens or the
    // resolved shared category changes (programs load asynchronously).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sharedCategory])

  const bulkCreate = useMutation({
    ...admissionOfferMutationOptions.bulkCreate(),
    onSuccess: (res) => {
      const rows = res.data
      setResults(rows)
      const ok = rows.filter((r) => r.success).length
      const failed = rows.length - ok
      if (failed === 0) {
        toast.success(`${ok} admission offer${ok === 1 ? "" : "s"} created`)
        qc.invalidateQueries({ queryKey: admissionOfferKeys.all })
        qc.invalidateQueries({ queryKey: applicationReviewKeys.all })
        onDone()
        onClose()
      } else {
        toast.warning(`${ok} created · ${failed} could not be created`)
        qc.invalidateQueries({ queryKey: admissionOfferKeys.all })
        qc.invalidateQueries({ queryKey: applicationReviewKeys.all })
      }
    },
    onError: (e: Error) =>
      toast.error(e.message ?? "Bulk offer creation failed"),
  })

  const submit = form.handleSubmit(async (values) => {
    if (!canBulkCreate) return
    // Next admission-number sequence per distinct session — one lookup each,
    // then incremented locally as offers are assigned.
    const sessionIds = [
      ...new Set(applications.map((a) => Number(a.admission_cycle_id))),
    ].filter((id) => id > 0)

    const seqBySession = new Map<number, number>()
    await Promise.all(
      sessionIds.map(async (sessionId) => {
        try {
          const { meta } = await admissionOfferApi.list({
            sessionId,
            limit: 1,
          })
          seqBySession.set(sessionId, (meta?.total ?? 0) + 1)
        } catch {
          seqBySession.set(sessionId, 1)
        }
      })
    )

    const yearOf = (sessionId: number) => {
      const s = (sessions ?? []).find((x) => x.id === sessionId)
      return s?.name.match(/\d{4}/)?.[0] ?? String(new Date().getFullYear())
    }

    const payload = applications.map((a) => {
      const sessionId = Number(a.admission_cycle_id)
      const seq = seqBySession.get(sessionId) ?? 1
      seqBySession.set(sessionId, seq + 1)
      return {
        applicationId: Number(a.id),
        admissionNumber: `ADM-${yearOf(sessionId)}-${String(seq).padStart(5, "0")}`,
        programId: Number(a.program_choice.first_choice_program_id),
        levelId: requiresLevel ? values.levelId : null,
        sessionId,
        admissionDate: values.admissionDate,
        admissionType: values.admissionType,
        expiryDate: values.expiryDate || undefined,
      }
    })

    bulkCreate.mutate(payload)
  })

  const nameById = new Map(
    applications.map((a) => [
      Number(a.id),
      `${a.personal_info.first_name} ${a.personal_info.last_name}`,
    ])
  )

  const fieldCls =
    "w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Create ${applications.length} admission offer${
        applications.length === 1 ? "" : "s"
      }`}
      subtitle="Program and session are taken from each application; admission numbers are generated automatically."
      size="md"
      footer={
        results ? (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : !canBulkCreate ? (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={bulkCreate.isPending}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={bulkCreate.isPending}>
              {bulkCreate.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Create offers
            </Button>
          </>
        )
      }
    >
      {results ? (
        <div className="space-y-1.5">
          {results.map((r) => (
            <div
              key={r.applicationId}
              className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="text-foreground">
                {nameById.get(r.applicationId) ?? `#${r.applicationId}`}
              </span>
              <span
                className={
                  r.success
                    ? "shrink-0 text-emerald-600 dark:text-emerald-400"
                    : "shrink-0 text-right text-destructive"
                }
              >
                {r.success ? "Offer created" : (r.error ?? "Failed")}
              </span>
            </div>
          ))}
        </div>
      ) : isMixedBatch ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-foreground dark:bg-amber-500/10">
          This batch mixes program types with different admission requirements (
          {distinctCategories.map((c) => CATEGORY_LABELS[c]).join(", ")}
          ). Bulk offer creation only supports one program type at a time —
          select applications for a single program type, or create offers
          individually from each application&apos;s page.
        </p>
      ) : isCertificateBatch ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-foreground dark:bg-amber-500/10">
          Certificate admissions are offered by assigning a Cohort, not a level
          and session — and a cohort is specific to each program, so it
          can&apos;t be set in bulk. Open each application individually, or
          manage sittings from Course Structure → Cohorts.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {requiresLevel && (
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Level
                </label>
                <select
                  value={form.watch("levelId") ?? 0}
                  onChange={(e) =>
                    form.setValue("levelId", Number(e.target.value) || null, {
                      shouldValidate: true,
                    })
                  }
                  className={fieldCls}
                >
                  <option value={0}>Select level</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.levelId && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.levelId.message}
                  </p>
                )}
              </div>
            )}
            <div className={requiresLevel ? undefined : "col-span-2"}>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Admission Type
              </label>
              <input
                {...form.register("admissionType")}
                placeholder="merit, catchment…"
                className={fieldCls}
              />
              {form.formState.errors.admissionType && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.admissionType.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Admission Date
              </label>
              <input
                type="date"
                {...form.register("admissionDate")}
                className={fieldCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Offer Expiry (optional)
              </label>
              <input
                type="date"
                {...form.register("expiryDate")}
                className={fieldCls}
              />
            </div>
          </div>

          {!requiresLevel && (
            <p className="text-[11px] text-muted-foreground">
              {CATEGORY_LABELS[sharedCategory ?? "FOUNDATIONAL"]} programs
              don&apos;t use a Level — these offers will be created with the
              application&apos;s session only.
            </p>
          )}

          <p className="text-[11px] text-muted-foreground">
            Applies to{" "}
            {applications
              .slice(0, 3)
              .map(
                (a) =>
                  `${a.personal_info.first_name} ${a.personal_info.last_name}`
              )
              .join(", ")}
            {applications.length > 3 ? ` +${applications.length - 3} more` : ""}
            .
          </p>
        </div>
      )}
    </Modal>
  )
}
