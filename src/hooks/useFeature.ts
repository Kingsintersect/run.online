"use client"

import { FEATURE_REGISTRY_MAP, type FeatureKey } from "@/config/featureRegistry"
import { useFeatureFlags } from "@/hooks/useFeatureFlags"

export function useFeature(featureKey: FeatureKey, instanceId = "default") {
  const { data, isLoading, isError } = useFeatureFlags(instanceId)

  return {
    feature: FEATURE_REGISTRY_MAP[featureKey],
    enabled:
      data?.flags?.[featureKey] ??
      FEATURE_REGISTRY_MAP[featureKey].defaultEnabled,
    isLoading,
    isError,
  }
}
