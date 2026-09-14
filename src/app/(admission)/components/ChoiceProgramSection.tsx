"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  BookOpen,
  Building2,
  GraduationCap,
  Loader2,
  Monitor,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { resolveActiveSession } from "@/lib/academic/resolve-active-session"
import type { ProgramChoiceStageConfig } from "@/types/admissionConfig"
import { useSubmitProgramChoice } from "../hooks/useAdmissionQueries"
import type { EntryMode, StepSectionProps, StudyMode } from "../types/admission"

const ENTRY_MODES: { value: EntryMode; label: string }[] = [
  { value: "UTME", label: "UTME" },
  { value: "DIRECT_ENTRY", label: "Direct Entry" },
  { value: "TRANSFER", label: "Transfer" },
]

const STUDY_MODE_CARDS: {
  value: StudyMode
  label: string
  description: string
  icon: typeof Monitor
  disabled?: boolean
}[] = [
  {
    value: "online",
    label: "Online Learning",
    description:
      "Study remotely from anywhere. Access lectures, materials, and assessments online.",
    icon: Monitor,
  },
  {
    value: "offline",
    label: "On-Campus",
    description:
      "Attend classes in person at the university campus with face-to-face interactions.",
    icon: Building2,
    disabled: true,
  },
]

interface ChoiceProgramSectionProps extends StepSectionProps {
  /** The stage's settings — which extras to ask for. All asked when omitted. */
  config?: ProgramChoiceStageConfig
  title?: string
  description?: string
}

export function ChoiceProgramSection({
  student,
  onRefresh,
  config,
  title,
  description,
}: ChoiceProgramSectionProps) {
  const collectEntryMode = config?.collectEntryMode ?? true
  const collectStudyMode = config?.collectStudyMode ?? true
  const collectStartTerm = config?.collectStartTerm ?? true

  const {
    data: programsData,
    isLoading: isLoadingPrograms,
    isError: isProgramsError,
  } = useAllPrograms()
  const { data: sessions } = useAcademicSessions()
  const submitChoice = useSubmitProgramChoice()

  const [programId, setProgramId] = useState<number | null>(student.program_id)

  // Major-Program Scoping — if the applicant already picked a major program
  // (the "Major Program Choice" stage, when one precedes this one), only
  // offer programs under it. No major program chosen (that stage isn't
  // configured, or hasn't run yet) means every program stays offered —
  // unchanged from before this existed.
  const allPrograms = useMemo(() => programsData?.data ?? [], [programsData])
  const scopedPrograms = useMemo(
    () =>
      student.major_program_id
        ? allPrograms.filter(
            (p) => p.majorProgramId === student.major_program_id
          )
        : allPrograms,
    [allPrograms, student.major_program_id]
  )

  // Major-Program Scoping — the active session for the chosen program's major program.
  const selectedMajorProgramId = allPrograms.find(
    (p) => p.id === programId
  )?.majorProgramId
  const activeSession = useMemo(
    () => resolveActiveSession(sessions, selectedMajorProgramId),
    [sessions, selectedMajorProgramId]
  )
  const startTerm = activeSession?.name ?? student.session
  const [entryMode, setEntryMode] = useState<EntryMode | "">(
    student.entry_mode ?? ""
  )
  const [studyMode, setStudyMode] = useState<StudyMode>(
    student.study_mode ?? "online"
  )

  const programOptions = scopedPrograms.map((p) => ({
    value: String(p.id),
    label: `${p.name} (${p.code})`,
  }))
  const noProgramsAvailable =
    !isLoadingPrograms && !isProgramsError && programOptions.length === 0

  const canSubmit = !!programId && (!collectEntryMode || !!entryMode)

  const handleSubmit = async () => {
    if (!programId || (collectEntryMode && !entryMode)) {
      toast.error(
        collectEntryMode
          ? "Please select a program and entry mode to continue."
          : "Please select a program to continue."
      )
      return
    }
    try {
      await submitChoice.mutateAsync({
        programId,
        // Extras the stage doesn't ask for keep the applicant's earlier answer or the default.
        entryMode: entryMode || student.entry_mode || "UTME",
        studyMode,
        startTerm,
      })
      toast.success("Program choice saved")
      onRefresh()
    } catch {
      toast.error(
        "Couldn't save your program choice. Please try again shortly."
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden border-border/50 shadow-lg">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 dark:bg-primary/20">
              <GraduationCap className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {title ?? "Choose Your Program"}
              </CardTitle>
              <CardDescription>
                {description ??
                  "Select the program you're applying for before continuing with your admission"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          <div className="space-y-2">
            <Label htmlFor="choice-program">
              Program <span className="text-destructive">*</span>
            </Label>
            <Select
              value={programId ? String(programId) : ""}
              onValueChange={(val) => setProgramId(Number(val))}
              disabled={
                isLoadingPrograms || isProgramsError || noProgramsAvailable
              }
            >
              <SelectTrigger id="choice-program" className="w-full">
                <SelectValue
                  placeholder={
                    isLoadingPrograms
                      ? "Loading programs…"
                      : isProgramsError
                        ? "Couldn't load programs"
                        : noProgramsAvailable
                          ? "No programs available"
                          : "Select a program"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {programOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isProgramsError && (
              <p className="text-sm text-destructive">
                Couldn&apos;t load the list of programs. Please refresh the page
                or contact the admissions office if this keeps happening.
              </p>
            )}
            {noProgramsAvailable && (
              <p className="text-sm text-muted-foreground">
                {student.major_program_id && allPrograms.length > 0
                  ? `No programs have been set up under ${student.major_program_name ?? "this major program"} yet. Please contact the admissions office.`
                  : "No programs have been set up for this institution yet. Please contact the admissions office."}
              </p>
            )}
          </div>

          {collectEntryMode && (
            <div className="space-y-2">
              <Label htmlFor="choice-entry-mode">
                Entry Mode <span className="text-destructive">*</span>
              </Label>
              <Select
                value={entryMode}
                onValueChange={(val) => setEntryMode(val as EntryMode)}
              >
                <SelectTrigger id="choice-entry-mode" className="w-full">
                  <SelectValue placeholder="Select your entry mode" />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_MODES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {collectStartTerm && (
            <div className="space-y-2">
              <Label htmlFor="choice-start-term">Start Term</Label>
              <Input
                id="choice-start-term"
                value={startTerm}
                disabled
                className="disabled:opacity-70"
              />
            </div>
          )}

          {collectStudyMode && (
            <div className="space-y-3">
              <Label>
                Study Mode <span className="text-destructive">*</span>
              </Label>
              <div className="grid gap-4 sm:grid-cols-2">
                {STUDY_MODE_CARDS.map((mode) => {
                  const Icon = mode.icon
                  const isSelected = studyMode === mode.value

                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => !mode.disabled && setStudyMode(mode.value)}
                      disabled={mode.disabled}
                      aria-pressed={isSelected}
                      className={cn(
                        "relative flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all",
                        mode.disabled
                          ? "cursor-not-allowed border-border opacity-50"
                          : isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-lg p-2.5",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{mode.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {mode.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="ml-auto rounded-full bg-primary p-0.5">
                          <BookOpen className="size-3.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitChoice.isPending}
            className="btn-glow w-full gap-2"
            size="lg"
          >
            {submitChoice.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save and continue"
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
