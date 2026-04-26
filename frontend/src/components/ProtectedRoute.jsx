import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, requireAdmin, requirePetAdmin, requireSellerAdmin, requireAdoptionAdmin }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (requireAdmin && user.role !== 'Admin') {
    return <Navigate to="/" replace />
  }

  if (requirePetAdmin && user.role !== 'PetAdmin' && user.role !== 'Admin') {
    return <Navigate to="/" replace />
  }

  if (requireSellerAdmin && user.role !== 'SellerAdmin' && user.role !== 'Admin') {
    return <Navigate to="/" replace />
  }

  if (requireAdoptionAdmin && user.role !== 'AdoptionAdmin' && user.role !== 'Admin') {
    return <Navigate to="/" replace />
  }

  return children
}
