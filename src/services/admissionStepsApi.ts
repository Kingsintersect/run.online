/* ------------------------------------------------------------------ */
/*  Admission Step Registry — API Service                              */
/*                                                                     */
/*  Full CRUD on the step definitions that drive:                      */
/*    - src/app/(admission)/(routes)/process-admission/page.tsx        */
/*    - src/app/(admission)/(routes)/admission-application-form/       */
/*  Backend contract per sandbox/admission/admission_features_         */
/*  workflow.md — confirmed live 2026-08-26 (create/list/patch/delete   */
/*  round-tripped directly against the backend, with cleanup) to match  */
/*  the spec exactly EXCEPT the two boolean fields, which the backend   */
/*  names `isRequired`/`isActive` on both read and write (not           */
/*  `required`/`enabled`). Everything else — `group`, `key`, `order`,   */
/*  `label`, `description`, `icon` — is unrenamed on both directions.   */
/*  `group` is a real, required, filterable column now (an earlier      */
/*  deployment had it missing from GET responses and the `?group=`      */
/*  filter as a no-op — both since fixed; see that doc for the dated    */
/*  history if this ever needs revisiting).                             */
/*                                                                     */
/*  Dynamic Admission (sandbox/dynamic-admission/): PROCESS rows carry  */
/*  `type`/`config`, passed through verbatim in both directions.        */
/* ------------------------------------------------------------------ */

import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import {
  SYSTEM_FIELD_CATALOG,
  type PrecedenceRuleCode,
  type SystemFieldDefinition,
} from "@/lib/admission-catalog"
import type {
  AdmissionConfig,
  AdmissionFormField,
  AdmissionStepDefinition,
  AdmissionStepGroup,
  CreateAdmissionStepPayload,
  EffectiveAdmissionStep,
  StageConfig,
  StageType,
  UpdateAdmissionStepPayload,
} from "@/types/admissionConfig"
import type { ProgramCategory } from "@/types/school"

const AUTH = { access_token: true } as const

/** GET .../sequence-rules row — sandbox/dynamic-sequence-rules/API_CONTRACTS.md §1.
 *  `id` is this exact scope's own override row id, present only when
 *  `source === "own"` (needed to DELETE/reset it); null otherwise. */
export interface ResolvedSequenceRule {
  id: number | null
  ruleCode: PrecedenceRuleCode
  enabled: boolean
  source: "own" | "default" | "builtin"
}

/** Actual live shape of one row from GET/POST/PATCH /admissions/config/steps — see the module docblock above.
 *  programCategory/programId/fields: Multi-Program Platform additions — see
 *  sandbox/multi-program-platform/API_CONTRACTS.md §A. Optional/nullable; null = institution-wide.
 *  type/config: Dynamic Admission — null until the backend ships typed stages. */
interface RawAdmissionStep {
  id: number
  group: AdmissionStepGroup
  key: string
  order: number
  label: string
  description: string
  icon: string
  isRequired: boolean
  isActive: boolean
  programCategory?: ProgramCategory | null
  programId?: number | null
  majorProgramId?: number | null
  fields?: AdmissionFormField[]
  type?: StageType | null
  config?: StageConfig | null
}

function fromRaw(raw: RawAdmissionStep): AdmissionStepDefinition {
  return {
    id: raw.id,
    group: raw.group,
    // Normalized once, at the boundary, so every downstream consumer
    // (admissionStore.ts's STEP_COMPLETION lookup, KNOWN_*_STEP_KEYS,
    // AdmissionStepIndicator, the process-admission page switch) can match
    // against exact-case constants like "CHOICE_PROGRAM" without depending
    // on the backend preserving whatever casing/whitespace slugifyKey()
    // originally sent. A silent mismatch here doesn't error — it just makes
    // the step's own completion check unrecognized, so it gets silently
    // treated as already-satisfied and skipped in the student-facing flow.
    key: raw.key.trim().toUpperCase(),
    order: raw.order,
    label: raw.label,
    description: raw.description,
    icon: raw.icon,
    required: raw.isRequired,
    enabled: raw.isActive,
    programCategory: raw.programCategory ?? null,
    programId: raw.programId ?? null,
    majorProgramId: raw.majorProgramId ?? null,
    fields: raw.fields ?? [],
    type: raw.type ?? null,
    config: raw.config ?? null,
  }
}

