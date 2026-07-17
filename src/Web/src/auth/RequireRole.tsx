import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Spinner } from '@/components/Spinner'

export function RequireRole({ role }: { role: string }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Spinner fullPage />
  if (status === 'anonymous')
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (!user?.roles.includes(role)) return <Navigate to="/" replace />
  return <Outlet />
}
