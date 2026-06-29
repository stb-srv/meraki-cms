import { ChevronsUpDown, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

/** Benutzer-Menü im Sidebar-Footer (Avatar + Name aus JWT, Logout). */
export function NavUser({ collapsed = false }: { collapsed?: boolean }) {
    const { name, role, avatar, logout } = useAuth();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    'flex w-full items-center gap-2 rounded-md p-2 text-left text-sm outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    collapsed && 'justify-center'
                )}
            >
                <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={avatar} alt={name} />
                    <AvatarFallback className="rounded-lg">
                        {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                {!collapsed && (
                    <>
                        <div className="grid flex-1 leading-tight">
                            <span className="truncate font-medium">{name}</span>
                            <span className="truncate text-xs text-muted-foreground">
                                {role || 'admin'}
                            </span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4 opacity-60" />
                    </>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuLabel>{name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                    <LogOut />
                    Abmelden
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
