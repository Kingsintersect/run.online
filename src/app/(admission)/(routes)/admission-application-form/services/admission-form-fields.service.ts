/* ------------------------------------------------------------------ */
/*  Dynamic Application Form Fields — API Service                      */
/*                                                                     */
/*  Multi-Program Platform — sandbox/multi-program-platform/. Full CRUD */
/*  on the AdmissionFormField rows a FORM-group admission step owns —   */
/*  the pieces that replace the old fixed 9-step wizard with an admin-  */
/*  composable form. Not yet shipped by the backend, see               */
/*  BACKEND_REQUIRED_ENDPOINTS.md §2 / API_CONTRACTS.md §B — every call */
/*  here 404s until it ships and degrades to an empty field list        */
/*  (DynamicFormField.tsx renders nothing for a step with no fields,    */
/*  which is indistinguishable from "this step has no dynamic fields    */
/*  yet" — the correct behavior either way).                            */
/* ------------------------------------------------------------------ */

import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  AdmissionFormField,
  CreateAdmissionFormFieldPayload,
  UpdateAdmissionFormFieldPayload,
} from "@/types/admissionConfig"

const AUTH = { access_token: true } as const
const BASE = "/admissions/config/steps"

export const admissionFormFieldsApi = {
  async list(stepId: number): Promise<AdmissionFormField[]> {
    const res = await apiClient.get<{ data: AdmissionFormField[] }>(
      `${BASE}/${stepId}/fields`,
      AUTH
    )
    return res.data
  },

  async create(
    stepId: number,
    payload: CreateAdmissionFormFieldPayload
  ): Promise<AdmissionFormField> {
    const res = await apiClient.post<{ data: AdmissionFormField }>(
      `${BASE}/${stepId}/fields`,
      payload,
      AUTH
    )
    return res.data
  },

  async update(
    stepId: number,
    fieldId: number,
    payload: UpdateAdmissionFormFieldPayload
  ): Promise<AdmissionFormField> {
    const res = await apiClient.patch<{ data: AdmissionFormField }>(
      `${BASE}/${stepId}/fields/${fieldId}`,
      payload,
      AUTH
    )
    return res.data
  },

  async remove(stepId: number, fieldId: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(
      `${BASE}/${stepId}/fields/${fieldId}`,
      AUTH
    )
  },
}

export const admissionFormFieldsKeys = {
  all: ["admission-form-fields"] as const,
  byStep: (stepId: number) =>
    [...admissionFormFieldsKeys.all, "step", stepId] as const,
}

export const admissionFormFieldsQueryOptions = {
  byStep: (stepId: number) =>
    createApiQueryOptions({
      queryKey: admissionFormFieldsKeys.byStep(stepId),
      queryFn: () => admissionFormFieldsApi.list(stepId),
      retry: false,
    }),
}

export const admissionFormFieldsMutationOptions = {
  create: () =>
    createApiMutationOptions<
      AdmissionFormField,
      { stepId: number; payload: CreateAdmissionFormFieldPayload }
    >({
      mutationKey: [...admissionFormFieldsKeys.all, "create"],
      mutationFn: ({ stepId, payload }) =>
        admissionFormFieldsApi.create(stepId, payload),
    }),

  update: () =>
    createApiMutationOptions<
      AdmissionFormField,
      {
        stepId: number
        fieldId: number
        payload: UpdateAdmissionFormFieldPayload
      }
    >({
      mutationKey: [...admissionFormFieldsKeys.all, "update"],
      mutationFn: ({ stepId, fieldId, payload }) =>
        admissionFormFieldsApi.update(stepId, fieldId, payload),
    }),

  remove: () =>
    createApiMutationOptions<
      { message: string },
      { stepId: number; fieldId: number }
    >({
      mutationKey: [...admissionFormFieldsKeys.all, "remove"],
      mutationFn: ({ stepId, fieldId }) =>
        admissionFormFieldsApi.remove(stepId, fieldId),
    }),
}
