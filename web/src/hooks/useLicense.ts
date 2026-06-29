import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { LicenseModule } from '@/config/navigation';

export interface LicenseInfo {
    type?: string;
    isTrial?: boolean;
    trialDaysLeft?: number;
    modules?: Partial<Record<LicenseModule, boolean>> & Record<string, boolean>;
    plans?: unknown;
    [key: string]: unknown;
}

/**
 * Lädt die aktuelle Lizenz (GET /api/license/info) und stellt
 * hasModule() bereit – ersetzt requireLicense im Frontend (Sidebar-Sperren).
 */
export function useLicense() {
    const query = useQuery({
        queryKey: ['license-info'],
        queryFn: () => apiGet<LicenseInfo>('license/info'),
        staleTime: 5 * 60 * 1000,
    });

    const modules = query.data?.modules ?? {};

    return {
        license: query.data,
        isLoading: query.isLoading,
        hasModule: (name?: LicenseModule) => (name ? !!modules[name] : true),
    };
}
