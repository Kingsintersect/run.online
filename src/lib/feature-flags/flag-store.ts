import {
  buildOnboardingFeatureMap,
  type OnboardingProfile,
} from "@/lib/feature-flags/onboarding-pipeline"
import { FEATURE_REGISTRY } from "@/config/featureRegistry"
import { type FeatureFlagMap } from "@/schemas/featureFlags.schema"
import {
  type FeatureRegistryRecord,
  type UpsertFeatureRegistryPayload,
} from "@/schemas/featureRegistry.schema"

type StoreRow = {
  instanceId: string
  flags: FeatureFlagMap
  updatedAt: string
}

const memoryStore = new Map<string, StoreRow>()
const registryStore = new Map<string, FeatureRegistryRecord>()

function nowIso(): string {
  return new Date().toISOString()
}

function ensureRegistrySeed(): void {
  if (registryStore.size > 0) return

  for (const feature of FEATURE_REGISTRY) {
    const now = nowIso()
    registryStore.set(feature.key, {
      key: feature.key,
      label: feature.label,
      category: feature.category,
      dependencies: [...(feature.dependencies ?? [])],
      defaultEnabled: feature.defaultEnabled,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }
}

function getActiveRegistryRecords(): FeatureRegistryRecord[] {
  ensureRegistrySeed()
  return [...registryStore.values()]
    .filter((record) => !record.deletedAt)
    .sort((a, b) => a.label.localeCompare(b.label))
}

function ensureSeed(instanceId: string): StoreRow {
  ensureRegistrySeed()
  const existing = memoryStore.get(instanceId)
  if (existing) {
    const active = getActiveRegistryRecords()
    const patchedFlags: FeatureFlagMap = { ...existing.flags }
    let touched = false

    for (const registry of active) {
      if (patchedFlags[registry.key] === undefined) {
        patchedFlags[registry.key] = registry.defaultEnabled
        touched = true
      }
    }

    if (touched) {
      const patched: StoreRow = {
        instanceId,
        flags: patchedFlags,
        updatedAt: nowIso(),
      }
      memoryStore.set(instanceId, patched)
      return patched
    }

    return existing
  }

  const seedProfile: OnboardingProfile =
    instanceId === "pay-to-access" ? "no_admission_pay_to_access" : "full_suite"

  const profileFlags = buildOnboardingFeatureMap({
    profile: seedProfile,
  })
  const activeRegistry = getActiveRegistryRecords()
  const seededFlags: FeatureFlagMap = {}
  for (const item of activeRegistry) {
    seededFlags[item.key] = profileFlags[item.key] ?? item.defaultEnabled
  }

  const row: StoreRow = {
    instanceId,
    flags: seededFlags,
    updatedAt: nowIso(),
  }

  memoryStore.set(instanceId, row)
  return row
}

export async function getFeatureFlagRow(instanceId: string): Promise<StoreRow> {
  return ensureSeed(instanceId)
}

export async function saveFeatureFlagRow(
  instanceId: string,
  flags: FeatureFlagMap
): Promise<StoreRow> {
  const activeKeys = new Set(
    getActiveRegistryRecords().map((record) => record.key)
  )
  const normalizedFlags: FeatureFlagMap = {}
  for (const key of activeKeys) {
    normalizedFlags[key] = Boolean(flags[key])
  }

  const row: StoreRow = {
    instanceId,
    flags: normalizedFlags,
    updatedAt: nowIso(),
  }

  memoryStore.set(instanceId, row)
  return row
}

export async function listFeatureRegistry(): Promise<FeatureRegistryRecord[]> {
  return getActiveRegistryRecords()
}

export async function upsertFeatureRegistry(
  payload: UpsertFeatureRegistryPayload
): Promise<FeatureRegistryRecord> {
  ensureRegistrySeed()

  const now = nowIso()
  const existing = registryStore.get(payload.key)
  const record: FeatureRegistryRecord = {
    key: payload.key,
    label: payload.label,
    category: payload.category ?? null,
    dependencies: payload.dependencies,
    defaultEnabled: payload.defaultEnabled,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
  }

  registryStore.set(payload.key, record)

  for (const [instanceId, row] of memoryStore.entries()) {
    if (row.flags[payload.key] === undefined) {
      memoryStore.set(instanceId, {
        instanceId,
        flags: {
          ...row.flags,
          [payload.key]: payload.defaultEnabled,
        },
        updatedAt: now,
      })
    }
  }

  return record
}

export async function softDeleteFeatureRegistry(
  key: string
): Promise<FeatureRegistryRecord | null> {
  ensureRegistrySeed()
  const existing = registryStore.get(key)
  if (!existing || existing.deletedAt) return null

  const deleted: FeatureRegistryRecord = {
    ...existing,
    deletedAt: nowIso(),
    updatedAt: nowIso(),
  }

  registryStore.set(key, deleted)
  return deleted
}

/*
  Backend persistence wiring plan (comment-only until backend API is ready)

  Option A: settings table storage
  - table: settings
  - key: "feature_flags:{instanceId}"
  - group: "system"
  - value: JSON.stringify(flags)

  Option B: dedicated feature_flags table
  - columns: instance_id (unique), flags_json (json/text), updated_at

  Service-shape to plug in later (matches existing service-layer pattern):

  // import apiClient from "@/lib/clients/apiClient";
  //
  // async function loadFromBackend(instanceId: string): Promise<StoreRow | null> {
  //   const response = await apiClient.get<{
  //     data: { instanceId: string; flags: FeatureFlagMap; updatedAt: string };
  //   }>(`/api/v1/configuration/feature-flags/${instanceId}`, { access_token: true });
  //
  //   return {
  //     instanceId: response.data.instanceId,
  //     flags: response.data.flags,
  //     updatedAt: response.data.updatedAt,
  //   };
  // }
  //
  // async function saveToBackend(instanceId: string, flags: FeatureFlagMap): Promise<StoreRow> {
  //   const response = await apiClient.post<{
  //     data: { instanceId: string; flags: FeatureFlagMap; updatedAt: string };
  //   }, { instanceId: string; flags: FeatureFlagMap }>(
  //     "/api/v1/configuration/feature-flags",
  //     { instanceId, flags },
  //     { access_token: true }
  //   );
  //
  //   return {
  //     instanceId: response.data.instanceId,
  //     flags: response.data.flags,
  //     updatedAt: response.data.updatedAt,
  //   };
  // }
*/
