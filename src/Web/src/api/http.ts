import { tokenStore } from '@/auth/tokenStore'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export class UnauthorizedError extends ApiError {
  constructor() {
    super(401, 'Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.')
  }
}

export class RateLimitError extends ApiError {
  constructor() {
    super(429, 'Çok fazla istek gönderildi, lütfen biraz bekleyin.')
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor() {
    super(503, 'Servis şu anda kullanılamıyor, lütfen daha sonra deneyin.')
  }
}

// Oturum düştüğünde AuthContext'in haberdar olması için (http katmanı React'a bağımlı olamaz).
export const authEvents = new EventTarget()

type ApiInit = Omit<RequestInit, 'body'> & { body?: unknown }

function send(path: string, init?: ApiInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  const token = tokenStore.getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let body: BodyInit | undefined
  if (init?.body !== undefined) {
    if (init.body instanceof FormData) {
      // Content-Type'ı tarayıcı belirler (multipart boundary ile birlikte).
      body = init.body
    } else {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify(init.body)
    }
  }

  return fetch(`${API_URL}${path}`, { ...init, headers, body })
}

// Refresh token'lar rotate edildiği için eşzamanlı 401'ler tek bir refresh
// çağrısını paylaşmak zorunda: ikinci bir çağrı revoke edilmiş token'la 401
// alır ve kullanıcıyı gereksiz yere düşürür (single-flight).
let refreshInFlight: Promise<boolean> | null = null

export function tryRefresh(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refreshToken = tokenStore.getRefreshToken()
    if (!refreshToken) return false
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      tokenStore.clear()
      return false
    }
    tokenStore.save(await res.json())
    return true
  })().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function problemMessage(res: Response): Promise<string> {
  try {
    const problem = await res.json()
    return problem.detail ?? problem.title ?? res.statusText
  } catch {
    return res.statusText
  }
}

export async function api<T>(path: string, init?: ApiInit): Promise<T> {
  let res = await send(path, init)

  if (res.status === 401 && tokenStore.getRefreshToken()) {
    if (await tryRefresh()) res = await send(path, init)
  }
  if (res.status === 401) {
    tokenStore.clear()
    authEvents.dispatchEvent(new Event('unauthorized'))
    throw new UnauthorizedError()
  }
  if (res.status === 429) throw new RateLimitError()
  if (res.status === 503) throw new ServiceUnavailableError()
  if (!res.ok) throw new ApiError(res.status, await problemMessage(res))

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
