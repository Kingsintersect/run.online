"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  Lock,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Sparkles,
  ListTree,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { getStepIcon } from "@/lib/admissionStepIcons"
import type { AdmissionStepDefinition } from "@/types/admissionConfig"

interface StepConfigPanelProps {
  title: string
  description: string
  icon: LucideIcon
  items: AdmissionStepDefinition[]
  knownKeys: Set<string>
  reorderable?: boolean
  onToggle: (step: AdmissionStepDefinition, next: boolean) => void
  onEdit: (step: AdmissionStepDefinition) => void
  onDelete: (step: AdmissionStepDefinition) => void
  onAdd: () => void
  onReorder?: (step: AdmissionStepDefinition, direction: "up" | "down") => void
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
  items,
  knownKeys,
  reorderable,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  onReorder,
  onManageFields,
  disabled,
}: StepConfigPanelProps) {
  const enabledCount = items.filter((s) => s.enabled || s.required).length

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
            {enabledCount}/{items.length} on
          </Badge>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={onAdd}
            disabled={disabled}
            title="Add step"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>

      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="divide-y divide-border"
      >
        {items.map((step, idx) => {
          const Icon = getStepIcon(step.icon)
          const isOn = step.enabled || step.required
          const isCustom = !knownKeys.has(step.key)

          return (
            <motion.li
              key={step.id}
              layout
              variants={rowVariants}
              className={cn(
                "flex items-start gap-3 px-5 py-4 transition-colors",
                isOn ? "bg-success/3" : "bg-transparent"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isOn
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon size={15} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {step.label}
                  </p>
                  {step.required && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Lock size={10} data-icon="inline-start" />
                      Required
                    </Badge>
                  )}
                  {isCustom && (
                    <Badge
                      variant="outline"
                      className="gap-1 text-[10px]"
                      title="No matching UI on the student pages yet"
                    >
                      <Sparkles size={10} data-icon="inline-start" />
                      Custom
                    </Badge>
                  )}
                  {(step.programId || step.programCategory) && (
                    <Badge
                      variant="outline"
                      className="gap-1 text-[10px]"
                      title="Multi-Program Platform — see sandbox/multi-program-platform/"
                    >
                      {step.programId
                        ? `Program #${step.programId}`
                        : step.programCategory?.replace("_", " ")}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {reorderable && (
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => onReorder?.(step, "up")}
                      disabled={disabled || idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReorder?.(step, "down")}
                      disabled={disabled || idx === items.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>
                )}
                {onManageFields && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => onManageFields(step)}
                    disabled={disabled}
                    title="Manage this step's fields"
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
                      : "Delete step"
                  }
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
              </div>
            </motion.li>
          )
        })}
      </motion.ul>
    </div>
  )
}