/** GET /admissions/config/steps/effective's row shape — the server-resolved
 *  merge, no raw scope/enabled fields (see EffectiveAdmissionStep). */
interface RawEffectiveStep {
  id: number
  group: AdmissionStepGroup
  key: string
  order: number
  label: string
  description: string
  icon: string
  // Live response (verified 2026-09-14) sends `isRequired`, same as the raw
  // steps endpoint.
  isRequired: boolean
  fields?: AdmissionFormField[]
  type?: StageType | null
  config?: StageConfig | null
}

function fromRawEffective(raw: RawEffectiveStep): EffectiveAdmissionStep {
  return {
    id: raw.id,
    group: raw.group,
    key: raw.key.trim().toUpperCase(),
    order: raw.order,
    label: raw.label,
    description: raw.description,
    icon: raw.icon,
    required: raw.isRequired,
    fields: raw.fields ?? [],
    type: raw.type ?? null,
    config: raw.config ?? null,
  }
}

function toRawPayload(
  payload: CreateAdmissionStepPayload | UpdateAdmissionStepPayload
): Record<string, unknown> {
  const { required, enabled, ...rest } = payload
  return {
    ...rest,
    ...(required !== undefined ? { isRequired: required } : {}),
    ...(enabled !== undefined ? { isActive: enabled } : {}),
  }
}

