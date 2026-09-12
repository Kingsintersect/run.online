import { API_BASE_URL } from "@/config/global.config"
import {
  mutationOptions,
  queryOptions,
  type MutationOptions,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query"
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosProgressEvent,
} from "axios"

/** Default HTTP request timeout in milliseconds. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30000

export type TokenPersistence = "memory" | "local" | "session"

export type RequestBodyFormat = "json" | "multipart"

export type RequestOptions = {
  access_token?: boolean
  headers?: Record<string, string>
  params?: Record<string, unknown>
  timeout?: number
  skipAuthRefresh?: boolean
  meta?: Record<string, unknown>
  responseType?: "json" | "blob" | "text" | "arraybuffer"
  /**
   * How to encode the request body. Defaults to `"json"`
   * (`Content-Type: application/json`).
   *
   * Pass `"multipart"` for uploads (images, documents): a plain object body
   * is converted to `FormData` via {@link objectToFormData} and the browser
   * sets the `multipart/form-data` boundary itself. A body that is already a
   * `FormData` instance is sent as multipart regardless of this option.
   */
  contentType?: RequestBodyFormat
  /**
   * Called with the whole-number percentage (0-100) of the request body
   * written to the network, for driving an upload progress bar.
   *
   * Only meaningful for requests that carry a body — in practice multipart
   * uploads. It is skipped when the browser cannot report a total size (a
   * streamed body), so a caller should treat "no callback yet" as 0% rather
   * than as an error. Reaching 100% means the last byte was *sent*, not that
   * the server has finished processing it.
   */
  onUploadProgress?: (percent: number) => void
}

/**
 * Recursively flattens a plain object into `FormData`, using the
 * `key[nested]` / `key[index]` bracket notation Laravel expects.
 *
 * - `File` / `Blob` values are appended as-is (the point of multipart)
 * - `boolean` becomes `"1"` / `"0"` (Laravel's `boolean` validation rule
 *   rejects the literals `"true"` / `"false"`)
 * - `Date` becomes an ISO string
 * - `null`, `undefined`, and `""` entries are skipped entirely — in a
 *   `multipart/form-data` create/upload an empty field is equivalent to an
 *   omitted one, and the backend's `nullable`/`sometimes` rules treat them
 *   the same. Append to a `FormData` by hand if you need to send a literal
 *   empty string.
 * - nested objects and arrays recurse
 */
export function objectToFormData(
  input: Record<string, unknown>,
  form: FormData = new FormData(),
  parentKey?: string
): FormData {
  const append = (key: string, value: unknown): void => {
    if (value === undefined || value === null || value === "") return
    if (value instanceof File || value instanceof Blob) {
      form.append(key, value)
      return
    }
    if (value instanceof Date) {
      form.append(key, value.toISOString())
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => append(`${key}[${index}]`, item))
      return
    }
    if (typeof value === "object") {
      objectToFormData(value as Record<string, unknown>, form, key)
      return
    }
    if (typeof value === "boolean") {
      form.append(key, value ? "1" : "0")
      return
    }
    form.append(key, String(value))
  }

  Object.entries(input).forEach(([key, value]) => {
    append(parentKey ? `${parentKey}[${key}]` : key, value)
  })

  return form
}

type RequestMethod = NonNullable<AxiosRequestConfig["method"]>

type ApiRequestConfig = AxiosRequestConfig & {
  _retry?: boolean
  _accessToken?: boolean
  _skipAuthRefresh?: boolean
  _requestMeta?: {
    startedAt: number
    meta?: Record<string, unknown>
  }
}

type ApiInternalRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  _accessToken?: boolean
  _skipAuthRefresh?: boolean
  _requestMeta?: {
    startedAt: number
    meta?: Record<string, unknown>
  }
}

export type ApiClientHooks = {
  onRequest?: (config: ApiRequestConfig) => void | Promise<void>
  onResponse?: (response: AxiosResponse) => void | Promise<void>
  onResponseError?: (error: ApiClientError) => void | Promise<void>
  onUnauthorized?: (error: ApiClientError) => void | Promise<void>
  onForbidden?: (error: ApiClientError) => void | Promise<void>
  onTokenRefreshed?: (token: string | null) => void | Promise<void>
}

export type ApiRefreshHandler = (context: {
  error: AxiosError
  client: ApiClient
}) => Promise<string | null>

export type ApiLogger = (event: {
  phase: "request" | "response" | "error" | "refresh"
  method?: string
  url?: string
  status?: number
  durationMs?: number
  message?: string
  meta?: Record<string, unknown>
}) => void

