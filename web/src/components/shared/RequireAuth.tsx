import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from '@/lib/auth';

/** Schützt Admin-Routen; leitet unauthentifiziert zum Login. */
export function RequireAuth() {
    return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}
