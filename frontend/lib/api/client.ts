import { createClient } from '@/lib/supabase/client'
import { getApiUrl } from '@/lib/api/url'

export interface ApiError {
  code: string
  message: string
  status: number
  details?: unknown
}

async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.refreshSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    const redirect = `${window.location.pathname}${window.location.search}`
    window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`)
  }
}

function validationMessage(detail: unknown): string | null {
  if (typeof detail === 'string') return detail
  if (!Array.isArray(detail)) return null

  const messages = detail.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const entry = item as Record<string, unknown>
    const field = Array.isArray(entry.loc) ? entry.loc.filter((part) => part !== 'body').join('.') : ''
    return typeof entry.msg === 'string' ? [`${field ? `${field}: ` : ''}${entry.msg}`] : []
  })
  return messages.length ? messages.join('; ') : null
}

export function createError(status: number, body: Record<string, unknown>): ApiError {
  const detail = body.detail
  const detailObject = detail && typeof detail === 'object' && !Array.isArray(detail)
    ? detail as Record<string, unknown>
    : undefined
  const nestedError = (body.error ?? detailObject?.error) as Record<string, unknown> | undefined
  const source = nestedError ?? detailObject ?? body
  const normalizedMessage = validationMessage(source.message ?? source.detail ?? detail)
  return {
    code: (source.code as string) ?? 'UNKNOWN_ERROR',
    message: normalizedMessage ?? messageForStatus(status),
    status,
    details: source.details ?? body,
  }
}

function messageForStatus(status: number): string {
  const messages: Record<number, string> = {
    400: 'Dados inválidos. Revise as informações enviadas.',
    401: 'Sua sessão expirou. Entre novamente.',
    403: 'Você não tem permissão para realizar esta ação.',
    404: 'Registro não encontrado.',
    409: 'Não foi possível concluir devido a um conflito.',
    422: 'Revise os campos informados.',
    500: 'O servidor encontrou um erro inesperado.',
  }
  return messages[status] ?? 'Não foi possível concluir a solicitação.'
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  accessToken?: string,
): Promise<T> {
  const url = `${getApiUrl()}${path}`

  const token = accessToken ?? await getAccessToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
  })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      const error = createError(response.status, errorBody)

      if (response.status === 401) {
        const newToken = await refreshAccessToken()
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`
          const retry = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal,
          })
          if (retry.ok) {
            if (retry.status === 204) return undefined as T
            return retry.json()
          }
          const retryErrorBody = await retry.json().catch(() => ({}))
          const retryError = createError(retry.status, retryErrorBody)
          if (retry.status === 401) redirectToLogin()
          throw retryError
        }
        redirectToLogin()
      }

      throw error
    }

    if (response.status === 204) {
      return undefined as T
    }

  return response.json()
}

export const apiClient = {
  get<T>(path: string, signal?: AbortSignal, accessToken?: string): Promise<T> {
    return request<T>('GET', path, undefined, signal, accessToken)
  },
  post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return request<T>('POST', path, body, signal)
  },
  patch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return request<T>('PATCH', path, body, signal)
  },
  delete<T>(path: string, signal?: AbortSignal): Promise<T> {
    return request<T>('DELETE', path, undefined, signal)
  },
}
