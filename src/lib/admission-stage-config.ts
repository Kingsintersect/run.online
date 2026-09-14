import {
  BUILT_IN_STAGE_CONFIG_BY_KEY,
  BUILT_IN_STAGE_TYPE_BY_KEY,
  defaultStageConfig,
  resolveStageType,
} from "@/lib/admission-catalog"
import { stageConfigSchemas } from "@/schemas/admission-dynamic.schema"
import type {
  AdmissionStepDefinition,
  StageConfig,
  StageConfigByType,
  StageType,
} from "@/types/admissionConfig"

// Shared by the admin stage editor and the applicant process page —
// sandbox/dynamic-admission/API_CONTRACTS.md §2.2.

/** A stage type together with config of that exact type. */
export type TypedStageConfig = {
  [K in StageType]: { type: K; config: StageConfigByType[K] }
}[StageType]

/** Uses `config` when it's valid for `type`, otherwise the type's defaults. */
export function toTypedStageConfig<T extends StageType>(
  type: T,
  config?: StageConfig | null
): TypedStageConfig {
  const parsed = config ? stageConfigSchemas[type].safeParse(config) : null
  const next = parsed?.success ? parsed.data : defaultStageConfig(type)
  // `type` and `next` are both keyed by T, so they always match; TypeScript
  // just can't narrow a generic into the union by itself.
  return { type, config: next } as TypedStageConfig
}

/** A PROCESS step's type and config — its own, or its built-in key's — or null if it has no type. */
export function typedStageConfigForStep(
  step: Pick<AdmissionStepDefinition, "key" | "type" | "config">
): TypedStageConfig | null {
  const type = resolveStageType(step)
  if (!type) return null
  return toTypedStageConfig(
    type,
    step.config ?? BUILT_IN_STAGE_CONFIG_BY_KEY[step.key] ?? null
  )
}

export function typedStageConfigForBuiltInKey(
  key: string
): TypedStageConfig | null {
  const type = BUILT_IN_STAGE_TYPE_BY_KEY[key]
  return type
    ? toTypedStageConfig(type, BUILT_IN_STAGE_CONFIG_BY_KEY[key])
    : null
}
