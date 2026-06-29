import * as React from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { SETTINGS_KEY, type ReservationConfig, type SettingsData } from './settings-api';

const DEFAULTS: ReservationConfig = {
    durationSmall: 90,
    durationMedium: 120,
    durationLarge: 150,
    buffer: 15,
    allowInquiry: true,
};

export function ReservationsTab({ settings }: { settings: SettingsData }) {
    const qc = useQueryClient();
    const [f, setF] = React.useState<ReservationConfig>(settings.reservationConfig || DEFAULTS);
    const [saving, setSaving] = React.useState(false);

    const set = <K extends keyof ReservationConfig>(k: K, v: ReservationConfig[K]) =>
        setF((s) => ({ ...s, [k]: v }));

    async function save() {
        setSaving(true);
        const res = await apiPost('settings', { reservationConfig: f });
        setSaving(false);
        if (res.success !== false) {
            toast.success('Reservierungs-Konfiguration gespeichert!');
            qc.invalidateQueries({ queryKey: SETTINGS_KEY });
        } else toast.error(res.reason || 'Fehler beim Speichern.');
    }

    const num = (k: keyof ReservationConfig, label: string) => (
        <div className="space-y-1">
            <Label>{label}</Label>
            <Input
                type="number"
                value={f[k] as number}
                onChange={(e) => set(k, parseInt(e.target.value) || 0)}
            />
        </div>
    );

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h4 className="font-semibold">Aufenthaltsdauer (Minuten)</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {num('durationSmall', 'Bis 2 Personen')}
                        {num('durationMedium', 'Bis 4 Personen')}
                        {num('durationLarge', 'Ab 5 Personen')}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h4 className="font-semibold">Sicherheits-Puffer</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {num('buffer', 'Puffer zw. Belegung (Min)')}
                        <div className="flex items-center gap-3 pt-7">
                            <Switch
                                checked={f.allowInquiry}
                                onCheckedChange={(c) => set('allowInquiry', c)}
                            />
                            <span className="text-sm">Warteliste/Anfrage erlauben (wenn voll)</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                    {saving ? 'Speichern…' : 'Einstellungen speichern'}
                </Button>
            </div>
        </div>
    );
}
