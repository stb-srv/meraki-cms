/**
 * OPA-CMS Navigation Config – Single Source of Truth
 * Alle Sidebar-Einträge, Breadcrumbs und Suchindexe basieren auf dieser Struktur.
 */

export const NAV_CONFIG = [
    {
        id: 'overview',
        label: 'Übersicht',
        icon: 'fa-th-large',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-th-large', view: 'stats', tab: null, description: 'Statistiken, Umsätze und Tagesüberblick', keywords: ['dashboard', 'statistik', 'umsatz', 'überblick', 'start'] }
        ]
    },
    {
        id: 'menu-group',
        label: 'Speisekarte',
        icon: 'fa-utensils',
        headerView: 'menu',
        items: [
            { id: 'dishes',    label: 'Gerichte verwalten',       icon: 'fa-hamburger',            view: 'menu', tab: 'dishes',     description: 'Gerichte anlegen, bearbeiten und löschen',           keywords: ['gerichte', 'speisen', 'essen', 'produkte', 'dish'] },
            { id: 'categories', label: 'Kategorien',              icon: 'fa-tags',                 view: 'menu', tab: 'categories', description: 'Menü-Kategorien verwalten',                          keywords: ['kategorien', 'gruppen', 'sortierung'] },
            { id: 'daily',     label: 'Tageskarte',               icon: 'fa-star',                 view: 'menu', tab: 'daily',      description: 'Tagesgerichte und Specials verwalten',               keywords: ['tageskarte', 'tagesgericht', 'special', 'empfehlung'] },
            { id: 'allergens', label: 'Allergene & Intoleranzen', icon: 'fa-exclamation-triangle', view: 'menu', tab: 'allergens',  description: 'Allergene und Unverträglichkeiten pflegen',          keywords: ['allergen', 'allergie', 'unverträglichkeit', 'laktose', 'gluten'] },
            { id: 'additives', label: 'Zusatzstoffe',             icon: 'fa-flask',                view: 'menu', tab: 'additives',  description: 'Zusatzstoffe gemäß LMIV verwalten',                 keywords: ['zusatzstoffe', 'farbstoff', 'konservierung', 'lmiv'] }
        ]
    },
    {
        id: 'appearance',
        label: 'Auftritt',
        icon: 'fa-paint-brush',
        items: [
            { id: 'home-editor',  label: 'Website & Inhalte',       icon: 'fa-layer-group',    view: 'home-editor', tab: null,       description: 'Startseite, Texte und Bilder bearbeiten',         keywords: ['website', 'design', 'homepage', 'inhalte', 'designer', 'hero'] },
            { id: 'location',     label: 'Standort & Google Maps',  icon: 'fa-map-marker-alt', view: 'home-editor', tab: 'location', description: 'Adresse und Google Maps Karteneinstellungen',     keywords: ['standort', 'karte', 'maps', 'adresse', 'google', 'anfahrt'] },
            { id: 'vacation',     label: 'Urlaub & Betriebssperre', icon: 'fa-umbrella-beach', view: 'home-editor', tab: 'vacation', description: 'Betriebsurlaub und Sperrzeiten verwalten',        keywords: ['urlaub', 'ferien', 'sperre', 'geschlossen', 'betriebsferien'] },
            { id: 'holiday',      label: 'Feiertage & Events',      icon: 'fa-calendar-star',  view: 'home-editor', tab: 'holiday',  description: 'Feiertage und besondere Events ankündigen',       keywords: ['feiertage', 'events', 'ankündigung', 'banner', 'ostern'] }
        ]
    },
    {
        id: 'reservations-group',
        label: 'Reservierungen',
        icon: 'fa-calendar-alt',
        headerView: 'reservations',
        items: [
            { id: 'reservations',   label: 'Reservierungen',     icon: 'fa-calendar-check',  view: 'reservations',  tab: null, description: 'Alle Reservierungen verwalten',            keywords: ['reservierung', 'buchung', 'gäste', 'tischreservierung'] },
            { id: 'table-planner',  label: 'Tischplaner',        icon: 'fa-project-diagram', view: 'table-planner', tab: null, description: 'Visuelle Tischzuweisung und Saalplan',     keywords: ['tischplaner', 'saalplan', 'layout', 'zuweisung'] },
            { id: 'tables',         label: 'Tische & Bereiche',  icon: 'fa-chair',           view: 'tables',        tab: null, description: 'Tische und Gastbereiche konfigurieren',    keywords: ['tische', 'bereiche', 'sitzplätze', 'kapazität', 'tischverwaltung'] },
            { id: 'archive',        label: 'Reservierungs-Archiv', icon: 'fa-archive',       view: 'archive',       tab: null, description: 'Vergangene Reservierungen einsehen',       keywords: ['archiv', 'historie', 'vergangene', 'abgeschlossen'] }
        ]
    },
    {
        id: 'orders-group',
        label: 'Online-Bestellungen',
        icon: 'fa-shopping-bag',
        headerView: 'orders',
        htmlId: 'nav-orders-group',
        items: [
            { id: 'orders',         label: 'Bestellungs-Monitor',        icon: 'fa-bell',      view: 'orders',         tab: null, description: 'Live-Monitor für eingehende Bestellungen',  keywords: ['bestellungen', 'monitor', 'live', 'küche', 'eingang'], htmlId: 'nav-orders' },
            { id: 'order-settings', label: 'Bestellungen konfigurieren', icon: 'fa-sliders-h', view: 'order-settings', tab: null, description: 'Bestell-Optionen und Zahlungsarten',        keywords: ['bestelleinstellungen', 'konfiguration', 'zahlung', 'lieferung'], htmlId: 'nav-order-settings' }
        ]
    },
    {
        id: 'settings-group',
        label: 'Einstellungen',
        icon: 'fa-cog',
        sections: [
            {
                label: 'Restaurant',
                items: [
                    { id: 'branding',     label: 'Logo & Branding',               icon: 'fa-palette',        view: 'settings', tab: 'branding',      description: 'Name, Logo und Favicon verwalten',              keywords: ['logo', 'branding', 'design', 'name', 'favicon', 'restaurant-info'] },
                    { id: 'opening',      label: 'Öffnungszeiten',                icon: 'fa-clock',          view: 'opening',  tab: null,            description: 'Öffnungszeiten für alle Wochentage',            keywords: ['öffnungszeiten', 'zeiten', 'wochentage', 'uhrzeit'] },
                    { id: 'res-settings', label: 'Reservierungs-Einstellungen',   icon: 'fa-calendar-check', view: 'settings', tab: 'reservations',  description: 'Aufenthaltsdauer, Puffer und Warteliste',       keywords: ['reservierung', 'einstellungen', 'dauer', 'puffer', 'warteliste'] }
                ]
            },
            {
                label: 'System & Technik',
                items: [
                    { id: 'users',        label: 'Nutzer & Zugänge',             icon: 'fa-users-cog',  view: 'settings', tab: 'users',        description: 'Benutzerkonten und Rollen verwalten',          keywords: ['nutzer', 'benutzer', 'zugänge', 'rollen', 'passwort'] },
                    { id: 'smtp',         label: 'E-Mail & SMTP',               icon: 'fa-envelope',   view: 'settings', tab: 'smtp',         description: 'SMTP-Server und E-Mail-Templates',             keywords: ['email', 'smtp', 'mail', 'versand', 'templates'] },
                    { id: 'order-emails', label: 'Bestell-E-Mail Templates',     icon: 'fa-file-alt',   view: 'settings', tab: 'order-emails', description: 'E-Mail-Vorlagen für Bestellbestätigungen',     keywords: ['bestell-email', 'bestellbestätigung', 'template', 'vorlage'] },
                    { id: 'image-ai',     label: 'KI-Bildgenerierung',           icon: 'fa-robot',      view: 'settings', tab: 'image-ai',     description: 'API-Keys für Unsplash, Pexels oder Gemini',    keywords: ['ki', 'bild', 'ai', 'gemini', 'unsplash', 'pexels', 'bildgenerierung'] },
                    { id: 'license',      label: 'Lizenz & Module',              icon: 'fa-key',          view: 'settings', tab: 'license',      description: 'Lizenz aktivieren und Module verwalten',       keywords: ['lizenz', 'module', 'plan', 'key', 'aktivierung'] },
                    { id: 'plan_modules', label: 'Plan-Module',                  icon: 'fa-puzzle-piece', view: 'settings', tab: 'plan_modules', description: 'Verfügbare Module des aktuellen Plans aktivieren', keywords: ['module', 'plan', 'features', 'aktivieren', 'freischalten', 'plan-module'] }
                ]
            },
            {
                label: 'Tools',
                items: [
                    { id: 'qrcodes',         label: 'QR-Codes generieren',          icon: 'fa-qrcode',        view: 'qrcodes',         tab: null, description: 'QR-Codes für Tische und Speisekarte',        keywords: ['qr', 'qrcode', 'tisch-qr', 'code'] },
                    { id: 'shifts',          label: 'Schichtplan',                  icon: 'fa-calendar-week', view: 'shifts',          tab: null, description: 'Mitarbeiter-Schichten planen',               keywords: ['schicht', 'schichtplan', 'mitarbeiter', 'dienstplan'] },
                    { id: 'backup',          label: 'Backup & Wiederherstellung',   icon: 'fa-database',      view: 'backup',          tab: null, description: 'Datenbank sichern und wiederherstellen',     keywords: ['backup', 'sicherung', 'restore', 'wiederherstellung'] },
                    { id: 'plugins',         label: 'Erweiterungen',                icon: 'fa-puzzle-piece',  view: 'plugins-manager', tab: null, description: 'Plugins und Erweiterungen verwalten',        keywords: ['plugins', 'erweiterungen', 'addon', 'modul'] },
                    { id: 'kitchen',         label: 'Küchen-Display ↗',             icon: 'fa-fire-burner',   view: null,              tab: null, description: 'Küchen-Monitor in neuem Fenster öffnen',     keywords: ['küche', 'display', 'monitor', 'kitchen'], external: 'kitchen.html' }
                ]
            }
        ]
    }
];
