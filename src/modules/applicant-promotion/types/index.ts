import type { z } from "zod"
import type {
  PromoteApplicantParamsSchema,
  PromotedStudentSchema,
} from "../schemas"

export type PromoteApplicantParams = z.infer<
  typeof PromoteApplicantParamsSchema
>
export type PromotedStudent = z.infer<typeof PromotedStudentSchema>

/** What the promote call resolves to once the request succeeded. */
export interface PromotionResult {
  /** Null when the response didn't match StudentResource (the promotion still happened). */
  student: PromotedStudent | null
}

export type PromotionErrorKind =
  | "not-available"
  | "forbidden"
  | "rejected"
  | "unknown"

export interface PromotionError {
  kind: PromotionErrorKind
  status: number | null
  message: string
}
