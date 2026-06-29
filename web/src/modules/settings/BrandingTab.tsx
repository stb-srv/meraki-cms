import * as React from 'react';
import { toast } from 'sonner';
import { ImageIcon, Upload, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import { applyBranding } from '@/lib/branding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { BRANDING_KEY, isValidImageSrc, type BrandingData } from './settings-api';

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

export function BrandingTab({ branding }: { branding: BrandingData }) {
    const qc = useQueryClient();
    const [f, setF] = React.useState<BrandingData>(branding);
    const [saving, setSaving] = React.useState(false);
    const logoRef = React.useRef<HTMLInputElement>(null);
    const faviconRef = React.useRef<HTMLInputElement>(null);

    const set = <K extends keyof BrandingData>(k: K, v: BrandingData[K]) =>
        setF((s) => ({ ...s, [k]: v }));

    async function pickImage(file: File | undefined, field: 'logo' | 'favicon') {
        if (!file) return;
        const dataUrl = await readFileAsDataUrl(file);
        set(field, dataUrl);
        toast('Bild ausgewählt – bitte speichern.');
    }

    async function save() {
        setSaving(true);
        const payload: BrandingData = {
            ...branding,
            name: f.name,
            slogan: f.slogan,
            phone: f.phone,
            logo: isValidImageSrc(f.logo) ? f.logo : '',
            favicon: isValidImageSrc(f.favicon) ? f.favicon : '',
            primaryColor: f.primaryColor,
            accentColor: f.accentColor,
        };
        const res = await apiPost('branding', payload);
        setSaving(false);
        if (res.success !== false) {
            toast.success('Branding aktualisiert!');
            // White-Labeling sofort anwenden (ohne Reload/Rebuild)
            applyBranding({ primaryColor: f.primaryColor, accentColor: f.accentColor });
            if (f.name) document.title = f.name + ' CMS';
            qc.invalidateQueries({ queryKey: BRANDING_KEY });
        } else {
            toast.error(res.reason || 'Fehler beim Speichern.');
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                        <Label>Restaurant Name</Label>
                        <Input
                            value={f.name || ''}
                            onChange={(e) => set('name', e.target.value)}
                            placeholder="z.B. Mein Restaurant"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Slogan</Label>
                        <Input
                            value={f.slogan || ''}
                            onChange={(e) => set('slogan', e.target.value)}
                            placeholder="z.B. Mediterrane Küche"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Telefon (Gästeansicht)</Label>
                        <Input
                            value={f.phone || ''}
                            onChange={(e) => set('phone', e.target.value)}
                            placeholder="0123 / 456789"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* White-Labeling: Marken-Farben */}
            <Card>
                <CardContent className="pt-6">
                    <h4 className="mb-1 font-semibold">Marken-Farben (White-Label)</h4>
                    <p className="mb-4 text-sm text-muted-foreground">
                        Wirkt sofort im gesamten CMS und auf der Gäste-Website – ohne Neuladen.
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <ColorField
                            label="Primärfarbe"
                            value={f.primaryColor || '#1b3a5c'}
                            onChange={(v) => set('primaryColor', v)}
                        />
                        <ColorField
                            label="Akzentfarbe"
                            value={f.accentColor || '#c8a96e'}
                            onChange={(v) => set('accentColor', v)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Logo & Favicon */}
            <Card>
                <CardContent className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-2">
                    <ImageField
                        label="Haupt-Logo"
                        src={f.logo}
                        previewClass="h-16 w-auto max-w-[160px]"
                        onUpload={() => logoRef.current?.click()}
                        onRemove={() => set('logo', '')}
                    />
                    <input
                        ref={logoRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => pickImage(e.target.files?.[0], 'logo')}
                    />
                    <ImageField
                        label="Favicon (Browser-Tab)"
                        src={f.favicon}
                        previewClass="h-8 w-8"
                        onUpload={() => faviconRef.current?.click()}
                        onRemove={() => set('favicon', '')}
                    />
                    <input
                        ref={faviconRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => pickImage(e.target.files?.[0], 'favicon')}
                    />
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                        Logos werden im Gäste-Web und im CMS-Header angezeigt.
                    </p>
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

function ColorField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="space-y-1">
            <Label>{label}</Label>
            <div className="flex items-center gap-3">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent"
                />
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-32 font-mono"
                />
                <div
                    className="h-9 flex-1 rounded-md border"
                    style={{ background: value }}
                    aria-hidden
                />
            </div>
        </div>
    );
}

function ImageField({
    label,
    src,
    previewClass,
    onUpload,
    onRemove,
}: {
    label: string;
    src?: string;
    previewClass: string;
    onUpload: () => void;
    onRemove: () => void;
}) {
    const valid = isValidImageSrc(src);
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex flex-wrap items-center gap-3">
                {valid ? (
                    <img
                        src={src}
                        alt={label}
                        className={`${previewClass} rounded-md border bg-muted object-contain`}
                    />
                ) : (
                    <div
                        className={`${previewClass} flex items-center justify-center rounded-md border border-dashed bg-muted text-xs text-muted-foreground`}
                    >
                        <ImageIcon className="size-4 opacity-40" />
                    </div>
                )}
                <Button variant="outline" size="sm" onClick={onUpload}>
                    <Upload /> Hochladen
                </Button>
                {valid && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive"
                        onClick={onRemove}
                    >
                        <X />
                    </Button>
                )}
            </div>
        </div>
    );
}
