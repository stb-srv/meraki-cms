import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { LicenseInfo } from '@/hooks/useLicense';

export interface SmtpConfig {
    host?: string;
    port?: number;
    user?: string;
    from?: string;
    secure?: boolean;
    pass?: string;
}
export interface ReservationConfig {
    durationSmall: number;
    durationMedium: number;
    durationLarge: number;
    buffer: number;
    allowInquiry: boolean;
}
export interface ImageApiKeys {
    unsplashKey?: string;
    pexelsKey?: string;
    googleAiKey?: string;
    puterToken?: string;
    defaultProvider?: string;
}
export interface EmailTemplate {
    subject?: string;
    body?: string;
}
export interface SettingsData {
    license?: LicenseInfo;
    smtp?: SmtpConfig;
    reservationConfig?: ReservationConfig;
    imageApiKeys?: ImageApiKeys;
    emailTemplates?: Record<string, EmailTemplate>;
    enabledModules?: Record<string, boolean>;
    [key: string]: unknown;
}
export interface BrandingData {
    name?: string;
    slogan?: string;
    phone?: string;
    logo?: string;
    favicon?: string;
    primaryColor?: string;
    accentColor?: string;
    [key: string]: unknown;
}
export interface User {
    user: string;
    name?: string;
    last_name?: string;
    email?: string;
    role: string;
}

export const SETTINGS_KEY = ['settings'] as const;
export const BRANDING_KEY = ['branding'] as const;
export const USERS_KEY = ['users'] as const;
export const LICENSE_INFO_KEY = ['license-info'] as const;

export const useSettings = () =>
    useQuery({ queryKey: SETTINGS_KEY, queryFn: () => apiGet<SettingsData>('settings') });
export const useBranding = () =>
    useQuery({ queryKey: BRANDING_KEY, queryFn: () => apiGet<BrandingData>('branding') });
export const useUsers = () =>
    useQuery({ queryKey: USERS_KEY, queryFn: () => apiGet<User[]>('users') });
export const useLicenseInfo = () =>
    useQuery({ queryKey: LICENSE_INFO_KEY, queryFn: () => apiGet<LicenseInfo>('license/info') });

export interface MailType {
    key: string;
    label: string;
    default_subject: string;
    placeholders: string[];
}

export const MAIL_TYPES: MailType[] = [
    {
        key: 'tpl_confirmation',
        label: 'Reservierungsbestätigung (Eingang)',
        default_subject: 'Reservierungsbestätigung – {{date}}',
        placeholders: ['name', 'date', 'start_time', 'guests', 'restaurantName'],
    },
    {
        key: 'tpl_confirmed',
        label: 'Reservierung bestätigt',
        default_subject: 'BESTÄTIGT: Ihr Tisch am {{date}}',
        placeholders: ['name', 'date', 'start_time', 'restaurantName'],
    },
    {
        key: 'tpl_cancelled',
        label: 'Reservierung storniert',
        default_subject: 'ABSAGE: Ihre Reservierung am {{date}}',
        placeholders: ['name', 'date', 'start_time', 'restaurantName'],
    },
    {
        key: 'tpl_inquiry',
        label: 'Warteliste / Anfrage',
        default_subject: 'Warteliste – Anfrage für {{date}}',
        placeholders: ['name', 'date', 'start_time', 'guests', 'restaurantName'],
    },
    {
        key: 'tpl_credentials',
        label: 'Zugangsdaten (neuer Nutzer)',
        default_subject: 'Ihre Zugangsdaten für das CMS',
        placeholders: ['name', 'username', 'password', 'restaurantName'],
    },
];

export interface ModuleMeta {
    label: string;
    icon: string;
    desc: string;
    group: string;
}

export const MODULE_LABELS: Record<string, ModuleMeta> = {
    menu_edit: { label: 'Speisekarte bearbeiten', icon: 'utensils', desc: 'Gerichte hinzufügen, bearbeiten & löschen', group: 'Speisekarte' },
    orders_kitchen: { label: 'Online-Bestellungen', icon: 'shopping-bag', desc: 'Kunden können online bestellen', group: 'Bestellungen' },
    reservations: { label: 'Online-Reservierung', icon: 'calendar-check', desc: 'Gäste können online reservieren', group: 'Reservierungen' },
    custom_design: { label: 'Design anpassen', icon: 'paint-brush', desc: 'Farben, Logo & Homepage bearbeiten', group: 'Auftritt' },
    analytics: { label: 'Statistiken', icon: 'chart-bar', desc: 'Umsatz- und Bestellstatistiken', group: 'Dashboard' },
    qr_pay: { label: 'QR-Pay am Tisch', icon: 'qrcode', desc: 'Bezahlung per QR-Code am Tisch (Premium)', group: 'Bestellungen' },
    kitchen_display: { label: 'Küchen-Display', icon: 'fire-burner', desc: 'Bestellungen in Echtzeit im Küchen-Monitor anzeigen', group: 'Bestellungen' },
    table_planner: { label: 'Tischplaner', icon: 'project-diagram', desc: 'Visueller Saalplan und Tischzuweisung', group: 'Reservierungen' },
    daily_specials: { label: 'Tagesspecials', icon: 'star', desc: 'Goldene Heute-Badges und Special-Filter', group: 'Speisekarte' },
    menu_translate: { label: 'Menü-Übersetzung', icon: 'language', desc: 'Speisekarte automatisch übersetzen lassen', group: 'Speisekarte' },
    menu_import_export: { label: 'Import / Export', icon: 'file-export', desc: 'Speisekarte als CSV/JSON importieren/exportieren', group: 'Speisekarte' },
    qrcodes: { label: 'QR-Code Generator', icon: 'qrcode', desc: 'QR-Codes für Tische und Speisekarte generieren', group: 'Tools' },
    shifts: { label: 'Schichtplan', icon: 'calendar-week', desc: 'Mitarbeiter-Schichten planen', group: 'Tools' },
    backup: { label: 'Backup & Wiederherstellung', icon: 'database', desc: 'Datenbank sichern und wiederherstellen', group: 'Tools' },
};

export const MODULE_GROUPS = [
    { name: 'Speisekarte', icon: 'utensils' },
    { name: 'Bestellungen', icon: 'shopping-bag' },
    { name: 'Reservierungen', icon: 'calendar-alt' },
    { name: 'Auftritt', icon: 'paint-brush' },
    { name: 'Dashboard', icon: 'chart-pie' },
    { name: 'Tools', icon: 'wrench' },
];

export function isValidImageSrc(val?: string): boolean {
    if (!val || typeof val !== 'string') return false;
    return val.startsWith('data:image') || val.startsWith('http') || val.startsWith('/');
}