export const admissionStepsApi = {
  /** Raw admin-management listing — every row across every scope. Filters
   *  are for browsing/managing (e.g. "show me only Certificate's overrides"),
   *  not for runtime resolution — use getEffective() for that. */
  async list(
    group?: AdmissionStepGroup,
    filters?: {
      programId?: number
      programCategory?: ProgramCategory
      majorProgramId?: number
    }
  ): Promise<AdmissionStepDefinition[]> {
    const res = await apiClient.get<{ data: RawAdmissionStep[] }>(
      "/admissions/config/steps",
      {
        ...AUTH,
        params: {
          group,
          programId: filters?.programId,
          programCategory: filters?.programCategory,
          // Major-Program Scoping — BACKEND_DEVIATIONS A22. Harmless if the
          // backend doesn't recognize it yet: the admin page fetches every
          // row via list() regardless of filters and layers scope
          // client-side (step-scope.ts), so this param isn't load-bearing
          // there — it's here for callers that do want server-side
          // filtering once A22 ships.
          majorProgramId: filters?.majorProgramId,
        },
      }
    )
    return res.data.map(fromRaw)
  },

  /** Composes both groups into the shape process-admission / useAdmissionForm consume. */
  async config(): Promise<AdmissionConfig> {
    const [processSteps, formSteps] = await Promise.all([
      admissionStepsApi.list("PROCESS"),
      admissionStepsApi.list("FORM"),
    ])
    return { processSteps, formSteps }
  },

  // GET /admissions/config/steps/effective — Multi-Program Platform
  // (bruno/admission/Steps - Effective.bru). Resolution when
  // `majorProgramId` is **omitted**: programId match > programCategory
  // match > institution default (unchanged since before major programs
  // existed). Resolution when `majorProgramId` is **present**: full
  // decoupling (BACKEND_DEVIATIONS A23) — only that major program's own
  // rows (or a programId-scoped row under it) are considered; no fallback
  // to programCategory or the institution default at all. Until A23's
  // exact live behavior is independently re-confirmed, useAdmissionStages.ts
  // /useAdmissionForm.ts's client-side fallback resolution
  // (resolveClientSideSteps, admission-stages.ts) mirrors this same rule so
  // the two stay consistent regardless of which one answers first. Omit
  // both ids before the applicant has made either choice. On error, callers
  // fall back to the raw config() (see useAdmissionForm.ts).
  async getEffective(
    group: AdmissionStepGroup,
    programId?: number | null,
    majorProgramId?: number | null
  ): Promise<EffectiveAdmissionStep[]> {
    const res = await apiClient.get<{ data: RawEffectiveStep[] }>(
      "/admissions/config/steps/effective",
      {
        ...AUTH,
        params: {
          group,
          programId: programId ?? undefined,
          majorProgramId: majorProgramId ?? undefined,
        },
      }
    )
    return res.data.map(fromRawEffective)
  },

  async create(
    payload: CreateAdmissionStepPayload
  ): Promise<AdmissionStepDefinition> {
    const res = await apiClient.post<{ data: RawAdmissionStep }>(
      "/admissions/config/steps",
      toRawPayload(payload),
      AUTH
    )
    return fromRaw(res.data)
  },

  async update(
    id: number,
    payload: UpdateAdmissionStepPayload
  ): Promise<AdmissionStepDefinition> {
    const res = await apiClient.patch<{ data: RawAdmissionStep }>(
      `/admissions/config/steps/${id}`,
      toRawPayload(payload),
      AUTH
    )
    return fromRaw(res.data)
  },

  /** Backend refuses (400) to delete the last remaining step in a group. */
  async remove(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(
      `/admissions/config/steps/${id}`,
      AUTH
    )
  },

  /** admission_features_workflow.md's original spec says POST, but the live
   * backend rejects that (405 — "Supported methods: PATCH", confirmed
   * 2026-08-27) — use PATCH to match actual deployed behavior. */
  async reorder(
    group: AdmissionStepGroup,
    orderedIds: number[]
  ): Promise<AdmissionStepDefinition[]> {
    const res = await apiClient.patch<{ data: RawAdmissionStep[] }>(
      "/admissions/config/steps/reorder",
      { group, orderedIds },
      AUTH
    )
    return res.data.map(fromRaw)
  },

  // GET /admissions/config/system-fields — Dynamic Admission API_CONTRACTS
  // §1.1. Falls back to the matching local catalog until the backend ships
  // the endpoint; both describe the same Application columns.
  async systemFields(): Promise<SystemFieldDefinition[]> {
    try {
      const res = await apiClient.get<{ data: SystemFieldDefinition[] }>(
        "/admissions/config/system-fields",
        AUTH
      )
      return res.data.length ? res.data : SYSTEM_FIELD_CATALOG
    } catch {
      return SYSTEM_FIELD_CATALOG
    }
  },

  // GET /admissions/config/sequence-rules — sandbox/dynamic-sequence-rules/
  // (A24). Confirmed live 2026-09-16 (bruno/admission/Sequence Rules -
  // List.bru) — no fallback needed anymore; a real failure surfaces as a
  // normal query error, same as every other live endpoint in this file.
  // `majorProgramId: null`/omitted reads the institution-default scope.
  // Always returns all 6 fixed rule codes, each already resolved for the
  // requested scope (source: "own" | "default" | "builtin" — the last one
  // is a legitimate live state, "nothing configured for this rule
  // anywhere," not a sign the endpoint is missing).
  async sequenceRules(
    majorProgramId?: number | null
  ): Promise<ResolvedSequenceRule[]> {
    const res = await apiClient.get<{ data: ResolvedSequenceRule[] }>(
      "/admissions/config/sequence-rules",
      { ...AUTH, params: { majorProgramId: majorProgramId ?? undefined } }
    )
    return res.data
  },

  // PATCH /admissions/config/sequence-rules — upserts one scope's override.
  // Not live yet; a caller reaching this before the backend ships it gets a
  // real error (no silent success), which the mutation's onError/toast
  // already surfaces — no fallback here since there's nothing useful to
  // pretend happened for a write.
  async setSequenceRule(payload: {
    majorProgramId: number | null
    ruleCode: PrecedenceRuleCode
    enabled: boolean
  }): Promise<ResolvedSequenceRule> {
    const res = await apiClient.patch<{ data: ResolvedSequenceRule }>(
      "/admissions/config/sequence-rules",
      payload,
      AUTH
    )
    return res.data
  },

  // DELETE /admissions/config/sequence-rules/{id} — clears one scope's own
  // override, falling back to whatever's next in the resolution chain.
  // Confirmed live 2026-09-16 (bruno/admission/Sequence Rules - Clear.bru):
  // 204 No Content, not a { message } body like most other deletes here.
  async clearSequenceRule(id: number): Promise<void> {
    await apiClient.delete<void>(
      `/admissions/config/sequence-rules/${id}`,
      AUTH
    )
  },
}

