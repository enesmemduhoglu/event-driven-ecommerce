import { api } from './http'
import type { AuthResponse, UserInfo } from './types'

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
}

export const authApi = {
  register: (req: RegisterRequest) =>
    api<{ id: string; email: string }>('/api/auth/register', { method: 'POST', body: req }),
  login: (req: { email: string; password: string }) =>
    api<AuthResponse>('/api/auth/login', { method: 'POST', body: req }),
  me: () => api<UserInfo>('/api/auth/me'),
}
