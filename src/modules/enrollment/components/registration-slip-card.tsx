"use client"

import { useMemo, useState } from "react"
import { Download, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { UNIVERSITY_LOGO_URL, UNIVERSITY_NAME } from "@/config/global.config"
import { useMyStudent } from "@/hooks/use-my-student-id"
import { useMyActiveSession } from "@/hooks/use-my-active-session"
import { useAppStore } from "@/store"
import { buildRegistrationSlip } from "../lib/registration-slip"
import type { RegistrationContext } from "../types"

interface RegistrationSlipCardProps {
  context: RegistrationContext
}

// Printable list of this semester's registered courses. Shown once the
// student has registered at least one course.
export function RegistrationSlipCard({ context }: RegistrationSlipCardProps) {
  const { student } = useMyStudent()
  const { session } = useMyActiveSession()
  const avatar = useAppStore((s) => s.user?.avatar ?? null)
  const slip = useMemo(() => buildRegistrationSlip(context), [context])
  const [busy, setBusy] = useState(false)

  if (slip.rows.length === 0) return null

  const download = async () => {
    if (!student) {
      toast.error("Your student record isn't loaded yet. Try again shortly.")
      return
    }
    setBusy(true)
    try {
      const { generateRegistrationSlipPdf } =
        await import("../lib/generate-registration-slip-pdf")
      await generateRegistrationSlipPdf({
        institutionName: UNIVERSITY_NAME,
        institutionLogoUrl: UNIVERSITY_LOGO_URL,
        sessionName: session?.name ?? null,
        student: {
          fullName: [
            student.user.first_name,
            student.user.middle_name,
            student.user.last_name,
          ]
            .filter(Boolean)
            .join(" "),
          matricNumber: student.matric_number ?? "",
          program: student.program_name ?? "",
          department: student.department_name ?? "",
          level:
            student.current_level != null ? `${student.current_level}L` : "",
          // The passport photo from admission (Students - Show, 2026-09-28)
          // is the right photo for an official slip; the account avatar is
          // the fallback for students without one.
          photoUrl: student.passport_photo ?? avatar,
        },
        slip,
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Couldn't create the slip: ${error.message}`
          : "Couldn't create the slip."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-labelledby="registration-slip-title"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="size-4" aria-hidden />
        </div>
        <div>
          <h2
            id="registration-slip-title"
            className="text-sm font-semibold text-foreground"
          >
            Registration slip
          </h2>
          <p className="text-xs text-muted-foreground">
            {slip.rows.length} course{slip.rows.length === 1 ? "" : "s"} ·{" "}
            {slip.totalUnits} credit units registered for {slip.semesterName}.
            Adviser and HOD approval isn&apos;t recorded on the portal yet, so
            the slip doesn&apos;t carry it.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={() => void download()}
        disabled={busy}
        className="shrink-0"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Download className="size-4" aria-hidden />
        )}
        Download slip
      </Button>
    </section>
  )
}
