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
// §2.16. Response envelopes follow the same
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

// Real bug, found 2026-09-16: the two `nameCollision` guards below used to
// compare names with plain `.trim().toLowerCase() === ...` — which silently
// failed to catch exactly the cases they exist to catch, because Moodle's
// own category names don't match RUN's display names closely enough for an
// exact comparison. Confirmed live: "CERTIFICATE PROGRAMS" (Moodle) vs.
// "Certificate Programmes" (RUN), "PART-TIME PROGRAMS" vs. "Part-Time
// Programmes", "FOUNDATIONAL/JUPEB PROGRAMS" vs. "Foundational Programmes"
// — every one of them differs (American "Program(s)" vs. British
// "Programme(s)", plus extra qualifiers like "/JUPEB"), so the guard never
// fired and three duplicate root nodes were created for the exact three
// major programs the design doc's own example names.
//
// Fixed by normalizing before comparing (lowercase, collapse whitespace,
// treat hyphens/slashes as spaces, strip the generic word "program(me)(s)"
// entirely since it carries no identifying information) and matching on
// containment, not just equality — "foundational jupeb" now recognizably
// contains "foundational". This is deliberately biased toward *more*
// collisions, not fewer: the only effect of a collision is a blocking error
// asking an admin to resolve it manually (see the two functions below) —
// never a silent merge or data change — so an occasional false-positive
// block is the safe direction to err in; a false negative is what actually
// caused this bug.
const GENERIC_STRUCTURAL_WORDS = /\b(programmes?|programs?)\b/g

function normalizeStructuralName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-/]/g, " ")
    .replace(GENERIC_STRUCTURAL_WORDS, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
}

/** True if two structural/entity names plausibly refer to the same real
 *  thing once generic words and formatting differences are stripped out —
 *  e.g. "CERTIFICATE PROGRAMS" and "Certificate Programmes". Never used to
 *  auto-merge anything; only to decide whether to surface a manual-
 *  resolution error instead of silently creating a duplicate root. */
function namesLikelyMatch(a: string, b: string): boolean {
  const normA = normalizeStructuralName(a)
  const normB = normalizeStructuralName(b)
  if (!normA || !normB) return false
  return normA === normB || normA.includes(normB) || normB.includes(normA)
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

  // A category pulled from Moodle and left unresolved gets a bare,
  // unlinked placeholder root with the Moodle category's own name (see
  // BACKEND_DEVIATIONS A18's investigation) — that placeholder is invisible
  // to the lookup above (it has no `linkedEntity` at all), so without this
  // check, calling this twice for the same Faculty would create a second,
  // duplicate root. `linkedEntity` can't be changed after creation, so the
  // fix isn't to silently merge into it — surface the conflict so an admin
  // resolves it deliberately (delete/rename the placeholder, or re-parent
  // its children first) instead of ending up with two same-named roots.
  const nameCollision = roots.find(
    (u) => u.linkedEntity == null && namesLikelyMatch(u.name, facultyName)
  )
  if (nameCollision) {
    throw new Error(
      `A structural node named "${nameCollision.name}" already exists at the root level of Academic Structure (likely pulled in from Moodle and never resolved) and looks like it's meant to be this Faculty. Since a node's link can't be changed after creation, delete that node — moving any of its children out first — then try again.`
    )
  }

  const { data: created } = await academicUnitsApi.create({
    typeCode: "FACULTY",
    parentId: null,
    name: facultyName,
    linkedEntity: { type: "faculty", id: facultyId },
  })
  return created
}

/**
 * Finds the AcademicUnit mirror root node for a MajorProgram, creating one
 * (and the "MAJOR_PROGRAM" unit type, if it doesn't exist yet) otherwise.
 * sandbox/major-program-scoping/README.md §4.E: gives each major
 * program a real root category in the Moodle-sync tree, matching the
 * "CERTIFICATE PROGRAMS" / "FOUNDATIONAL/JUPEB PROGRAMS" /
 * "PART-TIME PROGRAMS" top-level Moodle categories the university already
 * organizes courses under. Same lazy-creation pattern as
 * `resolveFacultyAcademicUnit` above.
 */
export async function resolveMajorProgramAcademicUnit(
  majorProgramId: number,
  majorProgramName: string
): Promise<AcademicUnit> {
  const { data: roots } = await academicUnitsApi.list({ rootsOnly: true })
  const existing = roots.find(
    (u) =>
      u.linkedEntity?.type === "major_program" &&
      u.linkedEntity.id === majorProgramId
  )
  if (existing) return existing

  // Same guard as resolveFacultyAcademicUnit above — a pulled-but-unresolved
  // Moodle category (e.g. "PART-TIME PROGRAMS") already occupies a root
  // node under this exact name with no `linkedEntity`, which this
  // function's lookup can't see. Without this check, resolving/linking a
  // Major Program whose Moodle root category was never manually resolved
  // creates a second, duplicate root instead of reusing or flagging the
  // existing one.
  const nameCollision = roots.find(
    (u) => u.linkedEntity == null && namesLikelyMatch(u.name, majorProgramName)
  )
  if (nameCollision) {
    throw new Error(
      `A structural node named "${nameCollision.name}" already exists at the root level of Academic Structure (likely pulled in from Moodle and never resolved) and looks like it's meant to be this Major Program. Since a node's link can't be changed after creation, delete that node — moving any of its children out first — then try again.`
    )
  }

  const { data: unitTypes } = await unitTypesApi.list()
  const hasMajorProgramType = unitTypes.some((t) => t.code === "MAJOR_PROGRAM")
  if (!hasMajorProgramType) {
    await unitTypesApi.create({
      code: "MAJOR_PROGRAM",
      label: "Major Program",
    })
  }

  const { data: created } = await academicUnitsApi.create({
    typeCode: "MAJOR_PROGRAM",
    parentId: null,
    name: majorProgramName,
    linkedEntity: { type: "major_program", id: majorProgramId },
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
