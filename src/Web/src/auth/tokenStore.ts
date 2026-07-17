import type { AuthResponse } from '@/api/types'

// Access token yalnızca bellekte tutulur; localStorage'a sadece refresh token
// yazılır (XSS yüzeyini daraltma / kalıcı oturum dengesi — README'de belgeli).
const REFRESH_KEY = 'ecommerce.refreshToken'

let accessToken: string | null = null

export const tokenStore = {
  getAccessToken: (): string | null => accessToken,
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_KEY),
  save(auth: AuthResponse): void {
    accessToken = auth.accessToken
    localStorage.setItem(REFRESH_KEY, auth.refreshToken)
  },
  clear(): void {
    accessToken = null
    localStorage.removeItem(REFRESH_KEY)
  },
}
