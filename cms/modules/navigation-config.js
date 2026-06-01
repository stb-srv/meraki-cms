/**
 * OPA-CMS Navigation Config – Single Source of Truth
 * Alle Sidebar-Einträge, Breadcrumbs und Suchindexe basieren auf dieser Struktur.
 */

export const NAV_CONFIG = [
    {
        id: 'overview',
        label: 'Dashboard',
        icon: 'fa-th-large',
        items: [
            {
                id: 'dashboard',
                label: 'Dashboard',
                icon: 'fa-th-large',
                view: 'stats',
                tab: null,
                group: 'Dashboard',
                description: 'Statistiken, Umsätze und Tagesüberblick',
                keywords: ['dashboard', 'start', 'startseite', 'übersicht', 'statistik', 'umsatz', 'überblick', 'zahlen', 'heute', 'tagesüberblick', 'home', 'kennzahlen', 'einnahmen']
            }
        ]
    },
    {
        id: 'menu-group',
        label: 'Speisekarte',
        icon: 'fa-utensils',
        headerView: 'menu',
        items: [
            {
                id: 'dishes',
                label: 'Gerichte',
                icon: 'fa-hamburger',
                view: 'menu',
                tab: 'dishes',
                group: 'Speisekarte',
                description: 'Gerichte anlegen, bearbeiten und löschen',
                keywords: ['gerichte', 'gericht', 'speisen', 'speise', 'essen', 'produkt', 'dish', 'pizza', 'burger', 'pasta', 'karte', 'menü', 'menu', 'menue', 'speis', 'artikel', 'hinzufügen', 'neu', 'anlegen', 'bearbeiten', 'löschen', 'entfernen', 'preis', 'bild', 'foto', 'speisenübersicht', 'speisekarte', 'gerichte hinzufügen', 'neues gericht', 'gericht anlegen', 'essen eintragen']
            },
            {
                id: 'categories',
                label: 'Kategorien',
                icon: 'fa-tags',
                view: 'menu',
                tab: 'categories',
                group: 'Speisekarte',
                description: 'Menü-Kategorien verwalten',
                keywords: ['kategorien', 'kategorie', 'gruppen', 'gruppe', 'sortierung', 'reihenfolge', 'ordner', 'vorspeise', 'hauptspeise', 'dessert', 'getränk', 'einteilung', 'strukturieren', 'abschnitt', 'rubrik', 'speisegruppe', 'menügruppe', 'abschnitte']
            },
            {
                id: 'daily',
                label: 'Tagesgerichte',
                icon: 'fa-star',
                view: 'menu',
                tab: 'daily',
                group: 'Speisekarte',
                description: 'Tagesgerichte und Specials verwalten',
                keywords: ['tagesgerichte', 'tageskarte', 'tagesgericht', 'special', 'empfehlung', 'tagesempfehlung', 'highlight', 'featured', 'angebot', 'tagesangebot', 'mittagsmenü', 'mittagskarte', 'tagesmenu', 'heute', 'spezialität', 'stern', 'aktionsgericht']
            },
            {
                id: 'allergens',
                label: 'Allergene',
                icon: 'fa-exclamation-triangle',
                view: 'menu',
                tab: 'allergens',
                group: 'Speisekarte',
                description: 'Allergene und Unverträglichkeiten pflegen',
                keywords: ['allergene', 'allergen', 'allergie', 'allergisch', 'unverträglichkeit', 'unverträglich', 'intoleranzen', 'intoleranz', 'laktose', 'gluten', 'nüsse', 'lmiv', 'lebensmittel', 'kennzeichnung', 'pflichtangabe', 'weizen', 'milch', 'ei', 'fisch', 'sellerie', 'senf', 'soja', 'deklaration', 'inhaltsstoff']
            },
            {
                id: 'additives',
                label: 'Zusatzstoffe',
                icon: 'fa-flask',
                view: 'menu',
                tab: 'additives',
                group: 'Speisekarte',
                description: 'Zusatzstoffe gemäß LMIV verwalten',
                keywords: ['zusatzstoffe', 'zusatzstoff', 'farbstoff', 'konservierungsstoff', 'konservierung', 'lmiv', 'e-nummern', 'enummern', 'zusatz', 'inhaltsstoffe', 'inhaltsstoff', 'deklaration', 'kennzeichnung', 'lebensmittelzusatz', 'zusatzstoffkennzeichnung', 'e120', 'geschmacksverstärker', 'süßungsmittel']
            }
        ]
    },
    {
        id: 'reservations-group',
        label: 'Reservierungen & Tische',
        icon: 'fa-calendar-alt',
        headerView: 'reservations',
        items: [
            {
                id: 'reservations',
                label: 'Reservierungen',
                icon: 'fa-calendar-check',
                view: 'reservations',
                tab: null,
                group: 'Reservierungen & Tische',
                description: 'Reservierungen verwalten und annehmen',
                keywords: ['reservierungen', 'reservierung', 'reservieren', 'resevierung', 'reservirung', 'buchung', 'buchen', 'tisch', 'tischreservierung', 'tisch reservieren', 'gäste', 'gast', 'termin', 'anmeldung', 'anfrage', 'bestätigung', 'annehmen', 'ablehnen', 'stornieren', 'reservierungsübersicht', 'buchungsübersicht']
            },
            {
                id: 'table-planner',
                label: 'Tischplaner',
                icon: 'fa-project-diagram',
                view: 'table-planner',
                tab: null,
                group: 'Reservierungen & Tische',
                description: 'Saalplan und visuelle Tischzuweisung',
                keywords: ['tischplaner', 'saalplan', 'grundriss', 'layout', 'raumplan', 'tischzuweisung', 'planer', 'saal', 'raum', 'zeichnen', 'positionieren', 'anordnung', 'restaurantplan', 'raumplanung', 'tischlayout', 'gastraum', 'sitzplan']
            },
            {
                id: 'tables',
                label: 'Tische einrichten',
                icon: 'fa-chair',
                view: 'tables',
                tab: null,
                group: 'Reservierungen & Tische',
                description: 'Tische und Gastbereiche konfigurieren',
                keywords: ['tische', 'tisch', 'bereiche', 'bereich', 'sitzplätze', 'sitzplatz', 'kapazität', 'tischverwaltung', 'einrichten', 'konfigurieren', 'hinzufügen', 'tischnummer', 'personenanzahl', 'innen', 'außen', 'terrasse', 'stuhl', 'tische anlegen', 'tischnamen', 'tischanzahl']
            },
            {
                id: 'res-settings',
                label: 'Reservierungs-Einstellungen',
                icon: 'fa-sliders-h',
                view: 'settings',
                tab: 'reservations',
                group: 'Reservierungen & Tische',
                description: 'Aufenthaltsdauer, Puffer, Warteliste und Bestätigung',
                keywords: ['reservierungs-einstellungen', 'reservierungseinstellungen', 'einstellungen', 'aufenthaltsdauer', 'puffer', 'warteliste', 'dauer', 'automatisch', 'bestätigung', 'ablaufdauer', 'kapazität', 'regeln', 'konfiguration', 'früheste', 'späteste', 'max gäste', 'sperrzeiten', 'bufferzeit', 'reservierung einstellen']
            },
            {
                id: 'archive',
                label: 'Archiv',
                icon: 'fa-archive',
                view: 'archive',
                tab: null,
                group: 'Reservierungen & Tische',
                description: 'Vergangene Reservierungen einsehen',
                keywords: ['archiv', 'archiviert', 'history', 'historie', 'vergangene', 'abgeschlossen', 'abgelaufen', 'rückblick', 'alte', 'frühere', 'verlauf', 'log', 'reservierungshistorie', 'vergangene buchungen']
            }
        ]
    },
    {
        id: 'orders-group',
        label: 'Online-Bestellungen',
        icon: 'fa-shopping-bag',
        headerView: 'orders',
        htmlId: 'nav-orders-group',
        items: [
            {
                id: 'orders',
                label: 'Live-Monitor',
                icon: 'fa-bell',
                view: 'orders',
                tab: null,
                group: 'Online-Bestellungen',
                description: 'Eingehende Bestellungen in Echtzeit',
                keywords: ['bestellungen', 'bestellung', 'monitor', 'live', 'eingehend', 'küche', 'eingang', 'neu', 'offen', 'aktuell', 'echtzeit', 'bestell-monitor', 'bestellmonitor', 'incoming', 'orders', 'glocke', 'benachrichtigung', 'live-monitor', 'neue bestellungen', 'bestellung anzeigen'],
                htmlId: 'nav-orders'
            },
            {
                id: 'order-settings',
                label: 'Bestellungen einrichten',
                icon: 'fa-sliders-h',
                view: 'order-settings',
                tab: null,
                group: 'Online-Bestellungen',
                description: 'Bestelloptionen, Lieferung, Abholung und Zahlungsarten',
                keywords: ['bestelleinstellungen', 'bestellungen einrichten', 'konfigurieren', 'lieferung', 'abholung', 'pickup', 'delivery', 'zahlung', 'zahlungsart', 'online-bestellung', 'bestellzeiten', 'mindestbestellwert', 'zeitfenster', 'aktivieren', 'deaktivieren', 'liefern', 'abholen', 'takeaway', 'sofort bestellen'],
                htmlId: 'nav-order-settings'
            }
        ]
    },
    {
        id: 'restaurant-group',
        label: 'Mein Restaurant',
        icon: 'fa-store',
        items: [
            {
                id: 'branding',
                label: 'Profil & Branding',
                icon: 'fa-palette',
                view: 'settings',
                tab: 'branding',
                group: 'Mein Restaurant',
                description: 'Restaurantname, Logo, Farben und Favicon',
                keywords: ['profil', 'branding', 'logo', 'design', 'name', 'favicon', 'restaurantname', 'restaurant', 'farbe', 'farben', 'corporate', 'erscheinungsbild', 'style', 'brand', 'farbschema', 'anpassen', 'bezeichnung', 'titel', 'impressum', 'icon', 'aufmachung', 'aussehen', 'restaurantprofil']
            },
            {
                id: 'opening',
                label: 'Öffnungszeiten',
                icon: 'fa-clock',
                view: 'opening',
                tab: null,
                group: 'Mein Restaurant',
                description: 'Öffnungszeiten für alle Wochentage einrichten',
                keywords: ['öffnungszeiten', 'oeffnungszeiten', 'öffnung', 'zeiten', 'uhrzeit', 'wochentage', 'wochentag', 'aufmachen', 'zumachen', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag', 'geschlossen', 'geöffnet', 'stunden', 'mo', 'di', 'mi', 'do', 'fr', 'sa', 'so', 'öffnungszeit eintragen', 'wann offen', 'betriebszeiten']
            },
            {
                id: 'home-editor',
                label: 'Website & Inhalte',
                icon: 'fa-layer-group',
                view: 'home-editor',
                tab: null,
                group: 'Mein Restaurant',
                description: 'Startseite, Texte, Bilder und Gäste-Website bearbeiten',
                keywords: ['website', 'inhalte', 'homepage', 'startseite', 'texte', 'bilder', 'designer', 'gestalten', 'hero', 'banner', 'seite', 'webseite', 'gastseite', 'bearbeiten', 'inhalt', 'willkommen', 'beschreibung', 'intro', 'titelseite', 'webdesign', 'webinhalt', 'gästeseite', 'onlineauftritt']
            },
            {
                id: 'location',
                label: 'Standort & Karte',
                icon: 'fa-map-marker-alt',
                view: 'home-editor',
                tab: 'location',
                group: 'Mein Restaurant',
                description: 'Adresse, Google Maps und Anfahrt hinterlegen',
                keywords: ['standort', 'adresse', 'karte', 'maps', 'google maps', 'google', 'anfahrt', 'lage', 'ort', 'straße', 'plz', 'postleitzahl', 'stadt', 'koordinaten', 'route', 'directions', 'wo', 'finden', 'pin', 'map', 'location', 'adresse eintragen', 'weg zum restaurant']
            },
            {
                id: 'vacation',
                label: 'Urlaub & Schließzeiten',
                icon: 'fa-umbrella-beach',
                view: 'home-editor',
                tab: 'vacation',
                group: 'Mein Restaurant',
                description: 'Betriebsurlaub und temporäre Schließzeiten',
                keywords: ['urlaub', 'ferien', 'betriebsurlaub', 'schließung', 'schließzeiten', 'gesperrt', 'sperre', 'betriebssperre', 'geschlossen', 'betriebsferien', 'pause', 'ruhetag', 'temporär', 'zeitraum', 'ruhepause', 'saisonende', 'weihnachten', 'sommerpause', 'winterpause', 'zu', 'geschlossen melden']
            },
            {
                id: 'holiday',
                label: 'Feiertage & Events',
                icon: 'fa-calendar-star',
                view: 'home-editor',
                tab: 'holiday',
                group: 'Mein Restaurant',
                description: 'Feiertage, Sonderöffnungszeiten und Events ankündigen',
                keywords: ['feiertage', 'feiertag', 'events', 'event', 'ankündigung', 'banner', 'ostern', 'weihnachten', 'silvester', 'sonderöffnung', 'sonderzeiten', 'aktion', 'aktionen', 'ankündigen', 'veranstaltung', 'feier', 'fest', 'saisonal', 'sondertermin', 'ankündigung schalten', 'feiertag eintragen']
            }
        ]
    },
    {
        id: 'settings-group',
        label: 'Verwaltung',
        icon: 'fa-cog',
        sections: [
            {
                label: 'Team',
                items: [
                    {
                        id: 'users',
                        label: 'Mitarbeiter & Zugänge',
                        icon: 'fa-users-cog',
                        view: 'settings',
                        tab: 'users',
                        group: 'Verwaltung',
                        description: 'Benutzerkonten, Rollen und Passwörter verwalten',
                        keywords: ['mitarbeiter', 'nutzer', 'benutzer', 'zugänge', 'zugang', 'rollen', 'rolle', 'passwort', 'kennwort', 'konto', 'konten', 'login', 'anmeldung', 'rechte', 'berechtigung', 'admin', 'user', 'personal', 'kellner', 'servicekraft', 'waiter', 'küche', 'account', 'benutzer anlegen', 'neuer nutzer', 'passwort ändern', 'zugangsdaten']
                    },
                    {
                        id: 'shifts',
                        label: 'Schichtplan',
                        icon: 'fa-calendar-week',
                        view: 'shifts',
                        tab: null,
                        group: 'Verwaltung',
                        description: 'Mitarbeiter-Schichten und Dienstplan planen',
                        keywords: ['schichtplan', 'schichten', 'schicht', 'dienstplan', 'mitarbeiter', 'personal', 'einsatz', 'planung', 'woche', 'arbeitszeiten', 'arbeit', 'besetzung', 'plan', 'dienst', 'früh', 'spät', 'nacht', 'wochentage', 'arbeitszeit', 'schicht eintragen', 'wer arbeitet', 'personalplanung']
                    }
                ]
            },
            {
                label: 'System',
                items: [
                    {
                        id: 'smtp',
                        label: 'E-Mail & SMTP',
                        icon: 'fa-envelope',
                        view: 'settings',
                        tab: 'smtp',
                        group: 'Verwaltung',
                        description: 'E-Mail-Server und Versandeinstellungen',
                        keywords: ['email', 'e-mail', 'smtp', 'mail', 'versand', 'mailserver', 'server', 'absender', 'postfach', 'provider', 'gmail', 'outlook', 'host', 'port', 'ssl', 'tls', 'senden', 'empfangen', 'einrichten', 'e-mail einrichten', 'smtp konfigurieren', 'mailversand']
                    },
                    {
                        id: 'order-emails',
                        label: 'Bestell-E-Mail Vorlagen',
                        icon: 'fa-file-alt',
                        view: 'settings',
                        tab: 'order-emails',
                        group: 'Verwaltung',
                        description: 'E-Mail-Vorlagen für Bestellbestätigungen anpassen',
                        keywords: ['bestell-email', 'bestellemail', 'bestellbestätigung', 'template', 'vorlage', 'vorlagen', 'bestätigung', 'email-text', 'benachrichtigung', 'automatisch', 'kunde', 'bestellung', 'anpassen', 'text', 'inhalt', 'betreff', 'bestell-vorlage', 'bestellmail', 'email bearbeiten']
                    },
                    {
                        id: 'image-ai',
                        label: 'KI-Bildgenerierung',
                        icon: 'fa-robot',
                        view: 'settings',
                        tab: 'image-ai',
                        group: 'Verwaltung',
                        description: 'API-Keys für KI-Bilder: Unsplash, Pexels, Gemini',
                        keywords: ['ki', 'bild', 'bilder', 'ai', 'gemini', 'unsplash', 'pexels', 'bildgenerierung', 'automatisch', 'foto', 'fotos', 'api', 'key', 'api-key', 'künstliche intelligenz', 'generieren', 'gericht-foto', 'speisefoto', 'bild automatisch', 'fotos erstellen', 'bildersuche']
                    },
                    {
                        id: 'license',
                        label: 'Lizenz & Module',
                        icon: 'fa-key',
                        view: 'settings',
                        tab: 'license',
                        group: 'Verwaltung',
                        description: 'Lizenz aktivieren und Plan-Informationen',
                        keywords: ['lizenz', 'lizenzschlüssel', 'aktivierung', 'aktivieren', 'key', 'plan', 'pro', 'starter', 'enterprise', 'upgrade', 'ablauf', 'gültigkeit', 'trial', 'testversion', 'kaufen', 'freischalten', 'module', 'serial', 'lizenz eingeben', 'plan upgraden', 'lizenz prüfen']
                    },
                    {
                        id: 'plan_modules',
                        label: 'Module aktivieren',
                        icon: 'fa-toggle-on',
                        view: 'settings',
                        tab: 'plan_modules',
                        group: 'Verwaltung',
                        description: 'Verfügbare Module des aktuellen Plans ein- und ausschalten',
                        keywords: ['module', 'modul', 'aktivieren', 'deaktivieren', 'freischalten', 'plan-module', 'features', 'funktionen', 'einschalten', 'ausschalten', 'toggle', 'anpassen', 'bestellen', 'reservierungen', 'bestellungen', 'tageskarte', 'backup', 'schichtplan', 'module einschalten', 'funktionen aktivieren']
                    }
                ]
            },
            {
                label: 'Werkzeuge',
                items: [
                    {
                        id: 'qrcodes',
                        label: 'QR-Codes',
                        icon: 'fa-qrcode',
                        view: 'qrcodes',
                        tab: null,
                        group: 'Verwaltung',
                        description: 'QR-Codes für Tische und Speisekarte erstellen',
                        keywords: ['qr', 'qrcode', 'qr-code', 'code', 'tisch-qr', 'scan', 'scannen', 'drucken', 'aufsteller', 'tischaufsteller', 'digital', 'karte', 'bestellen', 'menü aufrufen', 'generieren', 'erstellen', 'qr erstellen', 'qr drucken', 'tisch-code']
                    },
                    {
                        id: 'backup',
                        label: 'Backup & Wiederherstellung',
                        icon: 'fa-database',
                        view: 'backup',
                        tab: null,
                        group: 'Verwaltung',
                        description: 'Datenbank sichern, herunterladen und wiederherstellen',
                        keywords: ['backup', 'backups', 'sicherung', 'datensicherung', 'restore', 'wiederherstellung', 'datenbank', 'export', 'import', 'sichern', 'herunterladen', 'hochladen', 'notfall', 'sicherstellen', 'kopie', 'datei', 'daten sichern', 'backup erstellen', 'wiederherstellen']
                    },
                    {
                        id: 'plugins',
                        label: 'Erweiterungen',
                        icon: 'fa-puzzle-piece',
                        view: 'plugins-manager',
                        tab: null,
                        group: 'Verwaltung',
                        description: 'Plugins und Erweiterungen installieren und verwalten',
                        keywords: ['plugins', 'plugin', 'erweiterungen', 'erweiterung', 'addon', 'add-on', 'modul', 'module', 'installieren', 'zusatz', 'funktionen', 'erweitern', 'app', 'integration', 'plugin installieren', 'erweiterung hinzufügen']
                    },
                    {
                        id: 'kitchen',
                        label: 'Küchen-Display',
                        icon: 'fa-fire-burner',
                        view: null,
                        tab: null,
                        group: 'Verwaltung',
                        description: 'Küchen-Monitor in neuem Fenster öffnen',
                        keywords: ['küchen-display', 'küche', 'display', 'monitor', 'kitchen', 'küchendisplay', 'tablet', 'bildschirm', 'bestellungen anzeigen', 'kochen', 'zubereitung', 'küchenfenster', 'küchen monitor', 'küchenansicht', 'bestellanzeige'],
                        external: 'kitchen.html'
                    }
                ]
            }
        ]
    }
];
