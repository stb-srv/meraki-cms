import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { BrandingGate } from '@/components/providers/BrandingGate';
import { Toaster } from '@/components/ui/sonner';
import i18n from '@/i18n';

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/**
 * Globale Provider-Hülle für BEIDE SPAs (Admin + Gäste).
 * Theme (class-Dark-Mode) · i18n · React-Query · White-Label-Branding · Toaster.
 */
export function BaseLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <I18nextProvider i18n={i18n}>
                <QueryClientProvider client={queryClient}>
                    <TooltipProvider delayDuration={200}>
                        <BrandingGate>
                            {children}
                            <Toaster richColors position="top-right" />
                        </BrandingGate>
                    </TooltipProvider>
                </QueryClientProvider>
            </I18nextProvider>
        </ThemeProvider>
    );
}
