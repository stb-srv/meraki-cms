import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { PanelLeft } from 'lucide-react';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

/**
 * Zentrales CMS-Layout: EINE Sidebar + EIN Header. Feature-Seiten werden über
 * <Outlet/> als Children injiziert. Header/Sidebar existieren nur hier.
 */
export function DashboardLayout() {
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <div className="flex h-svh w-full overflow-hidden bg-background">
            <AppSidebar collapsed={collapsed} />

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed((c) => !c)}
                        aria-label={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
                    >
                        <PanelLeft />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <h1 id="view-title" className="text-lg font-semibold" />
                    <div className="ml-auto flex items-center gap-1">
                        <ThemeToggle />
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
