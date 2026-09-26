import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { LoadingState } from '../components/ui/LoadingState'
import { withNext } from '../lib/auth-redirect'
import { canAccessPath, orgStakeholderRedirect } from '../lib/roles'

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

  const orgRedirect = orgStakeholderRedirect(user, location.pathname)
  if (orgRedirect) {
    return <Navigate to={`${orgRedirect}${location.search}`} replace />
  }

  if (!canAccessPath(user, location.pathname)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
