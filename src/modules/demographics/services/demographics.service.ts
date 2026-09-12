/* ------------------------------------------------------------------ */
/*  Demographics Module — API Service                                  */
/*                                                                     */
/*  Country / State / Local Government CRUD. Backend contract proposed */
/*  in sandbox/demographics/demographics_workflow.md — not built yet,  */
/*  every call here 404s until it ships.                               */
/* ------------------------------------------------------------------ */

import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  Country,
  CreateCountryPayload,
  UpdateCountryPayload,
  State,
  CreateStatePayload,
  UpdateStatePayload,
  LocalGovernment,
  CreateLocalGovernmentPayload,
  UpdateLocalGovernmentPayload,
  DemographicsListFilters,
} from "../types"

const AUTH = { access_token: true } as const
const BASE = "/demographics"

export const countriesApi = {
  async list(filters?: DemographicsListFilters): Promise<Country[]> {
    const res = await apiClient.get<{ data: Country[] }>(`${BASE}/countries`, {
      ...AUTH,
      params: filters as Record<string, unknown> | undefined,
    })
    return res.data
  },
  async getById(id: number): Promise<Country> {
    const res = await apiClient.get<{ data: Country }>(
      `${BASE}/countries/${id}`,
      AUTH
    )
    return res.data
  },
  async create(payload: CreateCountryPayload): Promise<Country> {
    const res = await apiClient.post<{ data: Country }>(
      `${BASE}/countries`,
      payload,
      AUTH
    )
    return res.data
  },
  async update(id: number, payload: UpdateCountryPayload): Promise<Country> {
    const res = await apiClient.patch<{ data: Country }>(
      `${BASE}/countries/${id}`,
      payload,
      AUTH
    )
    return res.data
  },
  async remove(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(
      `${BASE}/countries/${id}`,
      AUTH
    )
  },
}

