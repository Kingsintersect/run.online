import { FEATURE_REGISTRY, type FeatureKey } from "@/config/featureRegistry"
import {
  buildDefaultFeatureFlagMap,
  type FeatureFlagMap,
} from "@/schemas/featureFlags.schema"

export type OnboardingProfile =
  | "full_suite"
  | "no_admission_pay_to_access"
  | "external_payment"

const PROFILE_OVERRIDES: Record<
  OnboardingProfile,
  Partial<Record<FeatureKey, boolean>>
> = {
  full_suite: {},
  no_admission_pay_to_access: {
    admission: false,
    payment: true,
    fee_management: true,
  },
  external_payment: {
    payment: false,
    fee_management: false,
  },
}

export type OnboardingFeatureInput = {
  profile: OnboardingProfile
  overrides?: Partial<Record<FeatureKey, boolean>>
}

export function buildOnboardingFeatureMap(
  input: OnboardingFeatureInput
): FeatureFlagMap {
  const defaults = buildDefaultFeatureFlagMap()
  const profileOverrides = PROFILE_OVERRIDES[input.profile] ?? {}

  return {
    ...defaults,
    ...profileOverrides,
    ...(input.overrides ?? {}),
  }
}

export function buildOnboardingChecklist(flags: FeatureFlagMap): string[] {
  const enabled = FEATURE_REGISTRY.filter((feature) => flags[feature.key])
  return enabled.map((feature) => `${feature.label} enabled`)
}
