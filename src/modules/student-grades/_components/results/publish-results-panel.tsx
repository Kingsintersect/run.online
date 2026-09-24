"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Send, Wallet } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"
import { useResultsPublishPreview } from "../../hooks/use-results"
import { usePublishResults } from "../../hooks/use-results-mutations"
import { PublishRequestSchema } from "../../schemas"
import { toResultsApiError } from "../../lib/results-errors"
import { NotAvailableNotice } from "./not-available-notice"
import { SelectField, toId } from "./select-field"
import { SemesterPicker } from "./semester-picker"
import type { PublishResultSummary } from "../../types"

// Screen D (gate results.publish — ADMIN and SUPER_ADMIN only). Replaces
// the old client-side counting with GET /results/publish/preview. Publishing
// itself uses the existing, already-live POST /results/grades/publish/:id,
// so an admin can always publish the final results — while the preview
// endpoint isn't live, the screen says so and the server's own
// published/withheld counts are shown after confirming.
export function PublishResultsPanel() {
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [semesterId, setSemesterId] = useState<number | null>(null)
  const [majorProgramId, setMajorProgramId] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [result, setResult] = useState<PublishResultSummary | null>(null)

  const { withinScope } = useMajorProgramScope()
  const { data: majorProgramsRes } = useMajorPrograms()
  const majorPrograms = (majorProgramsRes?.data ?? []).filter((m) =>
    withinScope(m.id)
  )

  const preview = useResultsPublishPreview(semesterId, majorProgramId)
  const publish = usePublishResults()
  const previewData = preview.data?.available ? preview.data.data : null
  const totals = previewData?.programs.reduce(
    (acc, p) => ({
      approved: acc.approved + p.approved,
      wouldPublish: acc.wouldPublish + p.wouldPublish,
      wouldWithhold: acc.wouldWithhold + p.wouldWithhold,
    }),
    { approved: 0, wouldPublish: 0, wouldWithhold: 0 }
  )
  const nothingToPublish = previewData != null && totals?.wouldPublish === 0

  const doPublish = async () => {
    if (!semesterId) return
    const body = PublishRequestSchema.parse({
      majorProgramId: majorProgramId ?? undefined,
    })
    try {
      const res = await publish.mutateAsync({ semesterId, body })
      setResult(res)
      setConfirmOpen(false)
      toast.success(`${res.published} results published.`)
    } catch (error) {
      if (error instanceof Error) toast.error(toResultsApiError(error).message)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-foreground">
          Publish results
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Publishing releases every approved sheet in the semester to students
          and recalculates their GPA/CGPA. Students with outstanding mandatory
          fees are withheld when the major program&apos;s fee gate is on, and
          picked up by a later publish once they&apos;ve paid.
        </p>
      </header>

      <div className="grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
        <SemesterPicker
          idPrefix="pub"
          sessionId={sessionId}
          semesterId={semesterId}
          onSessionChange={(id) => {
            setSessionId(id)
            setSemesterId(null)
            setResult(null)
          }}
          onSemesterChange={(id) => {
            setSemesterId(id)
            setResult(null)
          }}
        />
        <SelectField
          id="pub-major-program"
          label="Major program"
          value={majorProgramId ? String(majorProgramId) : ""}
          onChange={(v) => {
            setMajorProgramId(toId(v))
            setResult(null)
          }}
          placeholder="All in my scope"
          options={majorPrograms.map((m) => ({
            value: String(m.id),
            label: m.name,
          }))}
        />
      </div>

      {!semesterId ? (
        <EmptyState
          icon={Send}
          title="Choose a semester"
          description="Pick the session and semester whose approved results you want to publish."
        />
      ) : preview.isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted/40" aria-busy />
      ) : preview.isError ? (
        <EmptyState
          icon={Send}
          title="Couldn't load the publish preview"
          description={preview.error.message}
        />
      ) : (
        <section className="space-y-4">
          {preview.data?.available === false && (
            <NotAvailableNotice
              title="The publish preview isn't available on the server yet"
              description="You can still publish: approved results for this semester are released, and the server reports how many were published and withheld."
            />
          )}

          {previewData && totals && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Approved", value: totals.approved },
                  { label: "Would publish", value: totals.wouldPublish },
                  { label: "Would withhold", value: totals.wouldWithhold },
                  {
                    label: "Sheets not yet approved",
                    value: previewData.sheetsNotApproved,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {s.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="size-3.5" aria-hidden />
                Fee gate is{" "}
                <strong className="text-foreground">
                  {previewData.feeGateEnabled ? "on" : "off"}
                </strong>
                {previewData.feeGateEnabled
                  ? " — students owing mandatory fees will be withheld."
                  : " — every approved result will be published."}
                <span className="text-[11px]">
                  (as reported by the publish preview)
                </span>
              </p>
              {previewData.programs.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                  <table className="w-full min-w-[520px] text-sm">
                    <caption className="sr-only">
                      Publish preview by program
                    </caption>
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                        <th scope="col" className="px-3 py-2.5">
                          Program
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-right">
                          Approved
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-right">
                          Would publish
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-right">
                          Would withhold
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.programs.map((p) => (
                        <tr
                          key={p.programId}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="px-3 py-2">{p.programName}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {p.approved}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {p.wouldPublish}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {p.wouldWithhold}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {previewData.sheetsNotApproved > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {previewData.sheetsNotApproved} sheet
                  {previewData.sheetsNotApproved === 1
                    ? " isn't"
                    : "s aren't"}{" "}
                  approved yet and won&apos;t be published.
                </p>
              )}
            </>
          )}

          <Button
            onClick={() => {
              setAcknowledged(false)
              setConfirmOpen(true)
            }}
            disabled={nothingToPublish || publish.isPending}
          >
            <Send className="size-4" aria-hidden /> Publish results…
          </Button>

          {result && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4"
            >
              <CheckCircle2
                className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <div className="text-sm">
                <p className="font-semibold text-foreground">
                  {result.published} result{result.published === 1 ? "" : "s"}{" "}
                  published
                </p>
                <p className="text-muted-foreground">
                  {result.withheld != null
                    ? `${result.withheld} withheld for outstanding fees`
                    : "Withheld count not reported by the server"}
                  {result.sheetsAffected != null &&
                    ` · ${result.sheetsAffected} sheets affected`}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish these results?</AlertDialogTitle>
            <AlertDialogDescription>
              Students will see their results immediately and receive a
              notification. After publishing, only a super admin can amend a
              result.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            I understand students will be notified and can see these results.
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={doPublish}
              disabled={!acknowledged || publish.isPending}
            >
              {publish.isPending && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              Publish
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
