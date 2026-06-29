import * as React from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Send, TriangleAlert } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
    MAIL_TYPES,
    SETTINGS_KEY,
    type EmailTemplate,
    type SettingsData,
    type SmtpConfig,
} from './settings-api';

export function SmtpTab({ settings }: { settings: SettingsData }) {
    const qc = useQueryClient();
    const smtp = settings.smtp || {};
    const isConfigured = !!smtp.host;

    const [f, setF] = React.useState<SmtpConfig>({
        host: smtp.host || '',
        port: smtp.port || 465,
        user: smtp.user || '',
        from: smtp.from || smtp.user || '',
        secure: smtp.secure !== false,
    });
    const [pass, setPass] = React.useState('');
    const [templates, setTemplates] = React.useState<Record<string, EmailTemplate>>(
        settings.emailTemplates || {}
    );
    const [testEmail, setTestEmail] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [testing, setTesting] = React.useState(false);
    const bodyRefs = React.useRef<Record<string, HTMLTextAreaElement | null>>({});

    const set = <K extends keyof SmtpConfig>(k: K, v: SmtpConfig[K]) =>
        setF((s) => ({ ...s, [k]: v }));

    function setTpl(key: string, field: 'subject' | 'body', value: string) {
        setTemplates((t) => ({ ...t, [key]: { ...t[key], [field]: value } }));
    }

    function insertPlaceholder(key: string, ph: string) {
        const ta = bodyRefs.current[key];
        const token = `{{${ph}}}`;
        const cur = templates[key]?.body || '';
        if (ta && document.activeElement === ta) {
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const next = cur.slice(0, start) + token + cur.slice(end);
            setTpl(key, 'body', next);
            requestAnimationFrame(() => {
                ta.focus();
                ta.selectionStart = ta.selectionEnd = start + token.length;
            });
        } else {
            setTpl(key, 'body', cur + token);
        }
    }

    async function save() {
        if (!f.host?.trim()) {
            toast.error('Bitte einen SMTP-Host eingeben.');
            return;
        }
        setSaving(true);
        const smtpData: SmtpConfig = {
            host: f.host.trim(),
            port: f.port || 465,
            user: f.user?.trim(),
            from: f.from?.trim(),
            secure: f.secure,
        };
        if (pass) smtpData.pass = pass;
        else if (smtp.pass) smtpData.pass = smtp.pass;

        // Leere Templates weglassen
        const cleaned: Record<string, EmailTemplate> = {};
        for (const [k, t] of Object.entries(templates)) {
            if (t?.subject?.trim() || t?.body?.trim())
                cleaned[k] = { subject: t.subject?.trim(), body: t.body?.trim() };
        }
        const res = await apiPost('settings', { smtp: smtpData, emailTemplates: cleaned });
        setSaving(false);
        if (res.success !== false) {
            toast.success('Einstellungen gespeichert! ✉️');
            setPass('');
            qc.invalidateQueries({ queryKey: SETTINGS_KEY });
        } else toast.error(res.reason || 'Fehler beim Speichern.');
    }

    async function sendTest() {
        if (!testEmail.trim()) {
            toast.error('Bitte eine Ziel-E-Mail-Adresse eingeben.');
            return;
        }
        setTesting(true);
        const res = await apiPost('settings/test-smtp', { email: testEmail.trim() });
        setTesting(false);
        if (res.success !== false) toast.success('Test-Mail gesendet! ✅');
        else toast.error(res.reason || 'Test-Mail fehlgeschlagen.');
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <div className="mb-4 flex items-center gap-2 text-sm">
                        {isConfigured ? (
                            <span className="flex items-center gap-1.5 text-[hsl(var(--success))]">
                                <CheckCircle2 className="size-4" /> Konfiguriert – Host:{' '}
                                <strong>{smtp.host}</strong>
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-[hsl(var(--warning))]">
                                <TriangleAlert className="size-4" /> Noch nicht konfiguriert –
                                E-Mail-Versand deaktiviert
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="SMTP Host">
                            <Input
                                value={f.host || ''}
                                onChange={(e) => set('host', e.target.value)}
                                placeholder="z.B. smtp.strato.de"
                            />
                        </Field>
                        <Field label="Port">
                            <Input
                                type="number"
                                value={f.port ?? 465}
                                onChange={(e) => set('port', parseInt(e.target.value) || 465)}
                            />
                        </Field>
                        <Field label="Benutzername / E-Mail">
                            <Input
                                value={f.user || ''}
                                onChange={(e) => set('user', e.target.value)}
                                placeholder="noreply@example.com"
                            />
                        </Field>
                        <Field label="Passwort">
                            <Input
                                type="password"
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                placeholder={
                                    isConfigured ? '(unverändert lassen = bestehendes)' : 'Passwort'
                                }
                            />
                        </Field>
                        <Field label="Absender-Adresse (From)">
                            <Input
                                type="email"
                                value={f.from || ''}
                                onChange={(e) => set('from', e.target.value)}
                                placeholder="noreply@example.com"
                            />
                        </Field>
                        <div className="flex items-center gap-3 pt-7">
                            <Switch
                                checked={f.secure !== false}
                                onCheckedChange={(c) => set('secure', c)}
                            />
                            <span className="text-sm">SSL/TLS aktivieren (empfohlen für Port 465)</span>
                        </div>
                    </div>

                    <div className="mt-6 border-t pt-5">
                        <h4 className="mb-3 font-semibold">Test-E-Mail senden</h4>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <Input
                                type="email"
                                className="min-w-56 flex-1"
                                placeholder="test@example.com"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                            />
                            <Button variant="outline" onClick={sendTest} disabled={testing}>
                                <Send /> {testing ? 'Sende…' : 'Testmail senden'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div>
                <h3 className="mb-1 text-lg font-semibold">E-Mail Templates</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                    Betreff und Inhalt der automatischen E-Mails anpassen. Klicke auf die
                    Platzhalter-Chips, um sie einzufügen.
                </p>
                <div className="space-y-4">
                    {MAIL_TYPES.map((type) => {
                        const tpl = templates[type.key] || {};
                        return (
                            <Card key={type.key}>
                                <CardContent className="space-y-3 pt-6">
                                    <h4 className="font-semibold text-primary">{type.label}</h4>
                                    <Field label="Betreff">
                                        <Input
                                            value={tpl.subject || ''}
                                            placeholder={type.default_subject}
                                            onChange={(e) =>
                                                setTpl(type.key, 'subject', e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Field label="E-Mail Text (HTML erlaubt)">
                                        <Textarea
                                            ref={(el) => {
                                                bodyRefs.current[type.key] = el;
                                            }}
                                            rows={6}
                                            className="min-h-28"
                                            value={tpl.body || ''}
                                            onChange={(e) =>
                                                setTpl(type.key, 'body', e.target.value)
                                            }
                                        />
                                    </Field>
                                    <div>
                                        <span className="mb-1.5 block text-xs text-muted-foreground">
                                            Verfügbare Platzhalter:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {type.placeholders.map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => insertPlaceholder(type.key, p)}
                                                    className="rounded-full border bg-muted px-2 py-0.5 text-xs hover:bg-accent"
                                                >
                                                    {`{{${p}}}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                    {saving ? 'Speichern…' : 'Einstellungen speichern'}
                </Button>
            </div>
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
