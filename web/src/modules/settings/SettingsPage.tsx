import { useNavigate } from 'react-router-dom';
import { ArrowRight, MailOpen } from 'lucide-react';
import { useViewTitle } from '@/hooks/useViewTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    useBranding,
    useLicenseInfo,
    useSettings,
    useUsers,
} from './settings-api';
import { BrandingTab } from './BrandingTab';
import { UsersTab } from './UsersTab';
import { SmtpTab } from './SmtpTab';
import { LicenseTab } from './LicenseTab';
import { PlanModulesTab } from './PlanModulesTab';
import { ReservationsTab } from './ReservationsTab';
import { ImageAiTab } from './ImageAiTab';

type Tab =
    | 'branding'
    | 'users'
    | 'smtp'
    | 'license'
    | 'plan_modules'
    | 'reservations'
    | 'image-ai'
    | 'order-emails';

const TITLES: Record<Tab, string> = {
    branding: 'Profil & Branding',
    users: 'Mitarbeiter & Zugänge',
    smtp: 'E-Mail & SMTP',
    license: 'Lizenz & Module',
    plan_modules: 'Module aktivieren',
    reservations: 'Reservierungs-Einstellungen',
    'image-ai': 'KI-Bildgenerierung',
    'order-emails': 'Bestell-E-Mail Vorlagen',
};

function Skeleton() {
    return (
        <div className="space-y-4">
            <Card className="h-24 animate-pulse bg-muted/50" />
            <Card className="h-72 animate-pulse bg-muted/50" />
        </div>
    );
}

function SettingsPage({ tab }: { tab: Tab }) {
    useViewTitle(TITLES[tab]);
    const navigate = useNavigate();

    const settingsQ = useSettings();
    const brandingQ = useBranding();
    const usersQ = useUsers();
    const licInfoQ = useLicenseInfo();

    if (tab === 'order-emails') {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                    <MailOpen className="size-10 text-secondary" />
                    <div>
                        <h3 className="font-semibold">E-Mail Templates (Bestellungen)</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Die Bestellungs-E-Mail-Templates findest du unter
                            Bestellungen → Bestelleinstellungen.
                        </p>
                    </div>
                    <Button onClick={() => navigate('/order-settings')}>
                        <ArrowRight /> Zu den Bestelleinstellungen
                    </Button>
                </CardContent>
            </Card>
        );
    }

    switch (tab) {
        case 'branding':
            return brandingQ.data ? <BrandingTab branding={brandingQ.data} /> : <Skeleton />;
        case 'users':
            return usersQ.data ? <UsersTab users={usersQ.data} /> : <Skeleton />;
        case 'smtp':
            return settingsQ.data ? <SmtpTab settings={settingsQ.data} /> : <Skeleton />;
        case 'reservations':
            return settingsQ.data ? <ReservationsTab settings={settingsQ.data} /> : <Skeleton />;
        case 'image-ai':
            return settingsQ.data ? <ImageAiTab settings={settingsQ.data} /> : <Skeleton />;
        case 'license':
            return settingsQ.data && licInfoQ.data ? (
                <LicenseTab settings={settingsQ.data} licInfo={licInfoQ.data} />
            ) : (
                <Skeleton />
            );
        case 'plan_modules':
            return settingsQ.data && licInfoQ.data ? (
                <PlanModulesTab settings={settingsQ.data} licInfo={licInfoQ.data} />
            ) : (
                <Skeleton />
            );
        default:
            return <Skeleton />;
    }
}

export const SettingsBrandingPage = () => <SettingsPage tab="branding" />;
export const SettingsUsersPage = () => <SettingsPage tab="users" />;
export const SettingsSmtpPage = () => <SettingsPage tab="smtp" />;
export const SettingsLicensePage = () => <SettingsPage tab="license" />;
export const SettingsPlanModulesPage = () => <SettingsPage tab="plan_modules" />;
export const SettingsReservationsPage = () => <SettingsPage tab="reservations" />;
export const SettingsImageAiPage = () => <SettingsPage tab="image-ai" />;
export const SettingsOrderEmailsPage = () => <SettingsPage tab="order-emails" />;
