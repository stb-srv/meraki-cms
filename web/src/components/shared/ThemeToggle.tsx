import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/providers/ThemeProvider';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Zu Hell wechseln' : 'Zu Dunkel wechseln'}
            title={theme === 'dark' ? 'Hell' : 'Dunkel'}
        >
            {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
    );
}
