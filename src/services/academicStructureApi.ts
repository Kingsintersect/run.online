import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  AcademicUnit,
  AcademicUnitDetail,
  AcademicUnitType,
  CreateAcademicUnitPayload,
  CreateUnitTypePayload,
  UpdateAcademicUnitPayload,
} from "@/types/school"

// Confirmed live — contract per sandbox/schema-moodel-sync-refactor/api-v2.md
// §"Academic Structure — /academic-structure"; tracked as MISSING_BACKEND_APIS.md
// §2.16, now shipped by the backend team. Not yet in bruno, but every method
// here calls the real endpoint. Response envelopes follow the same
// `{data: ...}` convention as every other endpoint in this codebase
// (courseStructureApi.ts).
const BASE = "/academic-structure"
const AUTH = { access_token: true } as const

export const unitTypesApi = {
  async list(): Promise<{ data: AcademicUnitType[] }> {
    return apiClient.get<{ data: AcademicUnitType[] }>(
      `${BASE}/unit-types`,
      AUTH
    )
  },

  async create(
    payload: CreateUnitTypePayload
  ): Promise<{ data: AcademicUnitType }> {
    return apiClient.post<{ data: AcademicUnitType }>(
      `${BASE}/unit-types`,
      payload,
      AUTH
    )
  },
}

export const academicUnitsApi = {
  async list(
    params: { parentId?: number; typeId?: number; rootsOnly?: boolean } = {}
  ): Promise<{ data: AcademicUnit[] }> {
    return apiClient.get<{ data: AcademicUnit[] }>(`${BASE}/units`, {
      ...AUTH,
      params,
    })
  },

  async getById(id: number): Promise<{ data: AcademicUnitDetail }> {
    return apiClient.get<{ data: AcademicUnitDetail }>(
      `${BASE}/units/${id}`,
      AUTH
    )
  },

  async create(
    payload: CreateAcademicUnitPayload
  ): Promise<{ data: AcademicUnit }> {
    return apiClient.post<{ data: AcademicUnit }>(
      `${BASE}/units`,
      payload,
      AUTH
    )
  },

  async update(
    id: number,
    payload: UpdateAcademicUnitPayload
  ): Promise<{ data: AcademicUnit }> {
    return apiClient.patch<{ data: AcademicUnit }>(
      `${BASE}/units/${id}`,
      payload,
      AUTH
    )
  },

  // Cascades to children server-side; does not delete a mirror node's
  // backing Faculty/Department/Program/Level/Semester row, and does not
  // touch Moodle. See api-v2.md's DELETE /academic-structure/units/{id}.
  async remove(id: number): Promise<void> {
    return apiClient.delete<void>(`${BASE}/units/${id}`, AUTH)
  },
}

/**
 * Finds the AcademicUnit mirror node for a Faculty, creating one if it
 * doesn't exist yet. `Program` has no `facultyId` of its own — attaching a
 * Program directly under a Faculty (skipping Department) only works via
 * `parentAcademicUnitId` into this generic tree, so that link needs a real
 * Faculty-type unit to point at. Used by the Course Structure module's
 * "Add Program" (faculty-direct) and "Move to Faculty" actions.
 */
export async function resolveFacultyAcademicUnit(
  facultyId: number,
  facultyName: string
): Promise<AcademicUnit> {
  const { data: roots } = await academicUnitsApi.list({ rootsOnly: true })
  const existing = roots.find(
    (u) => u.linkedEntity?.type === "faculty" && u.linkedEntity.id === facultyId
  )
  if (existing) return existing

  const { data: created } = await academicUnitsApi.create({
    typeCode: "FACULTY",
    parentId: null,
    name: facultyName,
    linkedEntity: { type: "faculty", id: facultyId },
  })
  return created
}

// ── Query keys ──────────────────────────────

export const academicStructureKeys = {
  unitTypes: {
    all: ["academic-structure", "unit-types"] as const,
    list: () => [...academicStructureKeys.unitTypes.all, "list"] as const,
  },
  units: {
    all: ["academic-structure", "units"] as const,
    list: (params?: {
      parentId?: number
      typeId?: number
      rootsOnly?: boolean
    }) => [...academicStructureKeys.units.all, "list", params] as const,
    detail: (id: number) =>
      [...academicStructureKeys.units.all, "detail", id] as const,
  },
}

// ── Query options ───────────────────────────

export const academicStructureQueryOptions = {
  unitTypes: {
    list: () =>
      createApiQueryOptions({
        queryKey: academicStructureKeys.unitTypes.list(),
        queryFn: () => unitTypesApi.list(),
      }),
  },
  units: {
    list: (params?: {
      parentId?: number
      typeId?: number
      rootsOnly?: boolean
    }) =>
      createApiQueryOptions({
        queryKey: academicStructureKeys.units.list(params),
        queryFn: () => academicUnitsApi.list(params),
      }),
    detail: (id: number) =>
      createApiQueryOptions({
        queryKey: academicStructureKeys.units.detail(id),
        queryFn: () => academicUnitsApi.getById(id),
      }),
  },
}

// ── Mutation options ──────────────────────────

export const academicStructureMutationOptions = {
  createUnitType: () =>
    createApiMutationOptions<{ data: AcademicUnitType }, CreateUnitTypePayload>(
      {
        mutationKey: [...academicStructureKeys.unitTypes.all, "create"],
        mutationFn: (payload) => unitTypesApi.create(payload),
      }
    ),
  createUnit: () =>
    createApiMutationOptions<{ data: AcademicUnit }, CreateAcademicUnitPayload>(
      {
        mutationKey: [...academicStructureKeys.units.all, "create"],
        mutationFn: (payload) => academicUnitsApi.create(payload),
      }
    ),
  updateUnit: () =>
    createApiMutationOptions<
      { data: AcademicUnit },
      { id: number; payload: UpdateAcademicUnitPayload }
    >({
      mutationKey: [...academicStructureKeys.units.all, "update"],
      mutationFn: ({ id, payload }) => academicUnitsApi.update(id, payload),
    }),
  deleteUnit: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...academicStructureKeys.units.all, "delete"],
      mutationFn: (id) => academicUnitsApi.remove(id),
    }),
}
