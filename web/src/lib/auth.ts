/**
 * Auth-Helfer (Port von cms/modules/auth.js → TypeScript).
 */
import { apiPost, getAuthToken, TOKEN_KEY, USER_KEY } from './api';

export interface AuthUser {
    id?: number | string;
    user?: string;
    name?: string;
    role?: 'admin' | 'waiter' | 'kitchen';
    [key: string]: unknown;
}

export interface LoginResult {
    success: boolean;
    reason?: string;
    requirePasswordChange?: boolean;
}

export async function login(user: string, pass: string): Promise<LoginResult> {
    const res = await apiPost<{
        success?: boolean;
        token?: string;
        user?: AuthUser;
        reason?: string;
        requirePasswordChange?: boolean;
    }>('admin/login', { user, pass });

    if (!res) return { success: false, reason: 'Server nicht erreichbar.' };
    if (res.success && res.token) {
        sessionStorage.setItem(TOKEN_KEY, res.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
        return { success: true, requirePasswordChange: res.requirePasswordChange };
    }
    return { success: false, reason: res.reason || 'Benutzername oder Passwort falsch.' };
}

export function logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    location.reload();
}

export function getCurrentUser(): AuthUser | null {
    try {
        return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
    } catch {
        return null;
    }
}

/** Liest Claims aus dem JWT (Name/Rolle/Ablauf) ohne Verifikation. */
export function decodeToken(): Record<string, unknown> | null {
    const token = getAuthToken();
    if (!token) return null;
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

export function isAuthenticated(): boolean {
    return !!getAuthToken();
}
