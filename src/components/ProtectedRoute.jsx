import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../auth/auth'
export default function ProtectedRoute() { const location = useLocation(); return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} /> }
