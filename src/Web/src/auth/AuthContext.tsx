import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '@/api/auth'
import type { RegisterRequest } from '@/api/auth'
import { authEvents, tryRefresh } from '@/api/http'
import { tokenStore } from '@/auth/tokenStore'
import type { UserInfo } from '@/api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  user: UserInfo | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  register: (req: RegisterRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [status, setStatus] = useState<AuthStatus>(
    tokenStore.getRefreshToken() ? 'loading' : 'anonymous',
  )

  // Boot: localStorage'da refresh token varsa oturumu sessizce canlandır.
  useEffect(() => {
    let cancelled = false
    if (tokenStore.getRefreshToken()) {
      ;(async () => {
        try {
          if (await tryRefresh()) {
            const me = await authApi.me()
            if (!cancelled) {
              setUser(me)
              setStatus('authenticated')
            }
            return
          }
        } catch {
          tokenStore.clear()
        }
        if (!cancelled) setStatus('anonymous')
      })()
    }
    return () => {
      cancelled = true
    }
  }, [])

  // http katmanı refresh başarısız olduğunda haber verir → oturumu kapat.
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null)
      setStatus('anonymous')
    }
    authEvents.addEventListener('unauthorized', onUnauthorized)
    return () => authEvents.removeEventListener('unauthorized', onUnauthorized)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      async login(email, password) {
        tokenStore.save(await authApi.login({ email, password }))
        const me = await authApi.me()
        setUser(me)
        setStatus('authenticated')
      },
      async register(req) {
        // Register token döndürmez (201) — ardından otomatik login.
        await authApi.register(req)
        tokenStore.save(await authApi.login({ email: req.email, password: req.password }))
        const me = await authApi.me()
        setUser(me)
        setStatus('authenticated')
      },
      logout() {
        tokenStore.clear()
        setUser(null)
        setStatus('anonymous')
      },
    }),
    [user, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return ctx
}
