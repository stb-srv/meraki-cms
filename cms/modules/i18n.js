/**
 * i18n-Grundgerüst für die CMS-Oberfläche (Phase 6).
 *
 * Nutzung:
 *   - Im HTML:  <span data-i18n="nav.dashboard">Dashboard</span>
 *               <input data-i18n-ph="common.search">
 *   - Im JS:    import { t } from './i18n.js'; el.textContent = t('nav.dashboard');
 *
 * Deutsch ist die Basissprache (Fallback). Weitere Sprachen ergänzen die Keys.
 * Modul-interne Strings können schrittweise über dieselben Keys migriert werden.
 */

const DICT = {
    de: {
        'common.search': 'Suchen... (Strg+K)',
        'common.logout': 'Logout',
        'common.welcome': 'Willkommen',
        'nav.dashboard': 'Dashboard',
        'nav.menu': 'Speisekarte',
        'nav.dishes': 'Gerichte',
        'nav.categories': 'Kategorien',
        'nav.daily': 'Tagesgerichte',
        'nav.declaration': 'Deklaration',
        'nav.allergens': 'Allergene',
        'nav.additives': 'Zusatzstoffe',
        'nav.reservations_tables': 'Reservierungen & Tische',
        'nav.reservations': 'Reservierungen',
        'nav.table_planner': 'Tischplaner',
        'nav.tables_setup': 'Tische einrichten',
        'nav.reservation_settings': 'Reservierungs-Einstellungen',
        'nav.archive': 'Archiv',
        'nav.online_orders': 'Online-Bestellungen',
        'nav.live_monitor': 'Live-Monitor',
        'nav.kassenbuch': 'Kassenbuch & Tagesabschluss',
        'nav.order_settings': 'Bestellungen einrichten',
        'nav.my_restaurant': 'Mein Restaurant',
        'nav.branding': 'Profil & Branding',
        'nav.opening_hours': 'Öffnungszeiten',
        'nav.website': 'Website & Inhalte',
        'nav.location': 'Standort & Karte',
        'nav.vacation': 'Urlaub & Schließzeiten',
        'nav.holiday': 'Feiertage & Events',
        'nav.feedback': 'Gäste-Bewertungen',
        'nav.management': 'Verwaltung',
        'nav.team': 'Team',
        'nav.staff': 'Mitarbeiter & Zugänge',
        'nav.shifts': 'Schichtplan',
        'nav.system': 'System',
        'nav.smtp': 'E-Mail & SMTP',
        'nav.order_emails': 'Bestell-E-Mail Vorlagen',
        'nav.image_ai': 'KI-Bildgenerierung',
        'nav.license': 'Lizenz & Module',
        'nav.plan_modules': 'Module aktivieren',
        'nav.audit_log': 'Änderungsprotokoll',
        'nav.tools': 'Werkzeuge',
        'nav.qrcodes': 'QR-Codes',
        'nav.backup': 'Backup & Wiederherstellung',
        'nav.plugins': 'Erweiterungen',
        'nav.kitchen_display': 'Küchen-Display'
    },
    en: {
        'common.search': 'Search... (Ctrl+K)',
        'common.logout': 'Logout',
        'common.welcome': 'Welcome',
        'nav.dashboard': 'Dashboard',
        'nav.menu': 'Menu',
        'nav.dishes': 'Dishes',
        'nav.categories': 'Categories',
        'nav.daily': 'Daily specials',
        'nav.declaration': 'Declaration',
        'nav.allergens': 'Allergens',
        'nav.additives': 'Additives',
        'nav.reservations_tables': 'Reservations & Tables',
        'nav.reservations': 'Reservations',
        'nav.table_planner': 'Table planner',
        'nav.tables_setup': 'Set up tables',
        'nav.reservation_settings': 'Reservation settings',
        'nav.archive': 'Archive',
        'nav.online_orders': 'Online orders',
        'nav.live_monitor': 'Live monitor',
        'nav.kassenbuch': 'Cash book & daily close',
        'nav.order_settings': 'Order settings',
        'nav.my_restaurant': 'My restaurant',
        'nav.branding': 'Profile & branding',
        'nav.opening_hours': 'Opening hours',
        'nav.website': 'Website & content',
        'nav.location': 'Location & map',
        'nav.vacation': 'Holidays & closures',
        'nav.holiday': 'Holidays & events',
        'nav.feedback': 'Guest reviews',
        'nav.management': 'Administration',
        'nav.team': 'Team',
        'nav.staff': 'Staff & access',
        'nav.shifts': 'Shift planner',
        'nav.system': 'System',
        'nav.smtp': 'Email & SMTP',
        'nav.order_emails': 'Order email templates',
        'nav.image_ai': 'AI image generation',
        'nav.license': 'License & modules',
        'nav.plan_modules': 'Activate modules',
        'nav.audit_log': 'Audit log',
        'nav.tools': 'Tools',
        'nav.qrcodes': 'QR codes',
        'nav.backup': 'Backup & restore',
        'nav.plugins': 'Extensions',
        'nav.kitchen_display': 'Kitchen display'
    }
};

export const AVAILABLE_LANGS = [
    { code: 'de', label: 'Deutsch' },
    { code: 'en', label: 'English' }
];

let currentLang = 'de';
try { currentLang = localStorage.getItem('meraki_cms_lang') || 'de'; } catch (e) {}
if (!DICT[currentLang]) currentLang = 'de';

export function getLang() { return currentLang; }

export function t(key, fallback) {
    return (DICT[currentLang] && DICT[currentLang][key]) || (DICT.de && DICT.de[key]) || fallback || key;
}

export function applyTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
        const v = t(el.getAttribute('data-i18n'), el.textContent);
        if (v) el.textContent = v;
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => {
        el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'), el.getAttribute('placeholder') || ''));
    });
    document.documentElement.setAttribute('lang', currentLang);
}

export function setLang(lang) {
    currentLang = DICT[lang] ? lang : 'de';
    try { localStorage.setItem('meraki_cms_lang', currentLang); } catch (e) {}
    applyTranslations();
}
