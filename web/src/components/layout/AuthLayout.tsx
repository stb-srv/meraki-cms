import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

/** Layout für Login / Setup / Passwort-Wechsel (zentriert, ohne Sidebar). */
export function AuthLayout() {
    return (
        <div className="relative flex min-h-svh items-center justify-center bg-muted/40 p-4">
            <div className="absolute right-4 top-4">
                <ThemeToggle />
            </div>
            <div className="w-full max-w-sm">
                <Outlet />
            </div>
        </div>
    );
}
