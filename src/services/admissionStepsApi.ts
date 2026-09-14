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
/* ------------------------------------------------------------------ */

import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  AdmissionConfig,
  AdmissionFormField,
  AdmissionStepDefinition,
  AdmissionStepGroup,
  CreateAdmissionStepPayload,
  EffectiveAdmissionStep,
  UpdateAdmissionStepPayload,
} from "@/types/admissionConfig"
import type { ProgramCategory } from "@/types/school"

const AUTH = { access_token: true } as const

/** Actual live shape of one row from GET/POST/PATCH /admissions/config/steps — see the module docblock above.
 *  programCategory/programId/fields: Multi-Program Platform additions — see
 *  sandbox/multi-program-platform/API_CONTRACTS.md §A. Optional/nullable; null = institution-wide. */
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
  fields?: AdmissionFormField[]
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
    fields: raw.fields ?? [],
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
    filters?: { programId?: number; programCategory?: ProgramCategory }
  ): Promise<AdmissionStepDefinition[]> {
    const res = await apiClient.get<{ data: RawAdmissionStep[] }>(
      "/admissions/config/steps",
      {
        ...AUTH,
        params: {
          group,
          programId: filters?.programId,
          programCategory: filters?.programCategory,
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
  // (bruno/admission/Steps - Effective.bru). Server-side resolution:
  // programId match > programCategory match > institution default. Omit
  // programId before the applicant has chosen a program — resolves to the
  // institution-wide default set. On error, callers fall back to the raw
  // config() (see useAdmissionForm.ts).
  async getEffective(
    group: AdmissionStepGroup,
    programId?: number | null
  ): Promise<EffectiveAdmissionStep[]> {
    const res = await apiClient.get<{ data: RawEffectiveStep[] }>(
      "/admissions/config/steps/effective",
      { ...AUTH, params: { group, programId: programId ?? undefined } }
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
  effective: (group: AdmissionStepGroup, programId?: number | null) =>
    [...admissionStepsKeys.all, "effective", group, programId ?? null] as const,
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

  effective: (group: AdmissionStepGroup, programId?: number | null) =>
    createApiQueryOptions({
      queryKey: admissionStepsKeys.effective(group, programId),
      queryFn: () => admissionStepsApi.getEffective(group, programId),
      staleTime: 1000 * 60 * 5,
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
}
