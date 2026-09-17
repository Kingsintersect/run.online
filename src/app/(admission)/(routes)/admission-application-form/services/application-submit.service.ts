import apiClient from "@/lib/clients/apiClient"
import type { FormDefaultValues } from "../types/form-types"
import type { DynamicAnswers, DynamicFieldValue } from "../lib/dynamic-form"

const AUTH = { access_token: true } as const

// ─── Submit error model ─────────────────────────────────────────────────────

export interface SubmitFieldError {
  /** Backend payload key as returned in the `errors` map, e.g. `contact_address`. */
  field: string
  message: string
}

export interface SubmitError {
  /** Top-level human message — the backend's own `message`, or a fallback. */
  message: string
  status?: number
  /**
   * One entry per rejected field/message from a Laravel-style 422
   * `{ errors: { field: [msg, ...] } }` body. Empty for non-validation
   * failures (network error, 500, 409, …) — the caller shows `message` alone.
   */
  fieldErrors: SubmitFieldError[]
}

/**
 * Normalises whatever `submitApplication` threw (an `ApiClientError`, a bare
 * `Error`, anything) into a display model the form can render above its
 * footer: the top-level message plus a flat list of per-field messages.
 */
export function toSubmitError(error: unknown): SubmitError {
  const e = error as { status?: number; data?: unknown; message?: unknown }
  const data = e?.data as
    | { message?: unknown; errors?: Record<string, unknown> }
    | undefined

  const message =
    (typeof data?.message === "string" && data.message) ||
    (typeof e?.message === "string" && e.message) ||
    "Failed to submit application. Please try again."

  const fieldErrors: SubmitFieldError[] = []
  if (data?.errors && typeof data.errors === "object") {
    for (const [field, value] of Object.entries(data.errors)) {
      const messages = Array.isArray(value) ? value : [value]
      for (const m of messages) {
        if (typeof m === "string" && m.trim()) {
          fieldErrors.push({ field, message: m })
        }
      }
    }
  }

  return { message, status: e?.status, fieldErrors }
}

export interface CurrentUserProfile {
  firstName: string | null
  middleName: string | null
  lastName: string | null
  email: string
  phoneNumber: string | null
}

export async function fetchMyProfile(): Promise<CurrentUserProfile> {
  return apiClient.get<CurrentUserProfile>("/auth/me", AUTH)
}

export interface SubmitApplicationResponse {
  id: number
  applicationNumber: string
  status: string
}

// Applications - Submit.bru's post-response script reads res.body.data.id —
// the real response is {data: {...}}-wrapped despite admission_README.md
// showing a flat shape for this endpoint.
interface SubmitApplicationApiResponse {
  data: SubmitApplicationResponse
}

/**
 * Posts the application (with its passport photo and result documents) to
 * POST /admissions/applications as `multipart/form-data`, per bruno/admission's
 * "Applications - Submit.bru".
 *
 * The body is assembled as a plain object and `apiClient` encodes it
 * (`contentType: "multipart"`): `File`s pass through, `boolean`s become
 * `"1"` / `"0"` (Laravel's `boolean` rule rejects `"true"` / `"false"`), and
 * empty/undefined fields are dropped. Conditional groups (disability, sponsor,
 * exam sitting) are spread in only when their gate is set.
 *
 * Field casing is intentionally mixed: camelCase for identity/program fields
 * (firstName, sessionId, programId, entryMode, startTerm, studyMode,
 * agreeToTerms), snake_case for everything in admission_README.md's original
 * CreateApplicationDto — this matches the real backend exactly, not a frontend
 * convention choice.
 *
 * `onUploadProgress` receives the percentage of the multipart body written to
 * the network. It reaches 100% when the last byte is *sent*, which is before
 * the server has finished processing — callers should switch to an
 * indeterminate state at that point rather than treating it as completion.
 */