export type ApiClientConfig = {
  baseURL?: string
  timeout?: number
  defaultHeaders?: Record<string, string>
  enableLogging?: boolean
  logger?: ApiLogger
  hooks?: ApiClientHooks
  refreshAccessToken?: ApiRefreshHandler
}

export class ApiClientError extends Error {
  public original?: unknown
  public status?: number
  public data?: unknown

  constructor(
    message: string,
    original?: unknown,
    status?: number,
    data?: unknown
  ) {
    super(message)
    this.name = "ApiClientError"
    this.original = original
    this.status = status
    this.data = data
  }
}

type QueryFactoryConfig<TResponse> = {
  queryKey: QueryKey
  queryFn: () => Promise<TResponse>
} & Omit<
  UseQueryOptions<TResponse, ApiClientError, TResponse, QueryKey>,
  "queryKey" | "queryFn"
>

type MutationFactoryConfig<TResponse, TVariables> = {
  mutationKey?: QueryKey
  mutationFn: (variables: TVariables) => Promise<TResponse>
} & Omit<
  MutationOptions<TResponse, ApiClientError, TVariables, unknown>,
  "mutationKey" | "mutationFn"
>

/**
 * ApiClient
 * - wraps axios
 * - supports token refresh, logging, and global lifecycle hooks
 * - exposes React Query option builders for a consistent data layer pattern
 */
