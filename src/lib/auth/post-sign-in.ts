import { admissionService } from "@/app/(admission)/services/admissionService"
import type { AdmissionStudent } from "@/app/(admission)/types/admission"

export const STUDENT_DASHBOARD_PATH = "/student/dashboard"
export const ADMISSION_FLOW_PATH = "/process-admission"

/**
 * A student belongs on their dashboard once they are admitted AND have paid
 * the tuition fee, fully or in part. Anyone still short of that (not yet
 * admitted, or no tuition paid) continues the admission flow.
 */
export function isAdmittedWithTuitionPaid(student: AdmissionStudent): boolean {
  const tuitionPaid =
    student.tuition_payment_status === "paid" ||
    student.tuition_payment_status === "partial" ||
    student.tuition_amount_paid > 0
  return student.is_admitted && tuitionPaid
}

/**
 * Where a STUDENT lands after signing in, from GET /admission/student.
 * Runs before the token is stored in apiClient, so it sends the new
 * session's token explicitly. If the lookup fails, the student goes to the
 * admission flow, which loads the same data itself and links onward, rather
 * than being guessed onto the dashboard.
 */
export async function resolveStudentLandingPath(
  accessToken: string | null | undefined
): Promise<string> {
  if (!accessToken) return ADMISSION_FLOW_PATH
  try {
    const student =
      await admissionService.fetchStudentAdmissionWithToken(accessToken)
    return isAdmittedWithTuitionPaid(student)
      ? STUDENT_DASHBOARD_PATH
      : ADMISSION_FLOW_PATH
  } catch {
    return ADMISSION_FLOW_PATH
  }
}
