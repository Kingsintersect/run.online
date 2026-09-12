import { z } from "zod"
import { FEATURE_REGISTRY } from "@/config/featureRegistry"
import type { FeatureRegistryRecord } from "@/schemas/featureRegistry.schema"

type FlagFieldErrors = Record<string, string[]>

export const featureFlagMapSchema = z.record(z.string().min(1), z.boolean())

export type FeatureFlagMap = z.infer<typeof featureFlagMapSchema>

export const featureFlagPayloadSchema = z.object({
  instanceId: z.string().min(1, "Instance ID is required"),
  flags: featureFlagMapSchema,
})

export type FeatureFlagPayload = z.infer<typeof featureFlagPayloadSchema>

export type FeatureValidationResult = {
  isValid: boolean
  fieldErrors: FlagFieldErrors
}

function pushFieldError(
  map: FlagFieldErrors,
  key: string,
  message: string
): void {
  if (!map[key]) map[key] = []
  map[key]!.push(message)
}

type DependencyAwareFeature = Pick<
  FeatureRegistryRecord,
  "key" | "label" | "dependencies"
>

export function validateFlags(
  flags: FeatureFlagMap,
  registry?: DependencyAwareFeature[]
): FeatureValidationResult {
  const fieldErrors: FlagFieldErrors = {}
  const sourceRegistry =
    registry ??
    FEATURE_REGISTRY.map((feature) => ({
      key: feature.key,
      label: feature.label,
      dependencies: [...(feature.dependencies ?? [])],
    }))
  const byKey = new Map(sourceRegistry.map((feature) => [feature.key, feature]))

  for (const feature of sourceRegistry) {
    if (!flags[feature.key]) continue
    for (const dependencyKey of feature.dependencies ?? []) {
      if (!flags[dependencyKey]) {
        const dependencyLabel = byKey.get(dependencyKey)?.label ?? dependencyKey
        pushFieldError(
          fieldErrors,
          feature.key,
          `${feature.label} requires ${dependencyLabel}.`
        )
      }
    }
  }

  const hasPasswordAuth = byKey.has("password_auth")
  const hasOtpAuth = byKey.has("otp_auth")
  if (
    (hasPasswordAuth || hasOtpAuth) &&
    !flags.password_auth &&
    !flags.otp_auth
  ) {
    pushFieldError(
      fieldErrors,
      "password_auth",
      "Enable Password Authentication or OTP Authentication."
    )
    pushFieldError(
      fieldErrors,
      "otp_auth",
      "Enable OTP Authentication or Password Authentication."
    )
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  }
}

export function buildDefaultFeatureFlagMap(): FeatureFlagMap {
  return FEATURE_REGISTRY.reduce<Record<string, boolean>>((acc, feature) => {
    acc[feature.key] = feature.defaultEnabled
    return acc
  }, {})
}
