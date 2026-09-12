"use client"

import { useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { BookOpen, Monitor, Building2 } from "lucide-react"
import { useFormContext } from "react-hook-form"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { FormSelect } from "../FormFields"
import { ENTRY_MODES } from "../../schema/admission-schema"
import type { FormDefaultValues } from "../../types/form-types"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const },
}

const ENTRY_MODE_LABELS: Record<(typeof ENTRY_MODES)[number], string> = {
  UTME: "UTME",
  DIRECT_ENTRY: "Direct Entry",
  TRANSFER: "Transfer",
}

const studyModeCards = [
  {
    value: "online" as const,
    label: "Online Learning",
    description:
      "Study remotely from anywhere. Access lectures, materials, and assessments online.",
    icon: Monitor,
  },
  {
    value: "offline" as const,
    label: "On-Campus",
    description:
      "Attend classes in person at the university campus with face-to-face interactions.",
    icon: Building2,
  },
]

export default function ProgramSelectionStep() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<FormDefaultValues>()
  const studyMode = watch("studyMode")
  const programId = watch("programId")

  const {
    data: programsData,
    isLoading: isLoadingPrograms,
    isError: isProgramsError,
  } = useAllPrograms()
  const { data: sessions } = useAcademicSessions()

  const activeSession = useMemo(
    () => sessions?.find((s) => s.isActive) ?? null,
    [sessions]
  )

  useEffect(() => {
    if (activeSession) {
      setValue("startTerm", activeSession.name, { shouldValidate: true })
    }
  }, [activeSession, setValue])

  const programOptions = (programsData?.data ?? []).map((p) => ({
    value: String(p.id),
    label: `${p.name} (${p.code})`,
  }))
  const noProgramsAvailable =
    !isLoadingPrograms && !isProgramsError && programOptions.length === 0

  // TEMPORARY: DEFAULT_FORM_VALUES.programId is a hardcoded placeholder (see
  // form-types.ts) that may not correspond to a real Program in this
  // deployment, which the backend rejects at submit time ("The selected
  // program id is invalid"). Once the real program list loads, self-correct
  // to an actually-selectable program instead of trusting the placeholder.
  useEffect(() => {
    if (!programsData?.data?.length) return
    const currentIsValid = programsData.data.some((p) => p.id === programId)
    if (!currentIsValid) {
      setValue("programId", programsData.data[0].id, { shouldValidate: true })
    }
  }, [programsData, programId, setValue])

  const entryModeOptions = ENTRY_MODES.map((mode) => ({
    value: mode,
    label: ENTRY_MODE_LABELS[mode],
  }))

  return (
    <motion.div className="space-y-6" {...fadeInUp}>
      <div>
        <h3 className="text-lg font-semibold">Program Selection</h3>
        <p className="text-sm text-muted-foreground">
          Choose your desired program, entry mode, and preferred study mode.
        </p>
      </div>

      <div className="space-y-2">
        <Label>
          Program <span className="text-destructive">*</span>
        </Label>
        <Select
          value={programId ? String(programId) : ""}
          onValueChange={(val) =>
            setValue("programId", Number(val), {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          disabled={isLoadingPrograms || isProgramsError || noProgramsAvailable}
        >
          <SelectTrigger className="w-full">
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
            Couldn&apos;t load the list of programs. Please refresh the page or
            contact the admissions office if this keeps happening.
          </p>
        )}
        {noProgramsAvailable && (
          <p className="text-sm text-muted-foreground">
            No programs have been set up for this institution yet. Please
            contact the admissions office.
          </p>
        )}
        {errors.programId?.message && (
          <p className="text-sm text-destructive">{errors.programId.message}</p>
        )}
      </div>

      <FormSelect
        name="entryMode"
        label="Entry Mode"
        required
        options={entryModeOptions}
      />

      <div className="space-y-2">
        <Label>
          Start Term <span className="text-destructive">*</span>
        </Label>
        <Input
          value={activeSession?.name ?? "Resolving current session…"}
          disabled
          className="disabled:opacity-70"
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">
          Study Mode <span className="text-destructive">*</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {studyModeCards.map((mode) => {
            const Icon = mode.icon
            const isSelected = studyMode === mode.value
            const isDisabled = mode.value === "offline"

            return (
              <motion.button
                key={mode.value}
                type="button"
                whileHover={isDisabled ? undefined : { scale: 1.02 }}
                whileTap={isDisabled ? undefined : { scale: 0.98 }}
                onClick={() =>
                  !isDisabled &&
                  setValue("studyMode", mode.value, { shouldDirty: true })
                }
                disabled={isDisabled}
                className={cn(
                  "relative flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all",
                  isDisabled
                    ? "cursor-not-allowed border-border opacity-50"
                    : isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                )}
              >
                {isDisabled && (
                  <Badge
                    variant="secondary"
                    className="absolute top-3 right-3 text-xs"
                  >
                    Coming Soon
                  </Badge>
                )}
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
                  <motion.div
                    layoutId="study-mode-check"
                    className="ml-auto rounded-full bg-primary p-0.5"
                  >
                    <BookOpen className="size-3.5 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
