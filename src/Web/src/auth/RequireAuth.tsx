import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Spinner } from '@/components/Spinner'

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Spinner fullPage />
  if (status === 'anonymous')
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  return <Outlet />
}