export const statesApi = {
  async list(
    filters?: DemographicsListFilters & { countryId?: number }
  ): Promise<State[]> {
    const res = await apiClient.get<{ data: State[] }>(`${BASE}/states`, {
      ...AUTH,
      params: filters as Record<string, unknown> | undefined,
    })
    return res.data
  },
  async getById(id: number): Promise<State> {
    const res = await apiClient.get<{ data: State }>(
      `${BASE}/states/${id}`,
      AUTH
    )
    return res.data
  },
  async create(payload: CreateStatePayload): Promise<State> {
    const res = await apiClient.post<{ data: State }>(
      `${BASE}/states`,
      payload,
      AUTH
    )
    return res.data
  },
  async update(id: number, payload: UpdateStatePayload): Promise<State> {
    const res = await apiClient.patch<{ data: State }>(
      `${BASE}/states/${id}`,
      payload,
      AUTH
    )
    return res.data
  },
  async remove(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${BASE}/states/${id}`, AUTH)
  },
}

export const localGovernmentsApi = {
  async list(
    filters?: DemographicsListFilters & { stateId?: number }
  ): Promise<LocalGovernment[]> {
    const res = await apiClient.get<{ data: LocalGovernment[] }>(
      `${BASE}/local-governments`,
      { ...AUTH, params: filters as Record<string, unknown> | undefined }
    )
    return res.data
  },
  async getById(id: number): Promise<LocalGovernment> {
    const res = await apiClient.get<{ data: LocalGovernment }>(
      `${BASE}/local-governments/${id}`,
      AUTH
    )
    return res.data
  },
  async create(
    payload: CreateLocalGovernmentPayload
  ): Promise<LocalGovernment> {
    const res = await apiClient.post<{ data: LocalGovernment }>(
      `${BASE}/local-governments`,
      payload,
      AUTH
    )
    return res.data
  },
  async update(
    id: number,
    payload: UpdateLocalGovernmentPayload
  ): Promise<LocalGovernment> {
    const res = await apiClient.patch<{ data: LocalGovernment }>(
      `${BASE}/local-governments/${id}`,
      payload,
      AUTH
    )
    return res.data
  },
  async remove(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(
      `${BASE}/local-governments/${id}`,
      AUTH
    )
  },
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                          */
/* ------------------------------------------------------------------ */

export const demographicsKeys = {
  all: ["demographics"] as const,
  countries: {
    all: ["demographics", "countries"] as const,
    list: (filters?: DemographicsListFilters) =>
      ["demographics", "countries", "list", filters ?? {}] as const,
    detail: (id: number) =>
      ["demographics", "countries", "detail", id] as const,
  },
  states: {
    all: ["demographics", "states"] as const,
    list: (filters?: DemographicsListFilters & { countryId?: number }) =>
      ["demographics", "states", "list", filters ?? {}] as const,
    detail: (id: number) => ["demographics", "states", "detail", id] as const,
  },
  localGovernments: {
    all: ["demographics", "local-governments"] as const,
    list: (filters?: DemographicsListFilters & { stateId?: number }) =>
      ["demographics", "local-governments", "list", filters ?? {}] as const,
    detail: (id: number) =>
      ["demographics", "local-governments", "detail", id] as const,
  },
}

/* ------------------------------------------------------------------ */
/*  Query / Mutation options                                            */
/* ------------------------------------------------------------------ */

export const demographicsQueryOptions = {
  countries: {
    list: (filters?: DemographicsListFilters) =>
      createApiQueryOptions({
        queryKey: demographicsKeys.countries.list(filters),
        queryFn: () => countriesApi.list(filters),
        staleTime: 1000 * 60 * 10,
      }),
  },
  states: {
    list: (filters?: DemographicsListFilters & { countryId?: number }) =>
      createApiQueryOptions({
        queryKey: demographicsKeys.states.list(filters),
        queryFn: () => statesApi.list(filters),
        enabled: !!filters?.countryId,
        staleTime: 1000 * 60 * 10,
      }),
  },
  localGovernments: {
    list: (filters?: DemographicsListFilters & { stateId?: number }) =>
      createApiQueryOptions({
        queryKey: demographicsKeys.localGovernments.list(filters),
        queryFn: () => localGovernmentsApi.list(filters),
        enabled: !!filters?.stateId,
        staleTime: 1000 * 60 * 10,
      }),
  },
}

export const demographicsMutationOptions = {
  createCountry: () =>
    createApiMutationOptions<Country, CreateCountryPayload>({
      mutationKey: [...demographicsKeys.countries.all, "create"],
      mutationFn: (payload) => countriesApi.create(payload),
    }),
  updateCountry: () =>
    createApiMutationOptions<
      Country,
      { id: number; payload: UpdateCountryPayload }
    >({
      mutationKey: [...demographicsKeys.countries.all, "update"],
      mutationFn: ({ id, payload }) => countriesApi.update(id, payload),
    }),
  removeCountry: () =>
    createApiMutationOptions<{ message: string }, number>({
      mutationKey: [...demographicsKeys.countries.all, "remove"],
      mutationFn: (id) => countriesApi.remove(id),
    }),

  createState: () =>
    createApiMutationOptions<State, CreateStatePayload>({
      mutationKey: [...demographicsKeys.states.all, "create"],
      mutationFn: (payload) => statesApi.create(payload),
    }),
  updateState: () =>
    createApiMutationOptions<
      State,
      { id: number; payload: UpdateStatePayload }
    >({
      mutationKey: [...demographicsKeys.states.all, "update"],
      mutationFn: ({ id, payload }) => statesApi.update(id, payload),
    }),
  removeState: () =>
    createApiMutationOptions<{ message: string }, number>({
      mutationKey: [...demographicsKeys.states.all, "remove"],
      mutationFn: (id) => statesApi.remove(id),
    }),

  createLocalGovernment: () =>
    createApiMutationOptions<LocalGovernment, CreateLocalGovernmentPayload>({
      mutationKey: [...demographicsKeys.localGovernments.all, "create"],
      mutationFn: (payload) => localGovernmentsApi.create(payload),
    }),
  updateLocalGovernment: () =>
    createApiMutationOptions<
      LocalGovernment,
      { id: number; payload: UpdateLocalGovernmentPayload }
    >({
      mutationKey: [...demographicsKeys.localGovernments.all, "update"],
      mutationFn: ({ id, payload }) => localGovernmentsApi.update(id, payload),
    }),
  removeLocalGovernment: () =>
    createApiMutationOptions<{ message: string }, number>({
      mutationKey: [...demographicsKeys.localGovernments.all, "remove"],
      mutationFn: (id) => localGovernmentsApi.remove(id),
    }),
}
