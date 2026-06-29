import * as React from 'react';
import { apiGet } from '@/lib/api';
import { applyBranding, type BrandingColors } from '@/lib/branding';

/**
 * Lädt einmalig die Branding-Farben (GET /api/branding) und wendet sie als
 * CSS-Variablen an → White-Labeling ohne Tailwind-Rebuild.
 * Nach dem Speichern im Branding-Tab kann applyBranding() direkt aufgerufen
 * oder der Query invalidiert werden.
 */
export function BrandingGate({ children }: { children: React.ReactNode }) {
    React.useEffect(() => {
        let cancelled = false;
        apiGet<BrandingColors>('branding').then((b) => {
            if (!cancelled && b) applyBranding(b);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return <>{children}</>;
}
