import type { CategoryHealth, CategorySyncResponse } from "../types"
import { isNameMismatch } from "./repair-plan"

/**
 * What the portal can see of the mapping check (sandbox/automation §6) from
 * the mappings list alone, used until GET /moodle-sync/categories/health
 * exists. Moodle ID numbers aren't in the list, so a crossed mapping shows up
 * here as a name mismatch or a wrong parent, never as CROSSED.
 */
export function deriveCategoryHealth(
  mappings: CategorySyncResponse[]
): CategoryHealth {
  const byMoodle = new Map(
    mappings
      .filter((m) => m.moodleCategoryId != null)
      .map((m) => [m.moodleCategoryId as number, m])
  )
  const issues: CategoryHealth["issues"] = []
  for (const m of mappings) {
    const base = {
      categoryMappingId: m.id,
      academicUnitId: m.academicUnitId,
      unitName: m.unitName,
      moodleCategoryId: m.moodleCategoryId,
      moodleCategoryName: m.moodleCategoryName,
      firstSeenAt: null,
    }
    if (isNameMismatch(m.moodleCategoryName, m.unitName))
      issues.push({
        ...base,
        issue: "NAME_MISMATCH",
        detail: `Moodle calls it "${m.moodleCategoryName}", the portal "${m.unitName}".`,
      })
    const parent =
      m.parentMoodleCategoryId != null
        ? byMoodle.get(m.parentMoodleCategoryId)
        : undefined
    if (
      parent &&
      !parent.needsMapping &&
      m.parentId != null &&
      parent.academicUnitId !== m.parentId
    )
      issues.push({
        ...base,
        issue: "WRONG_PARENT",
        detail: `In Moodle it sits under "${parent.unitName}", which isn't its parent in the portal.`,
      })
  }
  return { checkedAt: null, issues }
}
