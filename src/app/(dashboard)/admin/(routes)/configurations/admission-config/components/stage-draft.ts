import {
  toTypedStageConfig,
  typedStageConfigForBuiltInKey,
  typedStageConfigForStep,
  type TypedStageConfig,
} from "@/lib/admission-stage-config"
import { stageConfigSchemas } from "@/schemas/admission-dynamic.schema"

/** A stage type together with config of that exact type. */
export type StageDraft = TypedStageConfig

export const makeStageDraft = toTypedStageConfig
export const stageDraftForStep = typedStageConfigForStep
export const stageDraftForBuiltInKey = typedStageConfigForBuiltInKey

/** Errors keyed by config path, e.g. { "documents.0.key": "…" }. Empty when valid. */
export function validateStageDraft(draft: StageDraft): Record<string, string> {
  const result = stageConfigSchemas[draft.type].safeParse(draft.config)
  if (result.success) return {}
  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.map(String).join(".")
    if (!errors[path]) errors[path] = issue.message
  }
  return errors
}
