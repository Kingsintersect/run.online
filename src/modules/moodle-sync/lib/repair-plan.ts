import type { CategorySyncResponse } from "../types"

export interface RepairUnit {
  id: number
  name: string
  typeCode: string
  parentId: number | null
}

export interface PlannedMove {
  mappingId: number
  unitId: number
  unitName: string
  unitTypeCode: string
  fromParentId: number | null
  fromParentName: string | null
  toParentId: number
  toParentName: string
  /** Set when this move would damage the tree; the repair is then blocked. */
  unsafeReason: string | null
}

export interface RepairPlan {
  moves: PlannedMove[]
  /** Mappings whose Moodle parent isn't mapped yet (the backend skips them). */
  skipped: number
  /** Portal nodes claimed by more than one Moodle category. */
  conflicts: { unitId: number; unitName: string; moodleNames: string[] }[]
  /**
   * What's already wrong in the tree or the mappings, whatever the repair
   * would do: a major program nested under another node, or a Moodle
   * category linked to a portal node with a different name. A crossed
   * mapping can make a damaged tree look "already correct" to the repair,
   * so these are reported separately.
   */
  problems: string[]
  safe: boolean
}

// Structural rank: a node may only sit under a node of a lower rank. Types
// outside this list (Stream, Section, Cohort…) aren't ranked.
const RANK: Record<string, number> = {
  MAJOR_PROGRAM: 0,
  FACULTY: 1,
  DEPARTMENT: 2,
  PROGRAM: 3,
  LEVEL: 4,
  SEMESTER: 5,
}

/**
 * What "Repair Hierarchy" (POST /moodle-sync/categories/repair-hierarchy)
 * would change, computed from data already loaded, the same way the backend
 * does it: every mapping with a Moodle parent whose parent is itself mapped
 * gets its portal node re-parented under that parent's node.
 *
 * The backend trusts the mappings completely, so a crossed mapping (a Moodle
 * category linked to the wrong portal node) turns into a destructive move.
 * Each move is checked, and the repair is only offered when all are safe.
 */
export function planHierarchyRepair(
  mappings: CategorySyncResponse[],
  units: RepairUnit[]
): RepairPlan {
  const unitById = new Map(units.map((u) => [u.id, u]))
  const byMoodle = new Map(
    mappings
      .filter((m) => m.moodleCategoryId != null)
      .map((m) => [m.moodleCategoryId as number, m])
  )
  const isDescendant = (candidateId: number, ancestorId: number) => {
    let cur = unitById.get(candidateId)
    for (let guard = 0; cur && guard < 50; guard++) {
      if (cur.id === ancestorId) return true
      cur = cur.parentId != null ? unitById.get(cur.parentId) : undefined
    }
    return false
  }

  const moves: PlannedMove[] = []
  let skipped = 0
  for (const m of mappings) {
    if (m.parentMoodleCategoryId == null) continue
    const parent = byMoodle.get(m.parentMoodleCategoryId)
    if (!parent || parent.needsMapping) {
      skipped++
      continue
    }
    const unit = unitById.get(m.academicUnitId)
    if (!unit || unit.parentId === parent.academicUnitId) continue
    const target = unitById.get(parent.academicUnitId)
    const from = unit.parentId != null ? unitById.get(unit.parentId) : undefined

    let unsafeReason: string | null = null
    const unitRank = RANK[unit.typeCode]
    const targetRank = target ? RANK[target.typeCode] : undefined
    if (unit.typeCode === "MAJOR_PROGRAM")
      unsafeReason =
        "A major program is a top-level node and can't be moved under another node."
    else if (
      parent.academicUnitId === unit.id ||
      isDescendant(parent.academicUnitId, unit.id)
    )
      unsafeReason =
        "The new parent is inside this node, so the move would create a loop."
    else if (unitRank != null && targetRank != null && targetRank >= unitRank)
      unsafeReason = `A ${unit.typeCode.toLowerCase().replace("_", " ")} can't sit under a ${target!.typeCode.toLowerCase().replace("_", " ")}.`

    moves.push({
      mappingId: m.id,
      unitId: unit.id,
      unitName: unit.name,
      unitTypeCode: unit.typeCode,
      fromParentId: unit.parentId,
      fromParentName: from?.name ?? null,
      toParentId: parent.academicUnitId,
      toParentName: target?.name ?? `Unit #${parent.academicUnitId}`,
      unsafeReason,
    })
  }

  const claims = new Map<number, string[]>()
  for (const m of mappings) {
    const list = claims.get(m.academicUnitId) ?? []
    list.push(m.moodleCategoryName ?? `Moodle #${m.moodleCategoryId}`)
    claims.set(m.academicUnitId, list)
  }
  const conflicts = [...claims.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([unitId, moodleNames]) => ({
      unitId,
      unitName: unitById.get(unitId)?.name ?? `Unit #${unitId}`,
      moodleNames,
    }))

  const problems: string[] = []
  for (const u of units)
    if (u.typeCode === "MAJOR_PROGRAM" && u.parentId != null)
      problems.push(
        `"${u.name}" is a major program but sits under "${unitById.get(u.parentId)?.name ?? `Unit #${u.parentId}`}". Move it back to the top level (Academic Structure → Edit node → Parent Node: No parent).`
      )
  for (const m of mappings)
    if (isNameMismatch(m.moodleCategoryName, m.unitName))
      problems.push(
        `Moodle "${(m.moodleCategoryName ?? "").replace(/&amp;/g, "&")}" is linked to portal "${m.unitName}". Use Re-link on that row first.`
      )

  return {
    problems,
    moves,
    skipped,
    conflicts,
    safe:
      problems.length === 0 &&
      conflicts.length === 0 &&
      moves.every((mv) => mv.unsafeReason == null),
  }
}

const norm = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const TYPE_WORDS = [
  "faculty",
  "department",
  "programmes",
  "programs",
  "program",
  "of",
  "the",
]

/**
 * True when a mapping's Moodle category name and its portal node's name look
 * like different things (e.g. Moodle "PART-TIME PROGRAMS" on portal node
 * "Second Semester"). Formatting, "Level 100" vs "100 Level" and
 * faculty/department/program words are ignored.
 */
export function isNameMismatch(moodleName: string | null, unitName: string) {
  if (!moodleName) return false
  const words = (s: string) =>
    new Set(
      norm(s)
        .split(" ")
        .filter((w) => w && !TYPE_WORDS.includes(w))
    )
  const a = words(moodleName)
  const b = words(unitName)
  if (a.size === 0 || b.size === 0) return false
  const shared = [...a].filter((w) => b.has(w)).length
  return shared / Math.min(a.size, b.size) < 0.5
}
