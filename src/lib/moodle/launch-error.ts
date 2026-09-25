import { z } from "zod"
import { ApiClientError } from "@/lib/clients/apiClient"

// Plain-language explanations for a failed "Open in Moodle" (SSO launch):
//   GET /users/lecturers/me/courses/:id/launch  (tutor)
//   GET /students/me/courses/:id/launch         (student)
// Both answer 409 when one of three set-up gates isn't met (bruno docs):
// the person isn't set up in Moodle, the course isn't, or they aren't
// assigned/enrolled. Shared by the enrollment and tutor-courses modules.

export type MoodleLaunchAudience = "tutor" | "student"

export interface FriendlyError {
  title: string
  description: string
}

const ErrorBodySchema = z.object({
  message: z.string().optional(),
  code: z.string().optional(),
})

// Machine-readable 409 codes requested from the backend (BACKEND_DEVIATIONS
// B15). Used as soon as the backend sends them; until then the backend's own
// message is shown instead of a guess.
const ACCOUNT_CODES = [
  "TUTOR_NOT_SYNCED",
  "STUDENT_NOT_SYNCED",
  "USER_NOT_SYNCED",
]
const COURSE_CODES = ["COURSE_NOT_SYNCED"]
const LINK_CODES = ["NOT_ASSIGNED", "NOT_ENROLLED"]

export function describeMoodleLaunchError(
  error: Error,
  audience: MoodleLaunchAudience
): FriendlyError {
  const status = error instanceof ApiClientError ? error.status : undefined
  const body =
    error instanceof ApiClientError
      ? ErrorBodySchema.safeParse(error.data)
      : null
  const code = body?.success ? body.data.code : undefined
  const serverMessage = body?.success ? body.data.message : undefined
  const askAdmin =
    audience === "tutor"
      ? "An administrator can fix this in Moodle Synchronizer."
      : "Please check back later, or contact your course adviser if it persists."

  if (status === 409) {
    if (code && ACCOUNT_CODES.includes(code))
      return {
        title: "Your Moodle account isn't set up yet",
        description: `Your portal account hasn't been linked to Moodle yet. ${askAdmin}`,
      }
    if (code && COURSE_CODES.includes(code))
      return {
        title: "This course isn't on Moodle yet",
        description: `The course hasn't been created in Moodle yet. ${askAdmin}`,
      }
    if (code && LINK_CODES.includes(code))
      return audience === "tutor"
        ? {
            title: "You're not assigned to this course in Moodle",
            description: `Your assignment to this course hasn't reached Moodle yet. ${askAdmin}`,
          }
        : {
            title: "You're not enrolled in this course in Moodle",
            description: `Your enrolment hasn't reached Moodle yet. ${askAdmin}`,
          }
    // No code yet: say it's a set-up issue and pass on the server's reason.
    return {
      title: "Moodle isn't ready for this course yet",
      description: serverMessage
        ? `${serverMessage} ${askAdmin}`
        : `Something still needs to be set up in Moodle before you can open this course. ${askAdmin}`,
    }
  }
  if (status === 401)
    return {
      title: "Couldn't open Moodle",
      description:
        "The server didn't accept the request to sign you in to Moodle. This is a problem on the server, not with your account. Please try again later.",
    }
  if (status === 403)
    return {
      title: "You don't have access to this course in Moodle",
      description:
        audience === "tutor"
          ? "Your account isn't allowed to open this course. Ask an administrator to check your course assignment."
          : "Your account isn't allowed to open this course. Contact your course adviser.",
    }
  if (status === 404)
    return {
      title: "Course not found",
      description: "This course couldn't be found. It may have been removed.",
    }
  if (status != null && status >= 500)
    return {
      title: "Moodle isn't responding",
      description:
        "The server had a problem opening Moodle. Please try again in a few minutes.",
    }
  if (status == null)
    return {
      title: "Couldn't reach the server",
      description: "Check your internet connection and try again.",
    }
  return {
    title: "Couldn't open Moodle",
    description: serverMessage ?? "Please try again.",
  }
}