/* ------------------------------------------------------------------ */
/*  Query keys / options                                                */
/* ------------------------------------------------------------------ */

export const admissionStepsKeys = {
  all: ["admission-steps"] as const,
  list: (
    group?: AdmissionStepGroup,
    filters?: { programId?: number; programCategory?: ProgramCategory }
  ) =>
    [...admissionStepsKeys.all, "list", group ?? "all", filters ?? {}] as const,
  config: () => [...admissionStepsKeys.all, "config"] as const,
  effective: (
    group: AdmissionStepGroup,
    programId?: number | null,
    majorProgramId?: number | null
  ) =>
    [
      ...admissionStepsKeys.all,
      "effective",
      group,
      programId ?? null,
      majorProgramId ?? null,
    ] as const,
  systemFields: () => [...admissionStepsKeys.all, "system-fields"] as const,
  sequenceRules: (majorProgramId?: number | null) =>
    [
      ...admissionStepsKeys.all,
      "sequence-rules",
      majorProgramId ?? null,
    ] as const,
}

export const admissionStepsQueryOptions = {
  list: (group?: AdmissionStepGroup) =>
    createApiQueryOptions({
      queryKey: admissionStepsKeys.list(group),
      queryFn: () => admissionStepsApi.list(group),
    }),

  config: () =>
    createApiQueryOptions({
      queryKey: admissionStepsKeys.config(),
      queryFn: () => admissionStepsApi.config(),
      staleTime: 1000 * 60 * 5,
    }),

  effective: (
    group: AdmissionStepGroup,
    programId?: number | null,
    majorProgramId?: number | null
  ) =>
    createApiQueryOptions({
      queryKey: admissionStepsKeys.effective(group, programId, majorProgramId),
      queryFn: () =>
        admissionStepsApi.getEffective(group, programId, majorProgramId),
      staleTime: 1000 * 60 * 5,
    }),

  systemFields: () =>
    createApiQueryOptions({
      queryKey: admissionStepsKeys.systemFields(),
      queryFn: () => admissionStepsApi.systemFields(),
      staleTime: Infinity,
    }),

  sequenceRules: (majorProgramId?: number | null) =>
    createApiQueryOptions({
      queryKey: admissionStepsKeys.sequenceRules(majorProgramId),
      queryFn: () => admissionStepsApi.sequenceRules(majorProgramId),
      staleTime: 1000 * 60,
    }),
}

export const admissionStepsMutationOptions = {
  create: () =>
    createApiMutationOptions<
      AdmissionStepDefinition,
      CreateAdmissionStepPayload
    >({
      mutationKey: [...admissionStepsKeys.all, "create"],
      mutationFn: (payload) => admissionStepsApi.create(payload),
    }),

  update: () =>
    createApiMutationOptions<
      AdmissionStepDefinition,
      { id: number; payload: UpdateAdmissionStepPayload }
    >({
      mutationKey: [...admissionStepsKeys.all, "update"],
      mutationFn: ({ id, payload }) => admissionStepsApi.update(id, payload),
    }),

  remove: () =>
    createApiMutationOptions<{ message: string }, number>({
      mutationKey: [...admissionStepsKeys.all, "remove"],
      mutationFn: (id) => admissionStepsApi.remove(id),
    }),

  reorder: () =>
    createApiMutationOptions<
      AdmissionStepDefinition[],
      { group: AdmissionStepGroup; orderedIds: number[] }
    >({
      mutationKey: [...admissionStepsKeys.all, "reorder"],
      mutationFn: ({ group, orderedIds }) =>
        admissionStepsApi.reorder(group, orderedIds),
    }),

  setSequenceRule: () =>
    createApiMutationOptions<
      ResolvedSequenceRule,
      {
        majorProgramId: number | null
        ruleCode: PrecedenceRuleCode
        enabled: boolean
      }
    >({
      mutationKey: [...admissionStepsKeys.all, "set-sequence-rule"],
      mutationFn: (payload) => admissionStepsApi.setSequenceRule(payload),
    }),

  clearSequenceRule: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...admissionStepsKeys.all, "clear-sequence-rule"],
      mutationFn: (id) => admissionStepsApi.clearSequenceRule(id),
    }),
}
