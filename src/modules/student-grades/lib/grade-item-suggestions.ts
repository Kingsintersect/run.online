import type {
  GradeItemMapping,
  GradeItemSuggestion,
  OfferingRef,
} from "../types"

// The portal's stand-in for GET …/grade-items/suggestions
// (sandbox/automation §5). The same rules as the proposed server version, so
// the suggestions don't change when the real endpoint ships.

/** Lower-case, punctuation removed, spaces collapsed. */
export function normaliseItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const EXAM_WORDS = /\b(exam|examination|final)\b/
const CA_WORDS =
  /\b(assignment|quiz|test|ca\d*|c a|continuous assessment|mid semester|midterm|mid term|project|practical|lab)\b/

/** CA or EXAM from the item's name; never guesses EXCLUDED. */
export function componentFromName(name: string): "CA" | "EXAM" | null {
  const n = normaliseItemName(name)
  if (EXAM_WORDS.test(n)) return "EXAM"
  if (CA_WORDS.test(n)) return "CA"
  return null
}

function sameItem(a: GradeItemMapping, b: GradeItemMapping): boolean {
  if (a.itemIdnumber && b.itemIdnumber) return a.itemIdnumber === b.itemIdnumber
  return normaliseItemName(a.itemName) === normaliseItemName(b.itemName)
}

/**
 * A suggestion for each unmapped item: the previous offering's mapping of the
 * same item first, then the name rules. Items with neither get none.
 */
export function deriveGradeItemSuggestions(
  items: GradeItemMapping[],
  previous: { offering: OfferingRef; items: GradeItemMapping[] } | null
): GradeItemSuggestion[] {
  const out: GradeItemSuggestion[] = []
  for (const item of items) {
    if (item.component !== "UNMAPPED") continue
    const match = previous?.items.find((p) => sameItem(p, item))
    if (
      previous &&
      match &&
      (match.component === "CA" || match.component === "EXAM")
    ) {
      out.push({
        moodleGradeItemId: item.moodleGradeItemId,
        component: match.component,
        basis: "PREVIOUS_OFFERING",
        fromOffering: previous.offering,
      })
      continue
    }
    const byName = componentFromName(item.itemName)
    if (byName)
      out.push({
        moodleGradeItemId: item.moodleGradeItemId,
        component: byName,
        basis: "NAME",
        fromOffering: null,
      })
  }
  return out
}
