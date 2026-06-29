import { Outlet } from 'react-router-dom';

/** Vollbild-Layout für das Küchen-Display (ersetzt cms/kitchen.html). */
export function KitchenLayout() {
    return (
        <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
            <Outlet />
        </div>
    );
}