export class ApiClient {
  private axios: AxiosInstance
  private memoryToken: string | null = null
  private config: Required<Pick<ApiClientConfig, "enableLogging">> &
    Omit<ApiClientConfig, "enableLogging">

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL ?? API_BASE_URL,
      timeout: config.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS,
      defaultHeaders: config.defaultHeaders ?? {},
      enableLogging: config.enableLogging ?? false,
      logger: config.logger,
      hooks: config.hooks,
      refreshAccessToken: config.refreshAccessToken,
    }

    this.axios = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        ...this.config.defaultHeaders,
      },
    })

    this.registerInterceptors()
  }

  setConfig(config: Partial<ApiClientConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      enableLogging: config.enableLogging ?? this.config.enableLogging,
      defaultHeaders: config.defaultHeaders ?? this.config.defaultHeaders,
      hooks: {
        ...this.config.hooks,
        ...config.hooks,
      },
    }

    if (config.baseURL) this.axios.defaults.baseURL = config.baseURL
    if (config.timeout) this.axios.defaults.timeout = config.timeout
    if (config.defaultHeaders) {
      Object.entries(config.defaultHeaders).forEach(([key, value]) => {
        this.axios.defaults.headers.common[key] = value
      })
    }
  }

  setHooks(hooks: Partial<ApiClientHooks>): void {
    this.setConfig({ hooks })
  }

  setRefreshHandler(refreshAccessToken?: ApiRefreshHandler): void {
    this.setConfig({ refreshAccessToken })
  }

  setLogger(logger?: ApiLogger, enableLogging = true): void {
    this.setConfig({ logger, enableLogging })
  }

  /**
   * Set token programmatically.
   * persistence: 'memory' | 'local' | 'session'
   */
  setAccessToken(
    token: string | null,
    persistence: TokenPersistence = "memory"
  ): void {
    this.memoryToken = token
    if (typeof window === "undefined") return
    try {
      if (persistence === "local") {
        if (token) localStorage.setItem("access_token", token)
        else localStorage.removeItem("access_token")
      } else if (persistence === "session") {
        if (token) sessionStorage.setItem("access_token", token)
        else sessionStorage.removeItem("access_token")
      }
    } catch {
      // ignore storage errors (e.g., disabled storage)
    }
  }

  clearAccessToken(): void {
    this.memoryToken = null
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("access_token")
      } catch {}
      try {
        sessionStorage.removeItem("access_token")
      } catch {}
    }
  }

  setBaseURL(url: string): void {
    this.axios.defaults.baseURL = url
  }

  setDefaultHeader(key: string, value: string | null): void {
    if (!value) {
      delete this.axios.defaults.headers.common[key]
      return
    }
    this.axios.defaults.headers.common[key] = value
  }

  getAxiosInstance(): AxiosInstance {
    return this.axios
  }

  buildQueryOptions<TResponse>(config: QueryFactoryConfig<TResponse>) {
    return queryOptions(config)
  }

  buildMutationOptions<TResponse, TVariables = void>(
    config: MutationFactoryConfig<TResponse, TVariables>
  ) {
    return mutationOptions(config)
  }

  // internal: pick token from memory then storages
  private pickAuthToken(): string | null {
    if (this.memoryToken) return this.memoryToken
    if (typeof window === "undefined") return null
    try {
      return (
        localStorage.getItem("access_token") ??
        sessionStorage.getItem("access_token") ??
        null
      )
    } catch {
      return null
    }
  }

  private emitLog(event: Parameters<NonNullable<ApiLogger>>[0]): void {
    if (!this.config.enableLogging || !this.config.logger) return
    this.config.logger(event)
  }

  private normalizeError(error: unknown): ApiClientError {
    let message = "An unexpected error occurred."
    let status: number | undefined
    let data: unknown | undefined

    if (axios.isAxiosError(error)) {
      const axiosErr = error as AxiosError & {
        response?: { status?: number; data?: unknown }
      }
      status = axiosErr.response?.status
      data = axiosErr.response?.data

      if (
        axiosErr.response?.data &&
        typeof axiosErr.response.data === "object" &&
        axiosErr.response.data !== null
      ) {
        const maybeMsg = (axiosErr.response.data as { message?: unknown })
          .message
        if (typeof maybeMsg === "string") message = maybeMsg
        else if (axiosErr.response?.statusText)
          message = axiosErr.response.statusText
        else message = `Server error (${status ?? "unknown"})`
      } else if (typeof axiosErr.response?.data === "string") {
        message = axiosErr.response.data
      } else if (axiosErr.message) {
        message = axiosErr.message
      }
    } else if (error instanceof Error) {
      message = error.message
    } else if (typeof error === "string") {
      message = error
    }

    return new ApiClientError(message, error, status, data)
  }

  private registerInterceptors(): void {
    this.axios.interceptors.request.use(async (config) => {
      const requestConfig = config as ApiInternalRequestConfig
      requestConfig._requestMeta = {
        startedAt: Date.now(),
        meta: requestConfig._requestMeta?.meta,
      }

      // This instance defaults every request to Content-Type: application/json
      // (see the constructor). Axios's own default transformRequest treats
      // that explicit header as an instruction to convert a FormData body to
      // JSON via its formDataToJSON() helper before stringifying — which
      // silently turns every File/Blob entry into "{}" (JSON.stringify has
      // nothing to serialize on a File). Any multipart upload (file uploads
      // across the app) would otherwise submit empty file placeholders while
      // every other field looks fine. Strip the header here so axios takes
      // the plain FormData passthrough path and lets the browser set the
      // correct multipart boundary itself.
      if (requestConfig.data instanceof FormData) {
        const headers = new AxiosHeaders(
          requestConfig.headers as
            | AxiosHeaders
            | Record<string, string>
            | undefined
        )
        headers.delete("Content-Type")
        requestConfig.headers = headers
      }

      if (requestConfig._accessToken) {
        const token = this.pickAuthToken()
        if (token) {
          const headers = new AxiosHeaders(
            requestConfig.headers as
              | AxiosHeaders
              | Record<string, string>
              | undefined
          )
          headers.set("Authorization", `Bearer ${token}`)
          requestConfig.headers = headers
        }
      }

      await this.config.hooks?.onRequest?.(requestConfig)

      this.emitLog({
        phase: "request",
        method: requestConfig.method?.toUpperCase(),
        url: requestConfig.url,
        meta: requestConfig._requestMeta?.meta,
      })

      return requestConfig
    })

    this.axios.interceptors.response.use(
      async (response) => {
        const requestConfig = response.config as ApiRequestConfig
        const durationMs = requestConfig._requestMeta
          ? Date.now() - requestConfig._requestMeta.startedAt
          : undefined

        await this.config.hooks?.onResponse?.(response)

        this.emitLog({
          phase: "response",
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          durationMs,
          meta: requestConfig._requestMeta?.meta,
        })

        return response
      },
      async (error: AxiosError) => {
        const requestConfig = (error.config ?? {}) as ApiRequestConfig

        if (
          error.response?.status === 401 &&
          requestConfig._accessToken &&
          !requestConfig._retry &&
          !requestConfig._skipAuthRefresh &&
          this.config.refreshAccessToken
        ) {
          requestConfig._retry = true

          try {
            const refreshedToken = await this.config.refreshAccessToken({
              error,
              client: this,
            })

            this.setAccessToken(refreshedToken, "memory")
            await this.config.hooks?.onTokenRefreshed?.(refreshedToken)

            this.emitLog({
              phase: "refresh",
              method: requestConfig.method?.toUpperCase(),
              url: requestConfig.url,
              message: refreshedToken
                ? "token refreshed"
                : "token refresh returned empty token",
              meta: requestConfig._requestMeta?.meta,
            })

            if (refreshedToken) {
              const headers = new AxiosHeaders(
                requestConfig.headers as
                  | AxiosHeaders
                  | Record<string, string>
                  | undefined
              )
              headers.set("Authorization", `Bearer ${refreshedToken}`)
              requestConfig.headers = headers
              return this.axios.request(requestConfig)
            }
          } catch (refreshError) {
            const normalizedRefreshError = this.normalizeError(refreshError)
            await this.config.hooks?.onUnauthorized?.(normalizedRefreshError)
            await this.config.hooks?.onResponseError?.(normalizedRefreshError)
            throw normalizedRefreshError
          }
        }

        const normalizedError = this.normalizeError(error)
        const durationMs = requestConfig._requestMeta
          ? Date.now() - requestConfig._requestMeta.startedAt
          : undefined

        // Reaching this point with a 401 means either refresh wasn't
        // possible (no handler / no refresh token) or it ran and still
        // didn't produce a usable token — the early `return` above is the
        // only successful-refresh exit. Only fire for requests that meant
        // to be authenticated (`access_token: true`); a public endpoint
        // returning 401 unexpectedly isn't "your session expired".
        if (normalizedError.status === 401 && requestConfig._accessToken) {
          await this.config.hooks?.onUnauthorized?.(normalizedError)
        }

        if (normalizedError.status === 403) {
          await this.config.hooks?.onForbidden?.(normalizedError)
        }

        await this.config.hooks?.onResponseError?.(normalizedError)

        this.emitLog({
          phase: "error",
          method: requestConfig.method?.toUpperCase(),
          url: requestConfig.url,
          status: normalizedError.status,
          durationMs,
          message: normalizedError.message,
          meta: requestConfig._requestMeta?.meta,
        })

        throw normalizedError
      }
    )
  }

  // central request method
  private async request<TResponse, TBody = unknown>(
    method: RequestMethod,
    url: string,
    body?: TBody,
    opts: RequestOptions = {}
  ): Promise<TResponse> {
    const headers = AxiosHeaders.from(opts.headers ?? {})

    // `contentType: "multipart"` — convert a plain object body to FormData so
    // callers can pass `{ firstName, passportPhoto: File, documents: File[] }`
    // directly instead of hand-building FormData. An existing FormData instance
    // is left untouched. Either way the request interceptor strips the default
    // JSON Content-Type header so the browser can set the multipart boundary.
    let data: TBody | FormData | undefined = body
    if (
      opts.contentType === "multipart" &&
      body != null &&
      !(body instanceof FormData)
    ) {
      data = objectToFormData(body as Record<string, unknown>)
    }

    const response = await this.axios.request<TResponse>({
      url,
      method,
      data,
      params: opts.params,
      headers,
      responseType: opts.responseType,
      timeout: opts.timeout ?? this.axios.defaults.timeout,
      // Left undefined when the caller isn't tracking progress so axios keeps
      // its default (cheaper) request path. `event.total` is absent for
      // streamed bodies, in which case there is no percentage to report.
      onUploadProgress: opts.onUploadProgress
        ? (event: AxiosProgressEvent) => {
            if (!event.total) return
            opts.onUploadProgress?.(
              Math.round((event.loaded * 100) / event.total)
            )
          }
        : undefined,
      _accessToken: opts.access_token,
      _skipAuthRefresh: opts.skipAuthRefresh,
      _requestMeta: {
        startedAt: Date.now(),
        meta: opts.meta,
      },
    } as ApiRequestConfig)

    return response.data
  }

  // convenience methods (generic)
  async get<TResponse>(url: string, opts?: RequestOptions): Promise<TResponse> {
    return this.request<TResponse>("GET", url, undefined, opts)
  }

  async post<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    opts?: RequestOptions
  ): Promise<TResponse> {
    return this.request<TResponse, TBody>("POST", url, body, opts)
  }

  async put<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    opts?: RequestOptions
  ): Promise<TResponse> {
    return this.request<TResponse, TBody>("PUT", url, body, opts)
  }

  async patch<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    opts?: RequestOptions
  ): Promise<TResponse> {
    return this.request<TResponse, TBody>("PATCH", url, body, opts)
  }

  async delete<TResponse>(
    url: string,
    opts?: RequestOptions
  ): Promise<TResponse> {
    return this.request<TResponse>("DELETE", url, undefined, opts)
  }
}

export function createApiQueryOptions<TResponse>(
  config: QueryFactoryConfig<TResponse>
) {
  return queryOptions(config)
}

export function createApiMutationOptions<TResponse, TVariables = void>(
  config: MutationFactoryConfig<TResponse, TVariables>
) {
  return mutationOptions(config)
}

// default singleton instance (you can import and use directly)
const apiClient = new ApiClient({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
})

export default apiClient
