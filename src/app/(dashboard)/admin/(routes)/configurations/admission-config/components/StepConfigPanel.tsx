"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CopyPlus,
  ListTree,
  Lock,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { getStepIcon } from "@/lib/admissionStepIcons"
import { STAGE_TYPE_CATALOG, resolveStageType } from "@/lib/admission-catalog"
import type { AdmissionStepDefinition } from "@/types/admissionConfig"
import type { ScopedStepRow, StepOrigin } from "./step-scope"

interface StepConfigPanelProps {
  title: string
  description: string
  icon: LucideIcon
  rows: ScopedStepRow[]
  knownKeys: Set<string>
  /** Where an inherited row comes from, e.g. { default: "All programs" }. */
  originLabels: Record<StepOrigin, string>
  reorderable?: boolean
  canAdd?: boolean
  /** PROCESS panel — badges each stage with its type. */
  showStageType?: boolean
  onToggle: (step: AdmissionStepDefinition, next: boolean) => void
  onEdit: (step: AdmissionStepDefinition) => void
  onDelete: (step: AdmissionStepDefinition) => void
  onAdd: () => void
  onReorder?: (step: AdmissionStepDefinition, direction: "up" | "down") => void
  /** Copies an inherited step into the scope being edited. */
  onCustomise: (step: AdmissionStepDefinition) => void
  disabled?: boolean
  /** FORM-group panel only — opens the field composer for a step. See
   *  sandbox/multi-program-platform/ §B. */
  onManageFields?: (step: AdmissionStepDefinition) => void
}

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

export default function StepConfigPanel({
  title,
  description,
  icon: HeaderIcon,
  rows,
  knownKeys,
  originLabels,
  reorderable,
  canAdd = true,
  showStageType,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  onReorder,
  onCustomise,
  onManageFields,
  disabled,
}: StepConfigPanelProps) {
  const enabledCount = rows.filter(
    ({ step }) => step.enabled || step.required
  ).length

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <HeaderIcon size={17} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-success/30 text-success">
            {enabledCount}/{rows.length} on
          </Badge>
          {canAdd && (
            <Button
              size="icon-sm"
              variant="outline"
              onClick={onAdd}
              disabled={disabled}
              title="Add step"
              aria-label={`Add a step to ${title}`}
            >
              <Plus className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="divide-y divide-border"
      >
        {rows.map(({ step, origin, own, overrides, offButStillShown }, idx) => {
          const Icon = getStepIcon(step.icon)
          const isOn = step.enabled || step.required
          const isCustom = !knownKeys.has(step.key)
          const stageType = showStageType ? resolveStageType(step) : null

          return (
            <motion.li
              key={step.id}
              layout
              variants={rowVariants}
              className={cn(
                "flex items-start gap-3 px-5 py-4 transition-colors",
                !own ? "bg-muted/20" : isOn ? "bg-success/3" : "bg-transparent"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  own && isOn
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon size={15} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      own ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.required && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Lock size={10} data-icon="inline-start" />
                      Required
                    </Badge>
                  )}
                  {showStageType && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        stageType
                          ? "border-primary/30 text-primary"
                          : "border-amber-500/40 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {stageType
                        ? STAGE_TYPE_CATALOG[stageType].label
                        : "No type"}
                    </Badge>
                  )}
                  {isCustom && !stageType && (
                    <Badge
                      variant="outline"
                      className="gap-1 text-[10px]"
                      title="No matching UI on the student pages yet"
                    >
                      <Sparkles size={10} data-icon="inline-start" />
                      Custom
                    </Badge>
                  )}
                  {!own && (
                    <Badge variant="outline" className="text-[10px]">
                      Inherited · {originLabels[origin]}
                    </Badge>
                  )}
                  {overrides && (
                    <Badge
                      variant="outline"
                      className="border-primary/30 text-[10px] text-primary"
                    >
                      Customised
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>
                {own && offButStillShown && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                    Off here, but applicants still see the inherited version —
                    the backend doesn&apos;t hide inherited steps yet.
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {reorderable && (
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => onReorder?.(step, "up")}
                      disabled={disabled || idx === 0}
                      aria-label={`Move ${step.label} up`}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReorder?.(step, "down")}
                      disabled={disabled || idx === rows.length - 1}
                      aria-label={`Move ${step.label} down`}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>
                )}

                {own ? (
                  <>
                    {onManageFields && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => onManageFields(step)}
                        disabled={disabled}
                        title="Manage this step's fields"
                        aria-label={`Manage fields for ${step.label}`}
                      >
                        <ListTree className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onEdit(step)}
                      disabled={disabled}
                      title="Edit step"
                      aria-label={`Edit ${step.label}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onDelete(step)}
                      disabled={disabled || step.required}
                      title={
                        step.required
                          ? "Required steps can't be deleted"
                          : overrides
                            ? "Delete this customisation (the inherited step comes back)"
                            : "Delete step"
                      }
                      aria-label={`Delete ${step.label}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                    <Switch
                      checked={isOn}
                      disabled={step.required || disabled}
                      onCheckedChange={(checked) => onToggle(step, checked)}
                      className="ml-1 data-checked:bg-success"
                      aria-label={`Toggle ${step.label}`}
                    />
                  </>
                ) : (
                  <>
                    <span className="mx-1 text-xs text-muted-foreground">
                      {isOn ? "On" : "Off"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => onCustomise(step)}
                      disabled={disabled}
                      aria-label={`Customise ${step.label} here`}
                    >
                      <CopyPlus className="size-3.5" />
                      Customise here
                    </Button>
                  </>
                )}
              </div>
            </motion.li>
          )
        })}
      </motion.ul>
    </div>
  )
}
