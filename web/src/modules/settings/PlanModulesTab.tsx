import * as React from 'react';
import { toast } from 'sonner';
import { Lock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
    MODULE_GROUPS,
    MODULE_LABELS,
    SETTINGS_KEY,
    type SettingsData,
} from './settings-api';
import type { LicenseInfo } from '@/hooks/useLicense';

export function PlanModulesTab({
    settings,
    licInfo,
}: {
    settings: SettingsData;
    licInfo: LicenseInfo;
}) {
    const qc = useQueryClient();
    const l = settings.license || {};
    const activeModules =
        licInfo.modules && Object.keys(licInfo.modules).length > 0
            ? licInfo.modules
            : (l.modules as Record<string, boolean>) || {};

    const [enabled, setEnabled] = React.useState<Record<string, boolean>>(
        settings.enabledModules || {}
    );

    async function toggle(key: string, val: boolean) {
        const next = { ...enabled, [key]: val };
        setEnabled(next);
        const res = await apiPost('settings/modules', { enabledModules: next });
        if (res.success !== false) {
            qc.invalidateQueries({ queryKey: SETTINGS_KEY });
            qc.invalidateQueries({ queryKey: ['license-info'] });
        } else {
            setEnabled(enabled);
            toast.error(res.reason || 'Fehler beim Speichern.');
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h4 className="font-semibold">Plan-Module verwalten</h4>
                <p className="text-sm text-muted-foreground">
                    Zentrale Verwaltung aller CMS-Module. Aktivieren oder deaktivieren Sie
                    verfügbare Features Ihres Plans. Gesperrte Module erfordern einen
                    höheren Plan.
                </p>
            </div>

            {MODULE_GROUPS.map((group) => {
                const keys = Object.keys(MODULE_LABELS).filter(
                    (k) => MODULE_LABELS[k].group === group.name
                );
                if (!keys.length) return null;
                return (
                    <div key={group.name}>
                        <h5 className="mb-3 border-b pb-1.5 text-sm font-semibold">
                            <i className={`fas fa-${group.icon} mr-1.5 text-muted-foreground`} />
                            {group.name}
                        </h5>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
                            {keys.map((key) => {
                                const m = MODULE_LABELS[key];
                                const licKey = m.licenseKey ?? key;
                                const licensed = m.alwaysAvailable || activeModules[licKey] === true;
                                const on = licensed && enabled[key] !== false;
                                return (
                                    <Card
                                        key={key}
                                        className={cn(
                                            'relative flex items-center gap-4 p-4',
                                            !licensed && 'opacity-60'
                                        )}
                                        title={
                                            !licensed
                                                ? 'Nicht in Ihrem Plan enthalten – Upgrade erforderlich'
                                                : undefined
                                        }
                                    >
                                        {!licensed && (
                                            <Lock className="absolute right-2 top-2 size-3.5 text-muted-foreground" />
                                        )}
                                        <div
                                            className={cn(
                                                'flex size-10 shrink-0 items-center justify-center rounded-lg',
                                                on
                                                    ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]'
                                                    : 'bg-muted text-muted-foreground'
                                            )}
                                        >
                                            <i className={`fas fa-${m.icon}`} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold">{m.label}</span>
                                                {licensed && m.settingsPath && (
                                                    <Link
                                                        to={m.settingsPath}
                                                        className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                                                        title="Zu den Einstellungen"
                                                    >
                                                        <ExternalLink className="size-3" />
                                                    </Link>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {m.desc}
                                            </div>
                                        </div>
                                        <Switch
                                            checked={on}
                                            disabled={!licensed}
                                            onCheckedChange={(c) => toggle(key, c)}
                                        />
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