export async function submitApplication(
  values: FormDefaultValues,
  profile: CurrentUserProfile,
  sessionId: number,
  onUploadProgress?: (percent: number) => void,
  /** Answers to dynamic questions — see buildDynamicPayload in ../lib/dynamic-form.ts. */
  dynamic?: {
    answers: DynamicAnswers
    customFields: Record<string, DynamicFieldValue>
  }
): Promise<SubmitApplicationResponse> {
  const payload: Record<string, unknown> = {
    // Identity — from the logged-in user's own profile, not re-collected.
    firstName: profile.firstName,
    middleName: profile.middleName,
    lastName: profile.lastName,
    email: profile.email,
    phoneNumber: profile.phoneNumber,

    // Program & session
    entryMode: values.entryMode,
    sessionId,
    programId: values.programId,

    // Step 1: Personal Information
    nationality: values.nationality,
    stateOfOrigin: values.state_of_origin,
    lga: values.lga,
    religion: values.religion,
    dob: values.dob,
    gender: values.gender === "Male" ? "MALE" : "FEMALE",
    hometown: values.hometown,
    hometown_address: values.hometown_address,
    contact_address: values.contact_address,
    has_disability: values.has_disability,
    ...(values.has_disability && { disability: values.disability }),

    // Step 2: Sponsor Information
    has_sponsor: values.has_sponsor,
    ...(values.has_sponsor && {
      sponsor_name: values.sponsor_name,
      sponsor_relationship: values.sponsor_relationship,
      sponsor_email: values.sponsor_email,
      sponsor_contact_address: values.sponsor_contact_address,
      sponsor_phone_number: values.sponsor_phone_number,
    }),

    // Step 3: Next of Kin
    next_of_kin_name: values.next_of_kin_name,
    next_of_kin_relationship: values.next_of_kin_relationship,
    next_of_kin_phone_number: values.next_of_kin_phone_number,
    next_of_kin_address: values.next_of_kin_address,
    next_of_kin_email: values.next_of_kin_email,
    is_next_of_kin_primary_contact: values.is_next_of_kin_primary_contact,
    next_of_kin_alternate_phone_number:
      values.next_of_kin_alternate_phone_number,
    next_of_kin_occupation: values.next_of_kin_occupation,
    next_of_kin_workplace: values.next_of_kin_workplace,

    // Step 5 & 6: Qualification fields + exam sitting
    awaiting_result: values.awaiting_result,
    ...(!values.awaiting_result && {
      combined_result: values.combined_result,
      first_sitting_type: values.first_sitting_type,
      first_sitting_year: values.first_sitting_year,
      first_sitting_exam_number: values.first_sitting_exam_number,
      ...(values.combined_result === "combined_result" && {
        second_sitting_type: values.second_sitting_type,
        second_sitting_year: values.second_sitting_year,
        second_sitting_exam_number: values.second_sitting_exam_number,
      }),
    }),

    // Step 8: Program Selection
    startTerm: values.startTerm,
    studyMode: values.studyMode,
    agreeToTerms: values.agreeToTerms,

    // Files (Step 4 & 7) — File[] is expanded to other_documents[0], [1], ...
    passport: values.passport,
    first_school_leaving: values.first_school_leaving,
    o_level: values.o_level,
    other_documents: values.other_documents,
    first_sitting_result: values.first_sitting_result,
    second_sitting_result: values.second_sitting_result,

    // Dynamic questions (sandbox/dynamic-admission/API_CONTRACTS.md §3.4):
    // `answers[STEP][field]` is the new contract; `customFields[field]` is
    // what the live submit endpoint reads today (Applications - Submit.bru).
    // objectToFormData flattens both into bracketed multipart keys. Omitted
    // entirely when there are none.
    ...(dynamic &&
      Object.keys(dynamic.answers).length > 0 && { answers: dynamic.answers }),
    ...(dynamic &&
      Object.keys(dynamic.customFields).length > 0 && {
        customFields: dynamic.customFields,
      }),
  }

  const response = await apiClient.post<SubmitApplicationApiResponse>(
    "/admissions/applications",
    payload,
    {
      ...AUTH,
      contentType: "multipart",
      onUploadProgress,
      // This is a multipart body carrying every uploaded document at once —
      // confirmed live 2026-09-16 hitting apiClient's global 30s default
      // ("timeout of 30000ms exceeded") on a real submission with a real
      // file, a slow connection and/or backend processing (virus scan,
      // storage write) away from being an actual failure. `timeout: 0` is
      // axios's own convention for "no timeout" — scoped to this one
      // request only; every other call in the app keeps the 30s default.
      timeout: 0,
    }
  )
  return response.data
}
