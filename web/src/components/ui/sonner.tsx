import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useTheme } from '@/components/providers/ThemeProvider';

/** Toast-Container – ersetzt das alte showToast() aus cms/modules/utils.js. */
export function Toaster(props: ToasterProps) {
    const { resolvedTheme } = useTheme();
    return (
        <Sonner
            theme={resolvedTheme}
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: 'group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
                    description: 'group-[.toast]:text-muted-foreground',
                },
            }}
            {...props}
        />
    );
}
