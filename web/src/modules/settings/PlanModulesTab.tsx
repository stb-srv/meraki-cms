import * as React from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
    const [saving, setSaving] = React.useState(false);

    async function save() {
        setSaving(true);
        const res = await apiPost('settings/modules', { enabledModules: enabled });
        setSaving(false);
        if (res.success !== false) {
            toast.success('Modul-Einstellungen gespeichert!');
            qc.invalidateQueries({ queryKey: SETTINGS_KEY });
        } else toast.error(res.reason || 'Fehler beim Speichern.');
    }

    return (
        <div className="space-y-6">
            <div>
                <h4 className="font-semibold">Plan-Module verwalten</h4>
                <p className="text-sm text-muted-foreground">
                    Zentrale Verwaltung aller CMS-Module. Aktivieren oder deaktivieren Sie
                    verfügbare Features Ihres Plans.
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
                                const licensed = activeModules[key] === true;
                                const on = licensed && enabled[key] === true;
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
                                            <div className="text-sm font-bold">{m.label}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {m.desc}
                                            </div>
                                        </div>
                                        <Switch
                                            checked={on}
                                            disabled={!licensed}
                                            onCheckedChange={(c) =>
                                                setEnabled((s) => ({ ...s, [key]: c }))
                                            }
                                        />
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                    {saving ? 'Speichern…' : 'Speichern'}
                </Button>
            </div>
        </div>
    );
}
