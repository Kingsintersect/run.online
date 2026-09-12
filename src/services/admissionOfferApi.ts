/* ------------------------------------------------------------------ */
/*  Admission Offers — API Service                                      */
/*                                                                     */
/*  Creating/listing/viewing the formal `Admission` offer record that   */
/*  follows an approved application. Real, bruno-documented endpoints  */
/*  (bruno/admission/Admissions - {List,Get,Create}.bru) that had zero  */
/*  frontend callers — this is the first one. Accept/Decline live in    */
/*  src/app/(admission)/services/admissionService.ts (the applicant's   */
/*  own actions on their offer); this file is the admin/officer side:   */
/*  turning an approved application into an offer in the first place.   */
/* ------------------------------------------------------------------ */

import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"

const AUTH = { access_token: true } as const

export type AdmissionOfferStatus =
  | "OFFERED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"

export interface AdmissionOffer {
  id: number
  applicationId: number
  matricNumber: string | null
  admissionNumber: string
  programId: number
  levelId: number
  sessionId: number
  admissionDate: string
  admissionType: string
  status: AdmissionOfferStatus
  expiryDate: string | null
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateAdmissionOfferPayload {
  applicationId: number
  admissionNumber: string
  programId: number
  levelId: number
  sessionId: number
  admissionDate: string
  admissionType: string
  expiryDate?: string
}

export interface AdmissionOfferQueryFilters {
  sessionId?: number
  programId?: number
  status?: AdmissionOfferStatus
  page?: number
  limit?: number
}

export const admissionOfferApi = {
  list: (filters?: AdmissionOfferQueryFilters) =>
    apiClient.get<{
      data: AdmissionOffer[]
      meta: { total: number; page: number; limit: number }
    }>("/admissions", {
      ...AUTH,
      params: filters as Record<string, unknown> | undefined,
    }),

  getById: (id: number) =>
    apiClient.get<{ data: AdmissionOffer }>(`/admissions/${id}`, AUTH),

  // Admin only. Application must already be "approved" (per admission_README.md's
  // renamed ApplicationStatus — "ADMITTED" in the pre-addendum enum). `Admission` has
  // a unique constraint on applicationId, so a duplicate create 400s — surfaced to
  // the caller as a normal mutation error, not pre-checked client-side (there's no
  // real "does this application already have an offer" lookup endpoint to check
  // against first).
  create: (payload: CreateAdmissionOfferPayload) =>
    apiClient.post<{ data: AdmissionOffer }>("/admissions", payload, AUTH),

  // POST /admissions/bulk — Admin. One offer per item, applied atomically
  // per item; a per-item unique-constraint failure comes back as
  // `success: false` rather than a fatal error.
  bulkCreate: (admissions: CreateAdmissionOfferPayload[]) =>
    apiClient.post<{
      data: {
        applicationId: number
        success: boolean
        admissionId?: number
        error?: string
      }[]
    }>("/admissions/bulk", { admissions }, AUTH),
}

export const admissionOfferKeys = {
  all: ["admission-offers"] as const,
  list: (filters?: AdmissionOfferQueryFilters) =>
    [...admissionOfferKeys.all, "list", filters ?? {}] as const,
  detail: (id: number) => [...admissionOfferKeys.all, "detail", id] as const,
}

export const admissionOfferQueryOptions = {
  list: (filters?: AdmissionOfferQueryFilters) =>
    createApiQueryOptions({
      queryKey: admissionOfferKeys.list(filters),
      queryFn: async () => (await admissionOfferApi.list(filters)).data,
    }),

  detail: (id: number) =>
    createApiQueryOptions({
      queryKey: admissionOfferKeys.detail(id),
      queryFn: async () => (await admissionOfferApi.getById(id)).data,
    }),
}

export const admissionOfferMutationOptions = {
  create: () =>
    createApiMutationOptions<
      { data: AdmissionOffer },
      CreateAdmissionOfferPayload
    >({
      mutationKey: [...admissionOfferKeys.all, "create"],
      mutationFn: admissionOfferApi.create,
    }),

  bulkCreate: () =>
    createApiMutationOptions<
      {
        data: {
          applicationId: number
          success: boolean
          admissionId?: number
          error?: string
        }[]
      },
      CreateAdmissionOfferPayload[]
    >({
      mutationKey: [...admissionOfferKeys.all, "bulk-create"],
      mutationFn: admissionOfferApi.bulkCreate,
    }),
}
