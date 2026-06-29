import * as React from 'react';
import { toast } from 'sonner';
import { CloudUpload, Download, Upload } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, getAuthToken } from '@/lib/api';
import { useViewTitle } from '@/hooks/useViewTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';

interface BackupInfo {
    counts?: Record<string, number>;
    dbType?: string;
}
const COUNT_LABELS: Record<string, string> = {
    menu: 'Gerichte',
    categories: 'Kategorien',
    reservations: 'Reservierungen',
    tables: 'Tische',
    orders: 'Bestellungen',
    users: 'Benutzer',
};

export function BackupPage() {
    useViewTitle('Backup & Wiederherstellung');
    const { data: info } = useQuery({
        queryKey: ['backup-info'],
        queryFn: async () => (await apiGet<BackupInfo>('backup/info')) || {},
    });

    const [file, setFile] = React.useState<File | null>(null);
    const [log, setLog] = React.useState<string[]>([]);
    const [importing, setImporting] = React.useState(false);
    const fileRef = React.useRef<HTMLInputElement>(null);
    const addLog = (m: string) => setLog((l) => [...l, m]);

    // Cloud
    const [s3, setS3] = React.useState({
        s3_endpoint: '',
        s3_bucket: '',
        s3_access_key: '',
        s3_secret_key: '',
        s3_auto: false,
        s3_time: '03:00',
    });

    async function exportBackup() {
        try {
            const r = await fetch('/api/backup/export', {
                headers: { 'x-admin-token': getAuthToken() || '' },
            });
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `meraki-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Backup heruntergeladen!');
        } catch {
            toast.error('Backup fehlgeschlagen.');
        }
    }

    async function importBackup() {
        if (!file) return;
        if (
            !window.confirm(
                'Dies überschreibt ALLE bestehenden Daten dieser Instanz unwiderruflich. Fortfahren?'
            )
        )
            return;
        setImporting(true);
        setLog(['🔄 Starte Restore…']);
        try {
            const data = JSON.parse(await file.text());
            const r = await fetch('/api/backup/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': getAuthToken() || '',
                },
                body: JSON.stringify(data),
            });
            const result = await r.json();
            if (result.success) {
                const restored = result.results?.restored || {};
                addLog('✅ Restore abgeschlossen!');
                for (const [k, v] of Object.entries(restored)) addLog(`   ${k}: ${v}`);
                toast.success('Backup eingespielt!');
            } else {
                addLog('❌ Fehler: ' + (result.reason || result.message));
                toast.error('Restore fehlgeschlagen.');
            }
        } catch (e) {
            addLog('❌ ' + (e as Error).message);
            toast.error('Restore fehlgeschlagen.');
        }
        setImporting(false);
    }

    async function saveCloud() {
        const res = await apiPost('settings/backup-cloud', s3);
        if (res.success !== false) toast.success('Cloud-Einstellungen gespeichert.');
        else toast.error(res.reason || 'Fehler');
    }
    async function runCloud() {
        const res = await apiPost<{ success?: boolean; filename?: string; message?: string }>(
            'backup/cloud',
            {}
        );
        if (res.success) toast.success(`Backup erfolgreich: ${res.filename || 'backup'}`);
        else toast.error(res.message || 'Backup fehlgeschlagen.');
    }

    return (
        <div className="mx-auto max-w-3xl space-y-5">
            <div>
                <h3 className="font-semibold">Globales Backup & Restore</h3>
                <p className="text-sm text-muted-foreground">
                    Alle Daten dieser Instanz als JSON exportieren oder ein Backup einspielen.
                </p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Aktuelle Instanz
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-3">
                        {Object.entries(info?.counts || {}).map(([k, v]) => (
                            <div key={k} className="rounded-xl bg-muted/50 p-3 text-center">
                                <div className="text-2xl font-black text-primary">{v}</div>
                                <div className="text-xs opacity-60">{COUNT_LABELS[k] || k}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 text-xs opacity-40">
                        Datenbank-Typ: {info?.dbType?.toUpperCase() || 'SQLITE'}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5">
                <CardContent className="space-y-3 pt-6">
                    <div className="font-bold">Backup erstellen</div>
                    <p className="text-sm text-muted-foreground">
                        Exportiert alle Daten als JSON (ohne Benutzer-Passwörter).
                    </p>
                    <Button onClick={exportBackup} className="w-full">
                        <Download /> Backup jetzt herunterladen
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="space-y-3 pt-6">
                    <div className="font-bold">Backup einspielen</div>
                    <p className="text-sm text-muted-foreground">
                        ⚠️ Überschreibt alle bestehenden Daten unwiderruflich.
                    </p>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".json"
                        hidden
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="w-full rounded-xl border-2 border-dashed border-destructive/30 p-8 text-center text-sm text-muted-foreground hover:bg-destructive/5"
                    >
                        <Upload className="mx-auto mb-2 size-6 opacity-40" />
                        {file
                            ? `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
                            : 'JSON-Backup auswählen'}
                    </button>
                    <Button
                        variant="destructive"
                        className="w-full"
                        disabled={!file || importing}
                        onClick={importBackup}
                    >
                        <Upload /> {importing ? 'Spiele ein…' : 'Backup jetzt einspielen'}
                    </Button>
                    {log.length > 0 && (
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-black/80 p-4 font-mono text-xs text-white">
                            {log.join('\n')}
                        </pre>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div>
                        <h3 className="flex items-center gap-2 font-semibold">
                            <CloudUpload className="size-4 text-primary" /> Cloud-Backup (S3 /
                            Hetzner)
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Automatisches tägliches Backup in S3-kompatiblen Speicher.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="S3 Endpoint">
                            <Input
                                value={s3.s3_endpoint}
                                onChange={(e) => setS3((s) => ({ ...s, s3_endpoint: e.target.value }))}
                                placeholder="fsn1.your-objectstorage.com"
                            />
                        </Field>
                        <Field label="Bucket-Name">
                            <Input
                                value={s3.s3_bucket}
                                onChange={(e) => setS3((s) => ({ ...s, s3_bucket: e.target.value }))}
                                placeholder="meraki-backups"
                            />
                        </Field>
                        <Field label="Access Key">
                            <Input
                                value={s3.s3_access_key}
                                onChange={(e) =>
                                    setS3((s) => ({ ...s, s3_access_key: e.target.value }))
                                }
                            />
                        </Field>
                        <Field label="Secret Key">
                            <Input
                                type="password"
                                value={s3.s3_secret_key}
                                onChange={(e) =>
                                    setS3((s) => ({ ...s, s3_secret_key: e.target.value }))
                                }
                            />
                        </Field>
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={s3.s3_auto}
                            onCheckedChange={(c) => setS3((s) => ({ ...s, s3_auto: c }))}
                        />
                        <span className="text-sm">Auto-Backup täglich um</span>
                        <Input
                            type="time"
                            value={s3.s3_time}
                            onChange={(e) => setS3((s) => ({ ...s, s3_time: e.target.value }))}
                            className="w-28"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={saveCloud}>Einstellungen speichern</Button>
                        <Button variant="outline" onClick={runCloud}>
                            <CloudUpload /> Jetzt sichern
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <Label>{label}</Label>
            {children}
        </div>
    );
}
