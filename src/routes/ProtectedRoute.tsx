import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { LoadingState } from '../components/ui/LoadingState'
import { withNext } from '../lib/auth-redirect'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState variant="fullscreen" />
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={withNext('/login', next)} replace />
  }

  return <Outlet />
}
